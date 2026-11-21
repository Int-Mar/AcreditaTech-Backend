const modelo = require("../modelos/avance_modelo");
const reglas = require("../reglas");

const ESTADOS_APROBADOS = ["Aprobado", "Apto"];

const ESTATUS_EN_PROCESO = "En Diagnóstico";
const ESTATUS_COMPLETADO = "Preparación Completada";
const ESTATUS_VENCIDA = "Vencida";

function buscarEvaluacion(evaluaciones, tipo) {
  return evaluaciones.find((e) => e.tipo_evaluacion === tipo);
}

function resumirPrueba(evaluacion) {
  if (!evaluacion) {
    return {
      calificacion: 0,
      estado: "Pendiente",
      aprobada: false,
      intentos: 0,
    };
  }
  return {
    calificacion: Number(evaluacion.calificacion),
    estado: evaluacion.estado_aprobacion,
    aprobada: ESTADOS_APROBADOS.includes(evaluacion.estado_aprobacion),
    intentos: evaluacion.intentos_acumulados || 0,
  };
}

async function verAvance(req, res) {
  try {
    const id_usuario = req.usuario.id_usuario;

    const usuario = await modelo.obtenerEstatus(id_usuario);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const evaluaciones = await modelo.obtenerEvaluaciones(id_usuario);
    const tecnica = resumirPrueba(
      buscarEvaluacion(evaluaciones, reglas.TIPO_TECNICA),
    );
    const salud = resumirPrueba(
      buscarEvaluacion(evaluaciones, reglas.TIPO_SALUD),
    );

    const porcentaje = (tecnica.aprobada ? 50 : 0) + (salud.aprobada ? 50 : 0);

    let estatus = usuario.estatus;
    if (estatus !== ESTATUS_VENCIDA) {
      estatus = porcentaje === 100 ? ESTATUS_COMPLETADO : ESTATUS_EN_PROCESO;
      if (estatus !== usuario.estatus) {
        await modelo.actualizarEstatus(id_usuario, estatus);
      }
    }

    res.json({
      porcentaje,
      estatus,
      tecnica,
      salud: {
        estado: salud.estado,
        aprobada: salud.aprobada,
        intentos: salud.intentos,
      },
    });
  } catch (error) {
    console.error("Error al ver avance:", error.message);
    res.status(500).json({ mensaje: "Error al obtener el avance" });
  }
}

module.exports = { verAvance };
