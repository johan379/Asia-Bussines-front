-- ============================================================================
-- Arquitejas — esquema de base de datos (MySQL 8+)
-- Generado automaticamente a partir de los modelos SQLAlchemy en app/models/.
-- Ejecutar UNA sola vez sobre una base de datos vacia:
--   mysql -u root -p arquitejas < sql/schema.sql
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE bodegas (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(120) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (nombre)
);

CREATE TABLE tabla_colores_equivalencia (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	ral VARCHAR(30) NOT NULL, 
	nombre VARCHAR(60) NOT NULL, 
	codigo_interno VARCHAR(10) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (ral)
);

CREATE TABLE tabla_espesor_equivalencia (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	espesor FLOAT NOT NULL, 
	mt_por_ton FLOAT NOT NULL, 
	peso_por_metro FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (espesor)
);

CREATE TABLE tabla_tipos_material_equivalencia (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(60) NOT NULL, 
	codigo_interno VARCHAR(10) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (nombre)
);

CREATE TABLE movimientos (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	fecha DATETIME NOT NULL, 
	tipo ENUM('ENTRADA','SALIDA','TRASLADO','TRANSFERENCIA') NOT NULL, 
	motivo VARCHAR(60) NOT NULL, 
	producto_codigo VARCHAR(60) NOT NULL, 
	producto_descripcion VARCHAR(255) NOT NULL, 
	bodega_origen_id INTEGER, 
	bodega_destino_id INTEGER, 
	cantidad FLOAT NOT NULL, 
	usuario VARCHAR(150) NOT NULL, 
	observaciones TEXT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bodega_origen_id) REFERENCES bodegas (id), 
	FOREIGN KEY(bodega_destino_id) REFERENCES bodegas (id)
);

CREATE TABLE producciones (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	codigo_unico VARCHAR(30) NOT NULL, 
	fecha DATETIME NOT NULL, 
	usuario VARCHAR(150) NOT NULL, 
	responsable VARCHAR(150) NOT NULL, 
	bodega_id INTEGER NOT NULL, 
	producto_fabricado VARCHAR(150) NOT NULL, 
	modelo VARCHAR(80) NOT NULL, 
	medida_producto VARCHAR(80) NOT NULL, 
	cantidad_productos INTEGER NOT NULL, 
	codigo_clasificacion VARCHAR(60) NOT NULL, 
	total_metros_consumidos FLOAT NOT NULL, 
	saldo_codigo FLOAT NOT NULL, 
	observaciones TEXT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (codigo_unico), 
	FOREIGN KEY(bodega_id) REFERENCES bodegas (id)
);

CREATE INDEX ix_producciones_bodega_id ON producciones (bodega_id);

CREATE TABLE productos (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	bodega_id INTEGER NOT NULL, 
	codigo_importacion VARCHAR(50) NOT NULL, 
	codigo VARCHAR(50) NOT NULL, 
	descripcion VARCHAR(255) NOT NULL, 
	familia VARCHAR(50) NOT NULL, 
	calibre VARCHAR(30) NOT NULL, 
	entrada NUMERIC(12, 2) NOT NULL, 
	stock NUMERIC(12, 2) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bodega_id) REFERENCES bodegas (id)
);

CREATE INDEX ix_productos_codigo ON productos (codigo);
CREATE INDEX ix_productos_bodega_id ON productos (bodega_id);

CREATE TABLE recepciones (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	fecha DATETIME NOT NULL, 
	bodega_id INTEGER NOT NULL, 
	encargado VARCHAR(150) NOT NULL, 
	proveedor VARCHAR(150) NOT NULL, 
	archivo_origen VARCHAR(255) NOT NULL, 
	tolerancia_porcentaje FLOAT NOT NULL, 
	estado VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bodega_id) REFERENCES bodegas (id)
);

CREATE INDEX ix_recepciones_bodega_id ON recepciones (bodega_id);

CREATE TABLE solicitudes (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	fecha DATETIME NOT NULL, 
	estado ENUM('PENDIENTE','ACEPTADA','RECHAZADA') NOT NULL, 
	tipo_operacion ENUM('SOLICITUD','PRESTAMO','INTERCAMBIO') NOT NULL, 
	cantidad FLOAT NOT NULL, 
	producto_codigo VARCHAR(60) NOT NULL, 
	producto_descripcion VARCHAR(255) NOT NULL, 
	bodega_solicitante_id INTEGER NOT NULL, 
	bodega_propietaria_id INTEGER NOT NULL, 
	solicitado_por VARCHAR(150) NOT NULL, 
	observaciones TEXT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bodega_solicitante_id) REFERENCES bodegas (id), 
	FOREIGN KEY(bodega_propietaria_id) REFERENCES bodegas (id)
);

CREATE TABLE usuarios (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	correo VARCHAR(150) NOT NULL, 
	contrasena_hash VARCHAR(255) NOT NULL, 
	rol ENUM('JEFE_PLANTA','ADMINISTRATIVO') NOT NULL, 
	bodega_id INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bodega_id) REFERENCES bodegas (id)
);

CREATE UNIQUE INDEX ix_usuarios_correo ON usuarios (correo);

CREATE TABLE rollos (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	bodega_id INTEGER NOT NULL, 
	recepcion_id INTEGER, 
	codigo_interno VARCHAR(60) NOT NULL, 
	identificador_rollo VARCHAR(60) NOT NULL, 
	codigo_proveedor VARCHAR(60) NOT NULL, 
	descripcion VARCHAR(255) NOT NULL, 
	familia VARCHAR(50) NOT NULL, 
	color_material VARCHAR(60) NOT NULL, 
	calibre FLOAT NOT NULL, 
	metros_proveedor FLOAT NOT NULL, 
	metros_calculados FLOAT NOT NULL, 
	metros_disponibles FLOAT NOT NULL, 
	metros_consumidos FLOAT NOT NULL, 
	fecha_ingreso DATETIME NOT NULL, 
	estado ENUM('CERRADO','ABIERTO','AGOTADO') NOT NULL, 
	observaciones TEXT NOT NULL, 
	proveedor VARCHAR(120) NOT NULL, 
	lote VARCHAR(60) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bodega_id) REFERENCES bodegas (id), 
	FOREIGN KEY(recepcion_id) REFERENCES recepciones (id)
);

CREATE INDEX ix_rollos_bodega_id ON rollos (bodega_id);
CREATE INDEX ix_rollos_codigo_interno ON rollos (codigo_interno);

CREATE TABLE historial_consumos_rollo (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	rollo_id INTEGER NOT NULL, 
	fecha DATETIME NOT NULL, 
	cantidad FLOAT NOT NULL, 
	usuario VARCHAR(150) NOT NULL, 
	observaciones TEXT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(rollo_id) REFERENCES rollos (id)
);

CREATE INDEX ix_historial_consumos_rollo_rollo_id ON historial_consumos_rollo (rollo_id);

CREATE TABLE rollos_utilizados_produccion (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	produccion_id INTEGER NOT NULL, 
	rollo_id INTEGER NOT NULL, 
	identificador_rollo VARCHAR(60) NOT NULL, 
	metros_consumidos FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(produccion_id) REFERENCES producciones (id), 
	FOREIGN KEY(rollo_id) REFERENCES rollos (id)
);

SET FOREIGN_KEY_CHECKS = 1;
