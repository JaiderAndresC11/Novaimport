const express = require('express');
const router = express.Router();
const controlador = require('../controllers/garantias.controller');
const { uploadGarantias, uploadComentarios } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

router.post('/', uploadGarantias.single('archivo'), controlador.crearGarantia);

router.get('/', requireAuth, controlador.listarGarantias);
router.get('/:id', requireAuth, controlador.obtenerGarantia);
router.post('/:id/comentarios', requireAuth, uploadComentarios.single('archivo'), controlador.agregarComentarioGarantia);
router.put('/:id', requireAuth, controlador.actualizarEstadoGarantia);

module.exports = router;