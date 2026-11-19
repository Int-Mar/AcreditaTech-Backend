// constancia_rutas.js
// Rutas de la Pre-Constancia (todas requieren sesión)

const express = require("express");
const ruta = express.Router();

const controlador = require("../controladores/constancia_controlador");
const { requiereSesion } = require("../seguridad/sesion");

// GET /api/constancia      → estado de mi Pre-Constancia
ruta.get("/", requiereSesion, controlador.verMiConstancia);

// GET /api/constancia/pdf  → descarga el PDF
ruta.get("/pdf", requiereSesion, controlador.descargarPdf);

module.exports = ruta;
