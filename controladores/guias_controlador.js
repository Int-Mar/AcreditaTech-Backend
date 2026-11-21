const modelo = require("../modelos/guias_modelo");
const reglas = require("../reglas");

async function verGuias(req, res) {
  try {
    let tipo = null;
    if (req.query.tipo !== undefined) {
      tipo = Number(req.query.tipo);
      if (tipo !== reglas.TIPO_TECNICA && tipo !== reglas.TIPO_SALUD) {
        return res
          .status(400)
          .json({ mensaje: "El tipo debe ser 1 (técnica) o 2 (salud)" });
      }
    }

    const soloRefuerzo =
      req.query.refuerzo === "1" || req.query.refuerzo === "true";

    const usuario = await modelo.obtenerOficioDeUsuario(req.usuario.id_usuario);

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const guias = soloRefuerzo
      ? await modelo.listarGuiasDeRefuerzo(
          req.usuario.id_usuario,
          usuario.id_oficio,
          tipo,
        )
      : await modelo.listarGuias(usuario.id_oficio, tipo);

    res.json({ guias });
  } catch (error) {
    console.error("Error al ver guías:", error.message);
    res.status(500).json({ mensaje: "Error al obtener las guías" });
  }
}

module.exports = { verGuias };
