const express = require('express');
const router = express.Router();
const { requiereSesion, soloAdministrador } = require('../seguridad/sesion');
const controlador = require('../controladores/administracion_controlador');

router.use(requiereSesion, soloAdministrador);

router.get('/estatus', controlador.obtenerEstatus);
router.put('/estatus', controlador.cambiarEstatus);
router.get('/padron/:tipo', controlador.obtenerPadron);
router.get('/perfil', controlador.obtenerPerfil);
router.put('/perfil', controlador.editarPerfil);


// Las usan mis pantallas (usuarios y estadísticas)
router.get('/usuarios', controlador.listarUsuarios);

module.exports = router;

