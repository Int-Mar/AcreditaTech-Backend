// perfil_controlador.js
// Maneja todo lo relacionado con el perfil del usuario:
// ver sus datos, editarlos y cambiar su foto.

const { createClient } = require('@supabase/supabase-js');
const modelo = require('../modelos/usuarios_modelo');
const { esTexto, esNombre, esTelefono55, esImagenReal } = require('../seguridad/validaciones');

// Conectar con Supabase Storage usando las variables del .env
const supabase = createClient(
  process.env.URL_SUPABASE,
  process.env.CLAVE_SUPABASE
);

// ── Ver perfil ─────────────────────────────────────────────────────────────
// GET /api/perfil
// Regresa todos los datos del usuario que tiene sesión activa.
async function verPerfil(req, res) {
  try {
    // req.usuario viene del middleware requiereSesion (trae id_usuario del token)
    const perfil = await modelo.obtenerPerfil(req.usuario.id_usuario);

    if (!perfil) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ perfil });

  } catch (error) {
    console.error('Error al ver perfil:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener el perfil' });
  }
}

// ── Editar perfil ──────────────────────────────────────────────────────────
// PUT /api/perfil
// Permite cambiar SOLO nombre y teléfono (lo único que pide el formulario).
async function editarPerfil(req, res) {
  const { nombre: nombreCrudo, telefono } = req.body || {};
  const id_usuario = req.usuario.id_usuario;

  // Los dos campos deben llegar como texto
  if (!esTexto(nombreCrudo) || !esTexto(telefono)) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
  }

  const nombre = nombreCrudo.trim();

  // Validar nombre: solo letras y espacios, 5-25 caracteres
  if (!esNombre(nombre)) {
    return res.status(400).json({
      mensaje: 'Nombre inválido: solo letras, entre 5 y 25 caracteres'
    });
  }

  // Validar teléfono: 10 dígitos empezando con 55
  if (!esTelefono55(telefono)) {
    return res.status(400).json({
      mensaje: 'Teléfono inválido: 10 dígitos comenzando con 55'
    });
  }

  try {
    // Verificar que el teléfono no lo tenga otro usuario
    const telefonoOcupado = await modelo.buscarTelefonoDeOtro(telefono, id_usuario);
    if (telefonoOcupado) {
      return res.status(409).json({ mensaje: 'El teléfono ya está registrado' });
    }

    await modelo.actualizarPerfil(id_usuario, { nombre, telefono });

    res.json({ mensaje: 'Perfil actualizado correctamente' });

  } catch (error) {
    console.error('Error al editar perfil:', error.message);
    res.status(500).json({ mensaje: 'Error al actualizar el perfil' });
  }
}

// ── Subir foto ─────────────────────────────────────────────────────────────
// POST /api/perfil/foto
// Recibe una imagen, la sube a Supabase Storage y guarda su URL en la BD.
async function subirFoto(req, res) {
  // multer ya procesó la imagen y la dejó en req.file (en memoria, no en disco)
  if (!req.file) {
    return res.status(400).json({ mensaje: 'No se recibió ninguna imagen' });
  }

  // Validar que sea JPG o PNG
  const tiposPermitidos = ['image/jpeg', 'image/png'];
  if (!tiposPermitidos.includes(req.file.mimetype)) {
    return res.status(400).json({ mensaje: 'Solo se permiten imágenes JPG o PNG' });
  }

    // Validar que el contenido de verdad sea una imagen
  if (!esImagenReal(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({ mensaje: 'El archivo no es una imagen válida' });
  }


  // Validar que no pese más de 2 MB (2 * 1024 * 1024 = 2097152 bytes)
  if (req.file.size > 2 * 1024 * 1024) {
    return res.status(400).json({ mensaje: 'La imagen no debe pesar más de 2 MB' });
  }

  try {
    const id_usuario = req.usuario.id_usuario;

    // Crear un nombre único para la foto: "foto-5.jpg", "foto-5.png"
    const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const nombreArchivo = `foto-${id_usuario}.${extension}`;

    // Subir la imagen al bucket "fotos-perfil" en Supabase Storage
    // req.file.buffer es la imagen en memoria (bytes)
    const { error: errorSubida } = await supabase.storage
      .from('fotos-perfil')
      .upload(nombreArchivo, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true  // si ya existe una foto anterior, la reemplaza
      });

    if (errorSubida) {
      console.error('Error al subir a Storage:', errorSubida.message);
      return res.status(500).json({ mensaje: 'Error al subir la imagen' });
    }

    // Obtener la URL pública de la foto recién subida
    const { data } = supabase.storage
      .from('fotos-perfil')
      .getPublicUrl(nombreArchivo);

    const foto_url = data.publicUrl;

    // Guardar esa URL en la base de datos
    await modelo.actualizarFoto(id_usuario, foto_url);

    res.json({
      mensaje: 'Foto actualizada correctamente',
      foto_url
    });

  } catch (error) {
    console.error('Error al subir foto:', error.message);
    res.status(500).json({ mensaje: 'Error interno al subir la foto' });
  }
}

module.exports = { verPerfil, editarPerfil, subirFoto };