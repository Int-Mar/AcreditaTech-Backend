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

async function responder(req, res) {
  const tipo = leerTipo(req);
  if (!tipo) {
    return res.status(400).json({ mensaje: 'Tipo de test inválido (usa 1 o 2)' });
  }

  const id_pregunta = parseInt(req.body.id_pregunta, 10);
  const id_opcion = parseInt(req.body.id_opcion, 10);
  if (!id_pregunta || !id_opcion) {
    return res.status(400).json({ mensaje: 'Faltan id_pregunta e id_opcion' });
  }

  try {
    const id_usuario = req.usuario.id_usuario;

    const evaluacion = await modelo.buscarEvaluacion(id_usuario, tipo);
    if (!evaluacion || !evaluacion.en_curso) {
      return res.status(400).json({ mensaje: 'Primero debes iniciar el test' });
    }

    const id_oficio = await oficioDeLasPreguntas(tipo, id_usuario);
    const total = Math.min(await modelo.contarPreguntas(tipo, id_oficio), 10);

    const actual = await modelo.obtenerPreguntaPorPosicion(
      tipo,
      id_oficio,
      evaluacion.caso_actual
    );
    if (!actual || actual.id_pregunta !== id_pregunta) {
      return res.status(400).json({ mensaje: 'Esa no es la pregunta actual' });
    }

    const opcion = await modelo.obtenerOpcion(id_opcion);
    if (!opcion || opcion.id_pregunta !== id_pregunta) {
      return res.status(400).json({ mensaje: 'La opción no pertenece a esa pregunta' });
    }

    const guardada = await modelo.registrarRespuesta(
      evaluacion.id_evaluacion,
      id_pregunta,
      id_opcion,
      opcion.puntos,
      evaluacion.caso_actual
    );
    if (!guardada) {
      return res.status(409).json({ mensaje: 'Esta pregunta ya fue contestada' });
    }

    if (evaluacion.caso_actual < total) {
      return res.json({
        finalizado: false,
        siguiente_caso: evaluacion.caso_actual + 1,
        total_casos: total,
      });
    }

    const calificacion = await modelo.sumarPuntos(evaluacion.id_evaluacion);
    const aprobado = calificacion > reglas.PUNTAJE_MINIMO;
    const estado = aprobado ? 'Aprobado' : 'No aprobado';
    await modelo.cerrarEvaluacion(evaluacion.id_evaluacion, calificacion, estado, aprobado);

    res.json({
      finalizado: true,
      calificacion,
      aprobado,
      estado,
    });

  } catch (error) {
    console.error('Error al responder:', error.message);
    res.status(500).json({ mensaje: 'Error al guardar la respuesta' });
  }
}

async function verEstado(req, res) {
  const tipo = leerTipo(req);
  if (!tipo) {
    return res.status(400).json({ mensaje: 'Tipo de test inválido (usa 1 o 2)' });
  }

  try {
    const evaluacion = await modelo.buscarEvaluacion(req.usuario.id_usuario, tipo);

    if (!evaluacion) {
      return res.json({
        calificacion: 0,
        estado: 'Pendiente',
        intentos_usados: 0,
        max_intentos: reglas.MAX_INTENTOS,
        bloqueado: false,
        bloqueado_hasta: null,
      });
    }

    const horas = horasQueFaltan(evaluacion);
    const bloqueado = horas > 0;

    const reiniciaran =
      evaluacion.intentos_acumulados >= reglas.MAX_INTENTOS && !bloqueado;

    res.json({
      calificacion: Number(evaluacion.calificacion),
      estado: evaluacion.estado_aprobacion,
      intentos_usados: reiniciaran ? 0 : evaluacion.intentos_acumulados,
      max_intentos: reglas.MAX_INTENTOS,
      bloqueado,
      bloqueado_hasta: bloqueado
        ? new Date(
            new Date(evaluacion.fecha_ultimo_intento).getTime() +
              reglas.HORAS_BLOQUEO * 60 * 60 * 1000
          ).toISOString()
        : null,
    });

  } catch (error) {
    console.error('Error al ver el estado:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener el estado' });
  }
}

module.exports = { iniciar, verPregunta, responder, verEstado };
