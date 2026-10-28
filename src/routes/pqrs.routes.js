const express = require('express');
const router = express.Router();
const controlador = require('../controllers/pqrs.controller');
const { uploadPqrs, uploadComentarios } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

router.post('/', uploadPqrs.single('archivo'), controlador.crearPqrs);

router.get('/', requireAuth, controlador.listarPqrs);
router.get('/:id', requireAuth, controlador.obtenerPqrs);
router.post('/:id/comentarios', requireAuth, uploadComentarios.single('archivo'), controlador.agregarComentarioPqrs);
router.put('/:id', requireAuth, controlador.actualizarEstadoPqrs);

module.exports = router;