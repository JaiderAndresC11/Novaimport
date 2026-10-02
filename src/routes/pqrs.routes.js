const express = require('express');
const router = express.Router();
const controlador = require('../controllers/pqrs.controller');
const { uploadPqrs } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

// Pública: cualquier cliente puede enviar un caso
router.post('/', uploadPqrs.single('archivo'), controlador.crearPqrs);

// Protegidas: solo el administrador ve y gestiona los casos
router.get('/', requireAuth, controlador.listarPqrs);
router.get('/:id', requireAuth, controlador.obtenerPqrs);
router.post('/:id/comentarios', requireAuth, controlador.agregarComentarioPqrs);
router.put('/:id', requireAuth, controlador.actualizarEstadoPqrs);

module.exports = router;