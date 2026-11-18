const conexion = require('../conexion');

async function obtenerOficioUsuario(id_usuario) {
  const resultado = await conexion.query(
    'SELECT id_oficio FROM musuario WHERE id_usuario = $1',
    [id_usuario]
  );
  return resultado.rows[0];
}

async function buscarEvaluacion(id_usuario, tipo) {
  const resultado = await conexion.query(
    'SELECT * FROM eevaluacion WHERE id_usuario = $1 AND tipo_evaluacion = $2',
    [id_usuario, tipo]
  );
  return resultado.rows[0];
}

async function crearEvaluacion(id_usuario, tipo) {
  const resultado = await conexion.query(
    `INSERT INTO eevaluacion (id_usuario, tipo_evaluacion)
     VALUES ($1, $2)
     RETURNING *`,
    [id_usuario, tipo]
  );
  return resultado.rows[0];
}
