const express     = require('express');
const ruta        = express.Router();
const controlador = require('../controladores/evaluaciones_controlador');
const { requiereSesion } = require('../seguridad/sesion');

ruta.post('/:tipo/iniciar', requiereSesion, controlador.iniciar);

ruta.get('/:tipo/pregunta', requiereSesion, controlador.verPregunta);

ruta.post('/:tipo/respuesta', requiereSesion, controlador.responder);

ruta.get('/:tipo/estado', requiereSesion, controlador.verEstado);

module.exports = ruta;

