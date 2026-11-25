const express = require('express');
const cors = require('cors');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const services = require('./config/services');
const { requireAuth } = require('./middleware/auth');

function findService(requestPath) {
  return services.find(({ prefix }) => requestPath === prefix || requestPath.startsWith(`${prefix}/`));
}

function createGateway({ sessionMiddleware, serviceUrls = process.env } = {}) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors());
  if (sessionMiddleware) app.use(sessionMiddleware);

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway' }));
  app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  });

  app.use('/api', (req, res, next) => {
    const requestPath = req.originalUrl.split('?')[0];
    const service = findService(requestPath);
    if (!service) return next();

    const serviceUrl = serviceUrls[service.urlEnv] || `http://127.0.0.1:${service.port}`;
    let target;

    try {
      target = new URL(serviceUrl);
    } catch (err) {
      console.error(`URL inválida en ${service.urlEnv}:`, err);
      return res.status(500).json({ error: 'Configuración de servicio inválida' });
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      console.error(`Protocolo no soportado en ${service.urlEnv}: ${target.protocol}`);
      return res.status(500).json({ error: 'Configuración de servicio inválida' });
    }

    const transport = target.protocol === 'https:' ? https : http;
    const headers = {
      ...req.headers,
      host: target.host,
      'x-forwarded-host': req.headers.host,
      'x-forwarded-proto': req.protocol,
      'x-forwarded-for': req.ip,
    };
    const outgoing = transport.request({
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: req.originalUrl,
      headers,
    }, (upstream) => {
      res.writeHead(upstream.statusCode || 502, upstream.headers);
      upstream.pipe(res);
    });

    outgoing.on('error', (err) => {
      console.error(`Error al conectar con el servicio ${service.name}:`, err);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Servicio temporalmente no disponible' });
      } else {
        res.destroy(err);
      }
    });

    res.on('close', () => {
      if (!res.writableEnded) outgoing.destroy();
    });

    req.pipe(outgoing);
  });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));
  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
  app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img')));

  app.use((err, req, res, next) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al procesar el archivo' });
    }
    next();
  });

  return app;
}

module.exports = { createGateway };
