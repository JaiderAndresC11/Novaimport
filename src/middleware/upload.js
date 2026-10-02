const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crea el almacenamiento para una carpeta específica dentro de public/uploads
function crearStorage(carpeta) {
  const destino = path.join(__dirname, '..', 'public', 'uploads', carpeta);

  if (!fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destino),
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      cb(null, `${timestamp}${extension}`);
    },
  });
}

// Solo permite imágenes y videos, máximo 20MB
function filtroArchivo(req, file, cb) {
  const permitidos = /jpeg|jpg|png|webp|gif|mp4|mov|avi|webm/;
  const extensionOk = permitidos.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = /^(image|video)\//.test(file.mimetype);

  if (extensionOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes o videos (jpg, png, webp, mp4, mov, webm)'));
  }
}

const uploadPqrs = multer({
  storage: crearStorage('pqrs'),
  fileFilter: filtroArchivo,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const uploadGarantias = multer({
  storage: crearStorage('garantias'),
  fileFilter: filtroArchivo,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Las imágenes de productos van directo a public/img (la misma carpeta
// donde ya tienes las fotos que descargaste), no a una subcarpeta aparte.
function crearStorageImg() {
  const destino = path.join(__dirname, '..', 'public', 'img');

  if (!fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destino),
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      cb(null, `producto-${timestamp}${extension}`);
    },
  });
}

const uploadProductos = multer({
  storage: crearStorageImg(),
  fileFilter: (req, file, cb) => {
    const permitidos = /jpeg|jpg|png|webp|gif/;
    const ok = permitidos.test(path.extname(file.originalname).toLowerCase()) && /^image\//.test(file.mimetype);
    cb(ok ? null : new Error('Solo se permiten imágenes (jpg, png, webp)'), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { uploadPqrs, uploadGarantias, uploadProductos };