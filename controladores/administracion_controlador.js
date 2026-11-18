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

async function obtenerPerfil(req, res) {
  try {
    const perfil = await modelo.obtenerPerfilAdmin(req.usuario.id_usuario);
    if (!perfil) return res.status(404).json({ mensaje: 'Perfil no encontrado' });
    res.json(perfil);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el perfil' });
  }
}

async function editarPerfil(req, res) {
  const { nombre } = req.body;
  if (!esNombre(nombre)) {
    return res.status(400).json({ mensaje: 'Nombre: solo letras, de 5 a 25 caracteres' });
  }
  try {
    const perfil = await modelo.actualizarNombreAdmin(req.usuario.id_usuario, nombre);
    res.json({ mensaje: 'Perfil actualizado', nombre: perfil.nombre });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar el perfil' });
  }
}

module.exports = {
  obtenerEstatus,
  obtenerPadron,
  cambiarEstatus,
  obtenerPerfil,
  editarPerfil,
};

