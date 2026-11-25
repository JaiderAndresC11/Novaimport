const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, test } = require('node:test');
const { createGateway } = require('../src/gateway');

let upstream;
let gateway;
let gatewayUrl;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

before(async () => {
  upstream = http.createServer((req, res) => {
    const body = [];
    req.on('data', (chunk) => body.push(chunk));
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.setHeader('set-cookie', 'upstream-session=shared; Path=/; HttpOnly');
      res.end(JSON.stringify({
        method: req.method,
        url: req.url,
        cookie: req.headers.cookie || null,
        forwardedProto: req.headers['x-forwarded-proto'],
        body: Buffer.concat(body).toString(),
      }));
    });
  });
  const upstreamPort = await listen(upstream);

  gateway = createGateway({
    sessionMiddleware: (req, res, next) => next(),
    serviceUrls: {
      PRODUCTOS_SERVICE_URL: `http://127.0.0.1:${upstreamPort}`,
      PQRS_SERVICE_URL: `http://127.0.0.1:${upstreamPort}`,
    },
  });
  const gatewayServer = http.createServer(gateway);
  const gatewayPort = await listen(gatewayServer);
  gateway.server = gatewayServer;
  gatewayUrl = `http://127.0.0.1:${gatewayPort}`;
});

after(async () => {
  await Promise.all([close(gateway.server), close(upstream)]);
});

test('proxies API method, path, query, body, cookies, and upstream response headers', async () => {
  const response = await fetch(`${gatewayUrl}/api/productos/42?vista=compacta`, {
    method: 'POST',
    headers: { cookie: 'connect.sid=session-value', 'content-type': 'application/json' },
    body: JSON.stringify({ nombre: 'Producto de prueba' }),
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /upstream-session=shared/);
  assert.deepEqual(await response.json(), {
    method: 'POST',
    url: '/api/productos/42?vista=compacta',
    cookie: 'connect.sid=session-value',
    forwardedProto: 'http',
    body: JSON.stringify({ nombre: 'Producto de prueba' }),
  });
});

test('forwards multipart uploads without consuming the request body', async () => {
  const form = new FormData();
  form.append('descripcion', 'Adjunto de prueba');
  form.append('archivo', new Blob(['contenido de imagen']), 'evidencia.png');

  const response = await fetch(`${gatewayUrl}/api/pqrs`, { method: 'POST', body: form });
  const forwarded = await response.json();

  assert.equal(response.status, 200);
  assert.match(forwarded.body, /name="descripcion"/);
  assert.match(forwarded.body, /name="archivo"; filename="evidencia.png"/);
  assert.match(forwarded.body, /contenido de imagen/);
});

test('serves the existing frontend and protects the admin page', async () => {
  const home = await fetch(`${gatewayUrl}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<!DOCTYPE html>/i);

  const admin = await fetch(`${gatewayUrl}/admin.html`, { redirect: 'manual' });
  assert.equal(admin.status, 302);
  assert.equal(admin.headers.get('location'), '/admin_login.html');
});

test('returns gateway health without contacting a domain service', async () => {
  const response = await fetch(`${gatewayUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'gateway' });
});
