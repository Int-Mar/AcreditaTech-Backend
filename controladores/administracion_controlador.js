const modelo = require('../modelos/administracion_modelo');
const { esNombre, esTexto, esCorreoGmail } = require('../seguridad/validaciones');

function obtenerEstatus(req, res) {
  res.json(modelo.ESTATUS);
}

async function obtenerPadron(req, res) {
  const { tipo } = req.params;
  if (!['proceso', 'preconstancia'].includes(tipo)) {
    return res.status(400).json({ mensaje: 'Tipo de padrón no válido' });
  }
  try {
    const trabajadores = await modelo.obtenerPadron(tipo, {
      alcaldia: req.query.alcaldia,
      oficio: req.query.oficio,
      estatus: req.query.estatus,
    });
    res.json({ trabajadores });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el padrón' });
  }
}

async function cambiarEstatus(req, res) {
  const { correo: correoCrudo, estatus } = req.body;
  const correo = esTexto(correoCrudo) ? correoCrudo.trim().toLowerCase() : '';
  
  if (!esCorreoGmail(correo)) {
    return res.status(400).json({ mensaje: 'Correo: debe terminar en @gmail.com (máximo 50)' });
  }

  if (!modelo.ESTATUS.todos.includes(estatus)) {
    return res.status(400).json({ mensaje: 'Estatus no válido' });
  }

  try {
    const usuario = await modelo.cambiarEstatusPorCorreo(correo, estatus);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'No existe un trabajador con ese correo' });
    }
    res.json({ mensaje: `El estatus de ${usuario.nombre} cambió a "${usuario.estatus}"` });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar el estatus' });
  }
}

