-- ============================================
-- MIGRACIÓN: Sistema de Ramos Técnicos (Equipos Industriales)
-- Descripción: Tablas y catálogos para pólizas de equipos industriales
--              (excavadoras, volquetas, retroexcavadoras, etc.)
-- ============================================

-- ============================================
-- 1. CATÁLOGO DE TIPOS DE EQUIPO
-- ============================================

CREATE TABLE IF NOT EXISTS tipos_equipo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Datos iniciales de tipos de equipo
INSERT INTO tipos_equipo (nombre, descripcion) VALUES
    ('Excavadora', 'Maquinaria pesada para excavación'),
    ('Retroexcavadora', 'Equipo combinado de cargador y excavadora'),
    ('Volqueta', 'Camión de volteo para transporte de materiales'),
    ('Cargador Frontal', 'Equipo para carga y movimiento de materiales'),
    ('Motoniveladora', 'Maquinaria para nivelación de terrenos'),
    ('Rodillo Compactador', 'Equipo para compactación de suelos'),
    ('Grúa', 'Equipo de elevación y carga'),
    ('Montacargas', 'Equipo para manejo de carga en almacenes'),
    ('Tractor', 'Vehículo agrícola/industrial'),
    ('Bulldozer', 'Tractor de oruga con pala delantera'),
    ('Minicargador', 'Cargador compacto tipo Bobcat'),
    ('Perforadora', 'Equipo de perforación'),
    ('Generador', 'Equipo de generación eléctrica'),
    ('Compresor', 'Equipo de compresión de aire'),
    ('Plataforma Elevadora', 'Equipo para trabajo en altura'),
    ('Camión Mixer', 'Camión mezclador de concreto'),
    ('Bomba de Concreto', 'Equipo para bombeo de concreto'),
    ('Otro', 'Otro tipo de equipo industrial')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 2. CATÁLOGO DE MARCAS DE EQUIPO
-- ============================================

CREATE TABLE IF NOT EXISTS marcas_equipo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Datos iniciales de marcas de equipo industrial
INSERT INTO marcas_equipo (nombre) VALUES
    ('Caterpillar'),
    ('Komatsu'),
    ('John Deere'),
    ('Volvo'),
    ('Hitachi'),
    ('Liebherr'),
    ('JCB'),
    ('Case'),
    ('New Holland'),
    ('Bobcat'),
    ('Hyundai'),
    ('Doosan'),
    ('Kobelco'),
    ('XCMG'),
    ('Sany'),
    ('Terex'),
    ('Manitou'),
    ('Yale'),
    ('Toyota Industrial'),
    ('Clark'),
    ('Hyster'),
    ('Crown'),
    ('Atlas Copco'),
    ('Ingersoll Rand'),
    ('Cummins'),
    ('Scania'),
    ('Mercedes-Benz'),
    ('Volvo Trucks'),
    ('Hino'),
    ('Isuzu'),
    ('Otra')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 3. TABLA PRINCIPAL DE EQUIPOS POR PÓLIZA
-- ============================================

CREATE TABLE IF NOT EXISTS polizas_ramos_tecnicos_equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

    -- Campos obligatorios
    nro_serie TEXT NOT NULL,
    valor_asegurado NUMERIC(15,2) NOT NULL CHECK (valor_asegurado > 0),
    franquicia NUMERIC(15,2) NOT NULL CHECK (franquicia >= 0),
    nro_chasis TEXT NOT NULL,
    uso TEXT NOT NULL CHECK (uso IN ('publico', 'particular')),
    coaseguro NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (coaseguro >= 0 AND coaseguro <= 100),

    -- Campos opcionales
    placa TEXT, -- Opcional para equipos industriales
    tipo_equipo_id UUID REFERENCES tipos_equipo(id),
    marca_equipo_id UUID REFERENCES marcas_equipo(id),
    modelo TEXT,
    ano INTEGER CHECK (ano IS NULL OR (ano >= 1900 AND ano <= 2100)),
    color TEXT,
    nro_motor TEXT,
    plaza_circulacion TEXT,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),

    -- Restricción: nro_serie único dentro de la misma póliza
    UNIQUE(poliza_id, nro_serie)
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_ramos_tecnicos_equipos_poliza
    ON polizas_ramos_tecnicos_equipos(poliza_id);
CREATE INDEX IF NOT EXISTS idx_ramos_tecnicos_equipos_nro_serie
    ON polizas_ramos_tecnicos_equipos(nro_serie);
CREATE INDEX IF NOT EXISTS idx_ramos_tecnicos_equipos_tipo
    ON polizas_ramos_tecnicos_equipos(tipo_equipo_id);
CREATE INDEX IF NOT EXISTS idx_ramos_tecnicos_equipos_marca
    ON polizas_ramos_tecnicos_equipos(marca_equipo_id);

-- ============================================
-- 4. TRIGGER PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_ramos_tecnicos_equipos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ramos_tecnicos_equipos_updated_at
    ON polizas_ramos_tecnicos_equipos;
CREATE TRIGGER trigger_update_ramos_tecnicos_equipos_updated_at
    BEFORE UPDATE ON polizas_ramos_tecnicos_equipos
    FOR EACH ROW
    EXECUTE FUNCTION update_ramos_tecnicos_equipos_updated_at();

-- ============================================
-- 5. POLÍTICAS RLS (Row Level Security)
-- ============================================

ALTER TABLE tipos_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_ramos_tecnicos_equipos ENABLE ROW LEVEL SECURITY;

-- Políticas para catálogos (lectura pública para autenticados)
CREATE POLICY "Tipos equipo: lectura para autenticados"
    ON tipos_equipo FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Marcas equipo: lectura para autenticados"
    ON marcas_equipo FOR SELECT
    TO authenticated
    USING (true);

-- Políticas para equipos de pólizas
CREATE POLICY "Equipos RT: lectura para autenticados"
    ON polizas_ramos_tecnicos_equipos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Equipos RT: inserción para autenticados"
    ON polizas_ramos_tecnicos_equipos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Equipos RT: actualización para autenticados"
    ON polizas_ramos_tecnicos_equipos FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Equipos RT: eliminación para autenticados"
    ON polizas_ramos_tecnicos_equipos FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 6. VISTA CON NOMBRES DE CATÁLOGOS
-- ============================================

CREATE OR REPLACE VIEW polizas_ramos_tecnicos_equipos_vista AS
SELECT
    e.*,
    te.nombre AS tipo_equipo_nombre,
    me.nombre AS marca_equipo_nombre
FROM polizas_ramos_tecnicos_equipos e
LEFT JOIN tipos_equipo te ON e.tipo_equipo_id = te.id
LEFT JOIN marcas_equipo me ON e.marca_equipo_id = me.id;

-- ============================================
-- 7. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE tipos_equipo IS 'Catálogo de tipos de equipos industriales para Ramos Técnicos';
COMMENT ON TABLE marcas_equipo IS 'Catálogo de marcas de equipos industriales para Ramos Técnicos';
COMMENT ON TABLE polizas_ramos_tecnicos_equipos IS 'Equipos industriales asegurados en pólizas de Ramos Técnicos';

COMMENT ON COLUMN polizas_ramos_tecnicos_equipos.nro_serie IS 'Número de serie del equipo (identificador principal)';
COMMENT ON COLUMN polizas_ramos_tecnicos_equipos.placa IS 'Placa del equipo (opcional, algunos equipos no tienen)';
COMMENT ON COLUMN polizas_ramos_tecnicos_equipos.coaseguro IS 'Porcentaje de coaseguro (0-100%)';
