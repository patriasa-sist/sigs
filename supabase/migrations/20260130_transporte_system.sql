-- ============================================
-- MIGRACIÓN: Sistema de Pólizas de Transporte
-- Fecha: 2026-01-30
-- Descripción: Crea tablas para gestión de seguros de transporte
-- ============================================

-- ============================================
-- 1. CATÁLOGO DE PAÍSES
-- ============================================

CREATE TABLE IF NOT EXISTS paises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_iso VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-3
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar países de América y principales socios comerciales
INSERT INTO paises (codigo_iso, nombre) VALUES
    -- Sudamérica
    ('BOL', 'Bolivia'),
    ('ARG', 'Argentina'),
    ('BRA', 'Brasil'),
    ('CHL', 'Chile'),
    ('COL', 'Colombia'),
    ('ECU', 'Ecuador'),
    ('GUY', 'Guyana'),
    ('PRY', 'Paraguay'),
    ('PER', 'Perú'),
    ('SUR', 'Surinam'),
    ('URY', 'Uruguay'),
    ('VEN', 'Venezuela'),
    -- Centroamérica y Caribe
    ('MEX', 'México'),
    ('GTM', 'Guatemala'),
    ('HND', 'Honduras'),
    ('SLV', 'El Salvador'),
    ('NIC', 'Nicaragua'),
    ('CRI', 'Costa Rica'),
    ('PAN', 'Panamá'),
    ('CUB', 'Cuba'),
    ('DOM', 'República Dominicana'),
    -- Norteamérica
    ('USA', 'Estados Unidos'),
    ('CAN', 'Canadá'),
    -- Europa
    ('ESP', 'España'),
    ('DEU', 'Alemania'),
    ('FRA', 'Francia'),
    ('ITA', 'Italia'),
    ('GBR', 'Reino Unido'),
    ('NLD', 'Países Bajos'),
    ('BEL', 'Bélgica'),
    ('CHE', 'Suiza'),
    -- Asia
    ('CHN', 'China'),
    ('JPN', 'Japón'),
    ('KOR', 'Corea del Sur'),
    ('IND', 'India'),
    ('THA', 'Tailandia'),
    ('VNM', 'Vietnam'),
    ('MYS', 'Malasia'),
    ('SGP', 'Singapur'),
    ('TWN', 'Taiwán'),
    ('HKG', 'Hong Kong'),
    -- Otros
    ('AUS', 'Australia'),
    ('NZL', 'Nueva Zelanda'),
    ('ZAF', 'Sudáfrica'),
    ('ARE', 'Emiratos Árabes Unidos')
ON CONFLICT (codigo_iso) DO NOTHING;

-- Índices para países
CREATE INDEX IF NOT EXISTS idx_paises_nombre ON paises(nombre);
CREATE INDEX IF NOT EXISTS idx_paises_activo ON paises(activo);

-- ============================================
-- 2. TABLA DE DATOS ESPECÍFICOS DE TRANSPORTE
-- ============================================

CREATE TABLE IF NOT EXISTS polizas_transporte (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

    -- Datos de la mercancía
    materia_asegurada TEXT NOT NULL, -- Descripción detallada de la mercancía
    tipo_embalaje VARCHAR(200) NOT NULL, -- Tipo de embalaje

    -- Datos del embarque
    fecha_embarque DATE NOT NULL,
    tipo_transporte VARCHAR(20) NOT NULL CHECK (
        tipo_transporte IN ('terrestre', 'maritimo', 'aereo', 'ferreo', 'multimodal')
    ),

    -- Origen
    pais_origen_id uuid NOT NULL REFERENCES paises(id),
    ciudad_origen VARCHAR(200) NOT NULL,

    -- Destino
    pais_destino_id uuid NOT NULL REFERENCES paises(id),
    ciudad_destino VARCHAR(200) NOT NULL,

    -- Valor y facturación
    valor_asegurado NUMERIC(18, 2) NOT NULL CHECK (valor_asegurado > 0),
    factura VARCHAR(100) NOT NULL, -- Número de factura
    fecha_factura DATE NOT NULL,

    -- Coberturas
    cobertura_a BOOLEAN DEFAULT false, -- Cobertura A (Todo Riesgo)
    cobertura_c BOOLEAN DEFAULT false, -- Cobertura C (Riesgos Nombrados)

    -- Modalidad de póliza
    modalidad VARCHAR(30) NOT NULL CHECK (
        modalidad IN ('flotante', 'flat', 'un_solo_embarque', 'flat_prima_minima_deposito')
    ),

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by uuid REFERENCES profiles(id),
    updated_by uuid REFERENCES profiles(id)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_polizas_transporte_poliza ON polizas_transporte(poliza_id);
CREATE INDEX IF NOT EXISTS idx_polizas_transporte_fecha_embarque ON polizas_transporte(fecha_embarque);
CREATE INDEX IF NOT EXISTS idx_polizas_transporte_tipo ON polizas_transporte(tipo_transporte);
CREATE INDEX IF NOT EXISTS idx_polizas_transporte_origen ON polizas_transporte(pais_origen_id);
CREATE INDEX IF NOT EXISTS idx_polizas_transporte_destino ON polizas_transporte(pais_destino_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_polizas_transporte_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_polizas_transporte_updated_at ON polizas_transporte;
CREATE TRIGGER trigger_polizas_transporte_updated_at
    BEFORE UPDATE ON polizas_transporte
    FOR EACH ROW
    EXECUTE FUNCTION update_polizas_transporte_updated_at();

-- ============================================
-- 3. RLS (Row Level Security)
-- ============================================

ALTER TABLE paises ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_transporte ENABLE ROW LEVEL SECURITY;

-- Política para paises (lectura pública para usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden ver países"
    ON paises FOR SELECT
    TO authenticated
    USING (activo = true);

-- Políticas para polizas_transporte
CREATE POLICY "Usuarios autenticados pueden ver datos de transporte"
    ON polizas_transporte FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar datos de transporte"
    ON polizas_transporte FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar datos de transporte"
    ON polizas_transporte FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 4. COMENTARIOS
-- ============================================

COMMENT ON TABLE paises IS 'Catálogo de países para origen/destino de transporte';
COMMENT ON TABLE polizas_transporte IS 'Datos específicos de pólizas de seguro de transporte';

COMMENT ON COLUMN polizas_transporte.tipo_transporte IS 'Medio de transporte: terrestre, maritimo, aereo, ferreo, multimodal';
COMMENT ON COLUMN polizas_transporte.cobertura_a IS 'Cobertura A - Todo Riesgo';
COMMENT ON COLUMN polizas_transporte.cobertura_c IS 'Cobertura C - Riesgos Nombrados';
COMMENT ON COLUMN polizas_transporte.modalidad IS 'Tipo de póliza: flotante, flat, un_solo_embarque, flat_prima_minima_deposito';
