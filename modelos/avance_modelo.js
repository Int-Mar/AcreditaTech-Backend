const conexion = require("../conexion");

async function obtenerEvaluaciones(id_usuario) {
  const resultado = await conexion.query(
    `SELECT tipo_evaluacion, calificacion, estado_aprobacion,
            intentos_acumulados, fecha_ultimo_intento
     FROM eevaluacion
     WHERE id_usuario = $1
     ORDER BY id_evaluacion DESC`,
    [id_usuario],
  );
  return resultado.rows;
}

async function obtenerEstatus(id_usuario) {
  const resultado = await conexion.query(
    "SELECT estatus FROM musuario WHERE id_usuario = $1",
    [id_usuario],
  );
  return resultado.rows[0];
}

async function obtenerVencimientoConstancia(id_usuario) {
  const resultado = await conexion.query(
    `SELECT fecha_vencimiento
     FROM mpre_constancia
     WHERE id_usuario = $1
     ORDER BY id_constancia DESC
     LIMIT 1`,
    [id_usuario],
  );
  return resultado.rows[0];
}

async function actualizarEstatus(id_usuario, estatus) {
  await conexion.query(
    "UPDATE musuario SET estatus = $2 WHERE id_usuario = $1",
    [id_usuario, estatus],
  );
}

module.exports = { obtenerEvaluaciones, obtenerEstatus, actualizarEstatus };
