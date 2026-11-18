const modelo = require('../modelos/evaluaciones_modelo');
const reglas = require('../reglas');

function leerTipo(req) {
  const tipo = parseInt(req.params.tipo, 10);
  if (tipo === reglas.TIPO_TECNICA || tipo === reglas.TIPO_SALUD) {
    return tipo;
  }
  return null;
}

async function oficioDeLasPreguntas(tipo, id_usuario) {
  if (tipo === reglas.TIPO_SALUD) {
    return null;
  }
  const usuario = await modelo.obtenerOficioUsuario(id_usuario);
  return usuario ? usuario.id_oficio : undefined;
}

function horasQueFaltan(evaluacion) {
  if (evaluacion.intentos_acumulados < reglas.MAX_INTENTOS) {
    return 0;
  }
  if (!evaluacion.fecha_ultimo_intento) {
    return 0;
  }
  const desbloqueo =
    new Date(evaluacion.fecha_ultimo_intento).getTime() +
    reglas.HORAS_BLOQUEO * 60 * 60 * 1000;
  const faltan = (desbloqueo - Date.now()) / (60 * 60 * 1000);
  return faltan > 0 ? faltan : 0;
}
