const modelo = require('../modelos/salud_modelo');

async function obtenerFicha(req, res) {
  try {
    const ficha = await modelo.obtenerFicha(req.usuario.id_usuario);
    res.json(ficha || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { obtenerFicha };