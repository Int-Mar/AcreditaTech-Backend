const express = require("express");
const ruta = express.Router();
const controlador = require("../controladores/guias_controlador");
const { requiereSesion } = require("../seguridad/sesion");

ruta.get("/", requiereSesion, controlador.verGuias);

module.exports = ruta;
