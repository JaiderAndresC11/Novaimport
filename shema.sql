SET NAMES utf8mb4;

CREATE TABLE administradores (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  estado ENUM('pendiente', 'aprobado', 'rechazado') NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY administradores_correo_unique (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE clientes (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY clientes_correo_unique (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE productos (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(12,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imagen VARCHAR(500) DEFAULT NULL,
  capacidad VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT productos_precio_nonnegative CHECK (precio >= 0),
  CONSTRAINT productos_stock_nonnegative CHECK (stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pedidos (
  id INT NOT NULL AUTO_INCREMENT,
  cliente_id INT DEFAULT NULL,
  cliente_nombre VARCHAR(150) NOT NULL,
  cliente_contacto VARCHAR(150) NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  telefono VARCHAR(30) DEFAULT NULL,
  direccion VARCHAR(255) DEFAULT NULL,
  metodo_pago ENUM('efectivo', 'transferencia', 'tarjeta', 'contraentrega') DEFAULT NULL,
  PRIMARY KEY (id),
  KEY pedidos_cliente_id_index (cliente_id),
  CONSTRAINT pedidos_cliente_fk FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE detalle_pedidos (
  id INT NOT NULL AUTO_INCREMENT,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY detalle_pedidos_pedido_id_index (pedido_id),
  KEY detalle_pedidos_producto_id_index (producto_id),
  CONSTRAINT detalle_pedidos_pedido_fk FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
  CONSTRAINT detalle_pedidos_producto_fk FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT detalle_pedidos_cantidad_positive CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pqrs (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  contacto VARCHAR(150) NOT NULL,
  tipo ENUM('peticion', 'queja', 'reclamo', 'sugerencia') NOT NULL DEFAULT 'reclamo',
  descripcion TEXT NOT NULL,
  archivo VARCHAR(500) DEFAULT NULL,
  estado ENUM('pendiente', 'en_proceso', 'resuelto') NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE garantias (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  contacto VARCHAR(150) NOT NULL,
  producto VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  archivo VARCHAR(500) DEFAULT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE comentarios (
  id INT NOT NULL AUTO_INCREMENT,
  tipo ENUM('pqrs', 'garantia') NOT NULL,
  referencia_id INT NOT NULL,
  autor VARCHAR(100) NOT NULL DEFAULT 'Administrador',
  comentario TEXT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  archivo VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE OR REPLACE VIEW vista_garantias AS
SELECT id, nombre, contacto, producto, descripcion, archivo, estado, creado_en,
       CONCAT('GAR-', LPAD(id, 6, '0')) AS numero_caso
FROM garantias;

CREATE OR REPLACE VIEW vista_pqrs AS
SELECT id, nombre, contacto, tipo, descripcion, archivo, estado, creado_en,
       CONCAT('PQR-', LPAD(id, 6, '0')) AS numero_caso
FROM pqrs;