const express = require('express');
const router = express.Router();
const controlador = require('../controllers/productos.controller');
const { uploadProductos } = require('../middleware/upload');

router.get('/', controlador.listarProductos);
router.get('/:id', controlador.obtenerProducto);
router.post('/', uploadProductos.single('imagen'), controlador.crearProducto);
router.put('/:id', uploadProductos.single('imagen'), controlador.editarProducto);
router.delete('/:id', controlador.eliminarProducto);

module.exports = router;