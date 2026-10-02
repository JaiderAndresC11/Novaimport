const express = require('express');
const router = express.Router();
const controlador = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/login', controlador.login);
router.post('/logout', controlador.logout);
router.get('/estado', controlador.estado);

// Pública: cualquiera puede pedir acceso, pero queda "pendiente"
router.post('/solicitar', controlador.solicitarAcceso);

// Protegidas: solo un admin ya logueado puede ver y aprobar/rechazar
router.get('/solicitudes', requireAuth, controlador.listarSolicitudes);
router.put('/solicitudes/:id', requireAuth, controlador.actualizarSolicitud);

module.exports = router;