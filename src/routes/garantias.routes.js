const express = require('express');
const router = express.Router();
const controlador = require('../controllers/garantias.controller');
const { uploadGarantias } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

// Pública: cualquier cliente puede enviar una solicitud
router.post('/', uploadGarantias.single('archivo'), controlador.crearGarantia);

// Protegidas: solo el administrador ve y gestiona las solicitudes
router.get('/', requireAuth, controlador.listarGarantias);
router.get('/:id', requireAuth, controlador.obtenerGarantia);
router.post('/:id/comentarios', requireAuth, controlador.agregarComentarioGarantia);
router.put('/:id', requireAuth, controlador.actualizarEstadoGarantia);

module.exports = router;