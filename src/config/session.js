const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./db');

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && (!sessionSecret || sessionSecret.length < 32)) {
  throw new Error('SESSION_SECRET debe contener al menos 32 caracteres en producción');
}

const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 8 * 60 * 60 * 1000,
  schema: { tableName: 'sessions' },
}, pool);

const sessionMiddleware = session({
  secret: sessionSecret || 'novaimport-clave-secreta',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction ? 'auto' : false,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
});

module.exports = {
  middleware: sessionMiddleware,
  store: sessionStore,
  waitUntilReady: () => sessionStore.onReady(),
};
