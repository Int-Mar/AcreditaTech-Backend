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

async function iniciar(req, res) {
  const tipo = leerTipo(req);
  if (!tipo) {
    return res.status(400).json({ mensaje: 'Tipo de test inválido (usa 1 o 2)' });
  }

  try {
    const id_usuario = req.usuario.id_usuario;

    const id_oficio = await oficioDeLasPreguntas(tipo, id_usuario);
    if (id_oficio === undefined) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    const total = await modelo.contarPreguntas(tipo, id_oficio);
    if (total === 0) {
      return res.status(404).json({ mensaje: 'Todavía no hay preguntas para este test' });
    }

    let evaluacion = await modelo.buscarEvaluacion(id_usuario, tipo);
    if (!evaluacion) {
      evaluacion = await modelo.crearEvaluacion(id_usuario, tipo);
    }

    const horas = horasQueFaltan(evaluacion);
    if (horas > 0) {
      return res.status(403).json({
        mensaje: 'Llegaste al máximo de intentos. Podrás intentarlo de nuevo más tarde.',
        horas_restantes: Math.ceil(horas),
      });
    }

    if (evaluacion.intentos_acumulados >= reglas.MAX_INTENTOS) {
      await modelo.reiniciarIntentos(evaluacion.id_evaluacion);
    }

    if (!evaluacion.en_curso) {
      evaluacion = await modelo.empezarIntento(evaluacion.id_evaluacion);
    }

    res.json({
      mensaje: 'Test iniciado',
      caso_actual: evaluacion.caso_actual,
      total_casos: Math.min(total, 10),
    });

  } catch (error) {
    console.error('Error al iniciar el test:', error.message);
    res.status(500).json({ mensaje: 'Error al iniciar el test' });
  }
}

async function verPregunta(req, res) {
  const tipo = leerTipo(req);
  if (!tipo) {
    return res.status(400).json({ mensaje: 'Tipo de test inválido (usa 1 o 2)' });
  }

  try {
    const id_usuario = req.usuario.id_usuario;

    const evaluacion = await modelo.buscarEvaluacion(id_usuario, tipo);
    if (!evaluacion || !evaluacion.en_curso) {
      return res.status(400).json({ mensaje: 'Primero debes iniciar el test' });
    }

    const id_oficio = await oficioDeLasPreguntas(tipo, id_usuario);
    const total = Math.min(await modelo.contarPreguntas(tipo, id_oficio), 10);

    const pregunta = await modelo.obtenerPreguntaPorPosicion(
      tipo,
      id_oficio,
      evaluacion.caso_actual
    );
    if (!pregunta) {
      return res.status(404).json({ mensaje: 'No se encontró la pregunta' });
    }

    const opciones = await modelo.obtenerOpciones(pregunta.id_pregunta);

    res.json({
      caso: evaluacion.caso_actual,
      total_casos: total,
      pregunta: {
        id_pregunta: pregunta.id_pregunta,
        tema: pregunta.tema,
        texto: pregunta.texto,
        opciones,
      },
    });

  } catch (error) {
    console.error('Error al ver la pregunta:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener la pregunta' });
  }
}
