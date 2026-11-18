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

async function empezarIntento(id_evaluacion) {
  await conexion.query(
    'DELETE FROM erespuesta WHERE id_evaluacion = $1',
    [id_evaluacion]
  );
  const resultado = await conexion.query(
    `UPDATE eevaluacion
     SET en_curso = true, caso_actual = 1
     WHERE id_evaluacion = $1
     RETURNING *`,
    [id_evaluacion]
  );
  return resultado.rows[0];
}

async function contarPreguntas(tipo, id_oficio) {
  const resultado = await conexion.query(
    `SELECT COUNT(*)::int AS total
     FROM cpregunta
     WHERE id_tipo_evaluacion = $1
       AND (id_oficio = $2 OR ($2::int IS NULL AND id_oficio IS NULL))`,
    [tipo, id_oficio]
  );
  return resultado.rows[0].total;
}

async function obtenerPreguntaPorPosicion(tipo, id_oficio, posicion) {
  const resultado = await conexion.query(
    `SELECT id_pregunta, tema, texto
     FROM cpregunta
     WHERE id_tipo_evaluacion = $1
       AND (id_oficio = $2 OR ($2::int IS NULL AND id_oficio IS NULL))
     ORDER BY id_pregunta
     OFFSET $3 LIMIT 1`,
    [tipo, id_oficio, posicion - 1]
  );
  return resultado.rows[0];
}

async function obtenerOpciones(id_pregunta) {
  const resultado = await conexion.query(
    `SELECT id_opcion, texto
     FROM copcion
     WHERE id_pregunta = $1
     ORDER BY id_opcion`,
    [id_pregunta]
  );
  return resultado.rows;
}

async function obtenerOpcion(id_opcion) {
  const resultado = await conexion.query(
    'SELECT id_opcion, id_pregunta, puntos FROM copcion WHERE id_opcion = $1',
    [id_opcion]
  );
  return resultado.rows[0];
}

async function registrarRespuesta(id_evaluacion, id_pregunta, id_opcion, puntos, caso) {
  const cliente = await conexion.connect();
  try {
    await cliente.query('BEGIN');

    const avance = await cliente.query(
      `UPDATE eevaluacion
       SET caso_actual = caso_actual + 1
       WHERE id_evaluacion = $1 AND caso_actual = $2`,
      [id_evaluacion, caso]
    );
    if (avance.rowCount === 0) {
      await cliente.query('ROLLBACK');
      return false;
    }

    await cliente.query(
      `INSERT INTO erespuesta (id_evaluacion, id_pregunta, id_opcion, puntos)
       VALUES ($1, $2, $3, $4)`,
      [id_evaluacion, id_pregunta, id_opcion, puntos]
    );

    await cliente.query('COMMIT');
    return true;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
