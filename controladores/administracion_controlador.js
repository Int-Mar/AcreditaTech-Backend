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
