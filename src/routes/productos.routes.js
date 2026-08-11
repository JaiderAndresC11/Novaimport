const express = require('express');
const router = express.Router();
const controlador = require('../controllers/productos.controller');

router.get('/', controlador.listarProductos);
router.get('/:id', controlador.obtenerProducto);
router.post('/', controlador.crearProducto);
router.put('/:id', controlador.editarProducto);
router.delete('/:id', controlador.eliminarProducto);

module.exports = router;
