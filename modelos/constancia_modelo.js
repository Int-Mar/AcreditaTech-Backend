const conexion = require("../conexion");

async function obtenerDatosTrabajador(id_usuario) {
  const resultado = await conexion.query(
    `SELECT u.id_usuario, u.nombre, u.curp, u.estatus,
            o.nombre_oficio, a.nombre_alcaldia
     FROM musuario u
     JOIN coficio   o ON o.id_oficio   = u.id_oficio
     JOIN calcaldia a ON a.id_alcaldia = u.id_alcaldia
     WHERE u.id_usuario = $1`,
    [id_usuario],
  );
  return resultado.rows[0];
}

async function obtenerEvaluacionesConId(id_usuario) {
  const resultado = await conexion.query(
    `SELECT id_evaluacion, tipo_evaluacion, estado_aprobacion
     FROM eevaluacion
     WHERE id_usuario = $1
     ORDER BY id_evaluacion DESC`,
    [id_usuario],
  );
  return resultado.rows;
}

async function buscarConstanciaDeUsuario(id_usuario) {
  const resultado = await conexion.query(
    `SELECT id_constancia, codigo, fecha_emision, fecha_vencimiento, firma_digital
     FROM mpre_constancia
     WHERE id_usuario = $1
     ORDER BY id_constancia DESC
     LIMIT 1`,
    [id_usuario],
  );
  return resultado.rows[0];
}

async function crearConstancia(datos) {
  const resultado = await conexion.query(
    `INSERT INTO mpre_constancia
       (id_evaluacion, id_usuario, codigo, folio_unico,
        fecha_emision, fecha_vencimiento, firma_digital, url_archivo_pdf)
     VALUES
       ($1, $2, $3, $3,
        CURRENT_DATE, (CURRENT_DATE + ($4 * INTERVAL '1 month'))::date, $5, $6)
     RETURNING id_constancia, codigo, fecha_emision, fecha_vencimiento, firma_digital`,
    [
      datos.id_evaluacion,
      datos.id_usuario,
      datos.codigo,
      datos.meses_vigencia,
      datos.firma,
      datos.url_archivo_pdf,
    ],
  );
  return resultado.rows[0];
}

async function reiniciarParaRenovar(id_usuario) {
  const cliente = await conexion.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("DELETE FROM mpre_constancia WHERE id_usuario = $1", [
      id_usuario,
    ]);
    await cliente.query(
      `DELETE FROM erespuesta
       WHERE id_evaluacion IN (
         SELECT id_evaluacion FROM eevaluacion WHERE id_usuario = $1)`,
      [id_usuario],
    );
    await cliente.query(
      `UPDATE eevaluacion
       SET calificacion = 0,
           estado_aprobacion = 'Pendiente',
           intentos_acumulados = 0,
           fecha_ultimo_intento = NULL,
           en_curso = false,
           caso_actual = 1
       WHERE id_usuario = $1`,
      [id_usuario],
    );
    await cliente.query(
      "UPDATE musuario SET estatus = 'En Diagnóstico' WHERE id_usuario = $1",
      [id_usuario],
    );
    await cliente.query("COMMIT");
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

module.exports = {
  obtenerDatosTrabajador,
  obtenerEvaluacionesConId,
  buscarConstanciaDeUsuario,
  crearConstancia,
  reiniciarParaRenovar,
};
