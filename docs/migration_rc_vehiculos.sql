-- ============================================================
-- Migration: Vehículos de Responsabilidad Civil
-- Tabla: polizas_rc_vehiculos
-- Descripción: Almacena los vehículos/maquinaria que pueden
--              causar accidentes a terceros en pólizas de RC
-- Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS polizas_rc_vehiculos (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poliza_id           uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

    -- Campos obligatorios
    placa               text NOT NULL,
    nro_chasis          text NOT NULL,
    uso                 text NOT NULL CHECK (uso IN ('publico', 'particular', 'privado')),

    -- Catálogos existentes (opcionales)
    tipo_vehiculo_id    uuid REFERENCES tipos_vehiculo(id),
    marca_vehiculo_id   uuid REFERENCES marcas_vehiculo(id),

    -- Campos opcionales de identificación
    modelo              text,
    ano                 integer,
    color               text,
    nro_motor           text,

    -- Campos operativos opcionales
    servicio            text,              -- Cisterna, Trans. Carga, etc.
    capacidad           text,              -- 36.000 Litros, 20 TN, etc.
    region_uso          text,              -- Países del Conosur, Nacional, etc.
    tipo_carroceria     text,
    propiedad           text CHECK (propiedad IN ('privada', 'publica') OR propiedad IS NULL),
    ejes                integer,
    asientos            integer,
    cilindrada          integer,

    -- Auditoría
    created_at          timestamptz DEFAULT now(),
    created_by          uuid REFERENCES profiles(id),
    updated_at          timestamptz DEFAULT now(),
    updated_by          uuid REFERENCES profiles(id)
);

-- Índice por poliza_id para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_rc_vehiculos_poliza_id ON polizas_rc_vehiculos(poliza_id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE polizas_rc_vehiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RC Vehiculos: lectura para autenticados"
    ON polizas_rc_vehiculos FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "RC Vehiculos: inserción para autenticados"
    ON polizas_rc_vehiculos FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "RC Vehiculos: actualización para autenticados"
    ON polizas_rc_vehiculos FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "RC Vehiculos: eliminación para autenticados"
    ON polizas_rc_vehiculos FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Trigger para updated_at automático
-- ============================================================

CREATE OR REPLACE TRIGGER set_updated_at_rc_vehiculos
    BEFORE UPDATE ON polizas_rc_vehiculos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Comentarios
-- ============================================================

COMMENT ON TABLE polizas_rc_vehiculos IS 'Vehículos o maquinaria que pueden causar accidentes a terceros en pólizas de Responsabilidad Civil';
COMMENT ON COLUMN polizas_rc_vehiculos.placa IS 'Placa del vehículo (obligatoria en RC)';
COMMENT ON COLUMN polizas_rc_vehiculos.nro_chasis IS 'Número de chasis del vehículo';
COMMENT ON COLUMN polizas_rc_vehiculos.uso IS 'Uso del vehículo: publico, particular o privado';
COMMENT ON COLUMN polizas_rc_vehiculos.servicio IS 'Tipo de servicio: Cisterna, Trans. Carga, etc.';
COMMENT ON COLUMN polizas_rc_vehiculos.capacidad IS 'Capacidad con unidad: 36.000 Litros, 20 TN, etc.';
COMMENT ON COLUMN polizas_rc_vehiculos.region_uso IS 'Región de circulación: Nacional, Países del Conosur, etc.';
