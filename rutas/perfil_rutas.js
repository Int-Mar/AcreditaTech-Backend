// perfil_rutas.js
// Define las rutas del perfil. Todas requieren sesión activa.

const express = require('express');
const ruta = express.Router();
const multer = require('multer');
const controlador = require('../controladores/perfil_controlador');
const { requiereSesion } = require('../seguridad/sesion');

// multer en memoria: la imagen no se guarda en disco,
// se queda en RAM y la mandamos directo a Supabase Storage
// multer en memoria, máximo 2 MB y 1 archivo
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
});

// Recibe la foto y responde 400 (no 500) si multer la rechaza
function recibirFoto(req, res, next) {
  subida.single('foto')(req, res, (error) => {
    if (error) {
      const mensaje = error.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen no debe pesar más de 2 MB'
        : 'No se pudo leer la imagen';
      return res.status(400).json({ mensaje });
    }
    next();
  });
}

// GET  /api/perfil - ver datos del perfil
ruta.get('/', requiereSesion, controlador.verPerfil);

// PUT  /api/perfil - editar nombre y teléfono
ruta.put('/', requiereSesion, controlador.editarPerfil);

// POST /api/perfil/foto - subir foto de perfil
// "foto" es el nombre del campo que debe venir en el formulario
ruta.post('/foto', requiereSesion, recibirFoto, controlador.subirFoto);

module.exports = ruta;