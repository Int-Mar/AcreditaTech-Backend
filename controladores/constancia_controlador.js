const crypto = require("crypto");
const PDFDocument = require("pdfkit");

const modelo = require("../modelos/constancia_modelo");
const avanceModelo = require("../modelos/avance_modelo");
const reglas = require("../reglas");
const { dibujarConstancia } = require("../utilidades/constancia_pdf");

const ESTADOS_APROBADOS = ["Aprobado", "Apto"];
const ESTATUS_VENCIDA = "Vencida";

function generarCodigo() {
  return "ACR-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function firmar(texto) {
  return crypto
    .createHmac("sha256", process.env.CLAVE_FIRMA)
    .update(texto)
    .digest("hex");
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function estaVigente(fecha_vencimiento) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(fecha_vencimiento) >= hoy;
}

function buscarEvaluacion(evaluaciones, tipo) {
  return evaluaciones.find((e) => e.tipo_evaluacion === tipo);
}

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

async function descargarPdf(req, res) {
  try {
    const id_usuario = req.usuario.id_usuario;

    const trabajador = await modelo.obtenerDatosTrabajador(id_usuario);
    if (!trabajador) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const evaluaciones = await modelo.obtenerEvaluacionesConId(id_usuario);
    const tecnica = buscarEvaluacion(evaluaciones, reglas.TIPO_TECNICA);
    const completo = completoLasPruebas(evaluaciones);

    if (!completo) {
      return res.status(403).json({
        mensaje:
          "Debes aprobar las dos evaluaciones para obtener tu Pre-Constancia",
      });
    }

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

async function renovar(req, res) {
  try {
    const id_usuario = req.usuario.id_usuario;

    const constancia = await modelo.buscarConstanciaDeUsuario(id_usuario);
    if (!constancia) {
      return res
        .status(404)
        .json({ mensaje: "No tienes una Pre-Constancia para renovar" });
    }

    if (estaVigente(constancia.fecha_vencimiento)) {
      return res
        .status(409)
        .json({ mensaje: "Tu Pre-Constancia sigue vigente" });
    }

    await modelo.reiniciarParaRenovar(id_usuario);

    res.json({
      mensaje:
        "Tus evaluaciones se reiniciaron. Vuelve a presentarlas para renovar tu Pre-Constancia",
    });
  } catch (error) {
    console.error("Error al renovar la Pre-Constancia:", error.message);
    res.status(500).json({ mensaje: "Error al renovar la Pre-Constancia" });
  }
}

module.exports = { verMiConstancia, descargarPdf, renovar };
