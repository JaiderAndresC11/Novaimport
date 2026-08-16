const express = require('express');
const router = express.Router();
const controlador = require('../controllers/pedidos.controller');

router.post('/', controlador.crearPedido);
router.get('/', controlador.listarPedidos);
router.get('/:id', controlador.obtenerPedido);
router.put('/:id', controlador.actualizarEstado);

module.exports = router;
