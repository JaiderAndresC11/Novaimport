module.exports = [
  { name: 'productos', prefix: '/api/productos', port: 3001, urlEnv: 'PRODUCTOS_SERVICE_URL', router: './routes/productos.routes' },
  { name: 'pedidos', prefix: '/api/pedidos', port: 3002, urlEnv: 'PEDIDOS_SERVICE_URL', router: './routes/pedidos.routes' },
  { name: 'pqrs', prefix: '/api/pqrs', port: 3003, urlEnv: 'PQRS_SERVICE_URL', router: './routes/pqrs.routes' },
  { name: 'garantias', prefix: '/api/garantias', port: 3004, urlEnv: 'GARANTIAS_SERVICE_URL', router: './routes/garantias.routes' },
  { name: 'auth', prefix: '/api/auth', port: 3005, urlEnv: 'AUTH_SERVICE_URL', router: './routes/auth.routes' },
  { name: 'clientes', prefix: '/api/clientes', port: 3006, urlEnv: 'CLIENTES_SERVICE_URL', router: './routes/clientes.routes' },
];
