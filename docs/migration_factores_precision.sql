-- Migración: ampliar precisión decimal de los factores de prima neta
-- Problema: factor_contado/factor_credito son numeric(10,4), por lo que
-- Postgres redondea valores como 1.25995 a 1.2600 al guardar.
-- Fix: ampliar a numeric(12,6) para admitir hasta 6 decimales.
--
-- La vista productos_aseguradoras_vista depende de estas columnas, así que
-- hay que eliminarla antes del ALTER y recrearla idéntica después.

DROP VIEW IF EXISTS productos_aseguradoras_vista;

ALTER TABLE productos_aseguradoras
	ALTER COLUMN factor_contado TYPE numeric(12,6),
	ALTER COLUMN factor_credito TYPE numeric(12,6);

CREATE VIEW productos_aseguradoras_vista AS
SELECT
	p.id,
	p.compania_aseguradora_id,
	ca.nombre AS compania_nombre,
	p.tipo_seguro_id,
	ts.nombre AS tipo_seguro_nombre,
	ts.codigo AS tipo_seguro_codigo,
	p.codigo_producto,
	p.nombre_producto,
	p.factor_contado,
	p.factor_credito,
	p.porcentaje_comision,
	p.activo,
	p.created_at,
	p.updated_at
FROM productos_aseguradoras p
JOIN companias_aseguradoras ca ON p.compania_aseguradora_id = ca.id
JOIN tipos_seguros ts ON p.tipo_seguro_id = ts.id;
