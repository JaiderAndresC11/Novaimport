const express = require('express');
const router = express.Router();
const controlador = require('../controllers/clientes.controller');

router.post('/registrar', controlador.registrar);
router.post('/login', controlador.login);
router.post('/logout', controlador.logout);
router.get('/estado', controlador.estado);

module.exports = router;