
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  if (req.accepts('html')) {
    return res.redirect('/admin_login.html');
  }

  return res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
}

module.exports = { requireAuth };