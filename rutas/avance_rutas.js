const express = require("express");
const ruta = express.Router();
const controlador = require("../controladores/avance_controlador");
const { requiereSesion } = require("../seguridad/sesion");

ruta.get("/", requiereSesion, controlador.verAvance);

module.exports = ruta;
