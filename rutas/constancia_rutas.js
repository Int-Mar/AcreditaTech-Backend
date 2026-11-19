// constancia_rutas.js
// Rutas de la Pre-Constancia.

const express = require("express");
const ruta = express.Router();
const controlador = require("../controladores/constancia_controlador");
const { requiereSesion } = require("../seguridad/sesion");

// GET /api/constancia → ¿tengo Pre-Constancia? ¿puedo generarla? (requiere sesión)
ruta.get("/", requiereSesion, controlador.verMiConstancia);

module.exports = ruta;
