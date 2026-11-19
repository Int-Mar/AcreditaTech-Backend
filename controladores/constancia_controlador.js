// constancia_controlador.js
// Pre-Constancia: consulta su estado y descarga el PDF.
// La Pre-Constancia es informativa: no sustituye una certificación oficial.

const crypto = require("crypto");
const PDFDocument = require("pdfkit");

const modelo = require("../modelos/constancia_modelo");
const avanceModelo = require("../modelos/avance_modelo");
const reglas = require("../reglas");
const { dibujarConstancia } = require("../utilidades/constancia_pdf");

const ESTADOS_APROBADOS = ["Aprobado", "Apto"];
const ESTATUS_VENCIDA = "Vencida";

// ── Funciones de apoyo ─────────────────────────────────────────────────────

// Código único de la constancia, por ejemplo ACR-1A2B3C4D
function generarCodigo() {
  return "ACR-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

// Firma digital sencilla (HMAC) con la clave secreta del servidor
function firmar(texto) {
  return crypto
    .createHmac("sha256", process.env.CLAVE_FIRMA)
    .update(texto)
    .digest("hex");
}

// Convierte la fecha de la base a texto legible: 13/11/2026
function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// La vigencia se calcula al consultar: vigente si hoy no pasó del vencimiento
function estaVigente(fecha_vencimiento) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(fecha_vencimiento) >= hoy;
}

// Busca la evaluación más reciente de un tipo
function buscarEvaluacion(evaluaciones, tipo) {
  return evaluaciones.find((e) => e.tipo_evaluacion === tipo);
}

// Regla: solo se puede obtener la Pre-Constancia con las dos pruebas aprobadas
function completoLasPruebas(evaluaciones) {
  const tecnica = buscarEvaluacion(evaluaciones, reglas.TIPO_TECNICA);
  const salud = buscarEvaluacion(evaluaciones, reglas.TIPO_SALUD);
  return Boolean(
    tecnica &&
    salud &&
    ESTADOS_APROBADOS.includes(tecnica.estado_aprobacion) &&
    ESTADOS_APROBADOS.includes(salud.estado_aprobacion),
  );
}

// ── Descargar PDF ──────────────────────────────────────────────────────────
// GET /api/constancia/pdf  (requiere sesión)
async function descargarPdf(req, res) {
  try {
    const id_usuario = req.usuario.id_usuario;

    const trabajador = await modelo.obtenerDatosTrabajador(id_usuario);
    if (!trabajador) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Regla: solo si aprobó las dos pruebas (Preparación Completada)
    const evaluaciones = await modelo.obtenerEvaluacionesConId(id_usuario);
    const tecnica = buscarEvaluacion(evaluaciones, reglas.TIPO_TECNICA);
    const completo = completoLasPruebas(evaluaciones);

    if (!completo) {
      return res.status(403).json({
        mensaje:
          "Debes aprobar las dos evaluaciones para obtener tu Pre-Constancia",
      });
    }

    // Si ya tiene constancia se reutiliza; si no, se crea una nueva
    let constancia = await modelo.buscarConstanciaDeUsuario(id_usuario);

    if (constancia && !estaVigente(constancia.fecha_vencimiento)) {
      await avanceModelo.actualizarEstatus(id_usuario, ESTATUS_VENCIDA);
      return res.status(403).json({
        mensaje: "Tu Pre-Constancia está vencida",
      });
    }

    if (!constancia) {
      const codigo = generarCodigo();
      const fecha = new Date().toISOString().slice(0, 10);
      constancia = await modelo.crearConstancia({
        id_evaluacion: tecnica.id_evaluacion,
        id_usuario,
        codigo,
        meses_vigencia: reglas.MESES_VIGENCIA,
        firma: firmar(`${codigo}|${id_usuario}|${fecha}`),
        url_archivo_pdf: "/api/constancia/pdf",
      });
    }

    // ── Armar el PDF (el diseño está en utilidades/constancia_pdf.js) ──
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pre-constancia-${constancia.codigo}.pdf"`,
    );
    doc.pipe(res);

    dibujarConstancia(doc, {
      trabajador,
      constancia,
      meses: reglas.MESES_VIGENCIA,
      emision: formatearFecha(constancia.fecha_emision),
      vencimiento: formatearFecha(constancia.fecha_vencimiento),
    });

    doc.end();
  } catch (error) {
    console.error("Error al generar la Pre-Constancia:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ mensaje: "Error al generar la Pre-Constancia" });
    }
  }
}

// ── Ver mi constancia ──────────────────────────────────────────────────────
// GET /api/constancia  (requiere sesión)
// Dice si el usuario ya tiene Pre-Constancia, si está vigente y si puede generarla.
// No descarga el PDF: sirve para que la pantalla muestre el botón correcto.
async function verMiConstancia(req, res) {
  try {
    const id_usuario = req.usuario.id_usuario;

    const constancia = await modelo.buscarConstanciaDeUsuario(id_usuario);

    if (constancia) {
      return res.json({
        tiene_constancia: true,
        puede_generar: false,
        codigo: constancia.codigo,
        emitida: constancia.fecha_emision,
        vigente_hasta: constancia.fecha_vencimiento,
        estado: estaVigente(constancia.fecha_vencimiento)
          ? "Vigente"
          : "Vencida",
      });
    }

    // Todavía no tiene: puede generarla si aprobó las dos pruebas
    const evaluaciones = await modelo.obtenerEvaluacionesConId(id_usuario);
    res.json({
      tiene_constancia: false,
      puede_generar: completoLasPruebas(evaluaciones),
    });
  } catch (error) {
    console.error("Error al ver la constancia:", error.message);
    res.status(500).json({ mensaje: "Error al obtener la Pre-Constancia" });
  }
}

module.exports = { verMiConstancia, descargarPdf };
