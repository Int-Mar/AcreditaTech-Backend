const express = require("express");
const ruta = express.Router();

const controlador = require("../controladores/constancia_controlador");
const { requiereSesion } = require("../seguridad/sesion");

ruta.get("/", requiereSesion, controlador.verMiConstancia);

ruta.get("/pdf", requiereSesion, controlador.descargarPdf);

ruta.post("/renovar", requiereSesion, controlador.renovar);

module.exports = ruta;
