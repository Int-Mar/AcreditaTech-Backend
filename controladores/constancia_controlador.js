// constancia_controlador.js
// Pre-Constancia del trabajador.
// La Pre-Constancia es informativa: no sustituye una certificación oficial.

const modelo = require("../modelos/constancia_modelo");
const reglas = require("../reglas");

const ESTADOS_APROBADOS = ["Aprobado", "Apto"];

// ── Funciones de apoyo ─────────────────────────────────────────────────────

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

module.exports = { verMiConstancia };
