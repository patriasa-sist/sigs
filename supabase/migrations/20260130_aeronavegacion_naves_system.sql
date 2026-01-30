-- ============================================
-- SISTEMA DE PÓLIZAS: AERONAVEGACIÓN Y NAVES/EMBARCACIONES
-- Fecha: 2026-01-30
-- Descripción: Tablas para pólizas de aeronavegación y naves/embarcaciones
-- ============================================

-- ============================================
-- 1. TABLA: polizas_aeronavegacion_niveles_ap
-- Niveles de Accidentes Personales para tripulantes/pasajeros
-- ============================================
CREATE TABLE IF NOT EXISTS polizas_aeronavegacion_niveles_ap (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    nombre text NOT NULL, -- "Nivel 1", "Nivel 2", etc.
    monto_muerte_accidental numeric(18,2) NOT NULL DEFAULT 0,
    monto_invalidez numeric(18,2) NOT NULL DEFAULT 0,
    monto_gastos_medicos numeric(18,2) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT niveles_ap_nombre_unico_por_poliza UNIQUE (poliza_id, nombre)
);

-- Índice para búsqueda por póliza
CREATE INDEX IF NOT EXISTS idx_niveles_ap_poliza ON polizas_aeronavegacion_niveles_ap(poliza_id);

-- Comentarios
COMMENT ON TABLE polizas_aeronavegacion_niveles_ap IS 'Niveles de Accidentes Personales para tripulantes y pasajeros de naves/aeronaves';
COMMENT ON COLUMN polizas_aeronavegacion_niveles_ap.nombre IS 'Nombre del nivel (Nivel 1, Nivel 2, etc.)';
COMMENT ON COLUMN polizas_aeronavegacion_niveles_ap.monto_muerte_accidental IS 'Monto de cobertura por muerte accidental';
COMMENT ON COLUMN polizas_aeronavegacion_niveles_ap.monto_invalidez IS 'Monto de cobertura por invalidez total o parcial';
COMMENT ON COLUMN polizas_aeronavegacion_niveles_ap.monto_gastos_medicos IS 'Monto de cobertura para gastos médicos';

-- ============================================
-- 2. TABLA: polizas_aeronavegacion_naves
-- Naves y embarcaciones aseguradas (1:N con póliza)
-- ============================================
CREATE TABLE IF NOT EXISTS polizas_aeronavegacion_naves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

    -- Datos de identificación
    matricula text NOT NULL, -- Matrícula de la nave (identificador único)
    marca text NOT NULL,
    modelo text NOT NULL,
    ano integer NOT NULL,
    serie text NOT NULL, -- Número de serie

    -- Características
    uso text NOT NULL CHECK (uso IN ('privado', 'publico', 'recreacion')),
    nro_pasajeros integer NOT NULL DEFAULT 0,
    nro_tripulantes integer NOT NULL DEFAULT 0,

    -- Valores asegurados
    valor_casco numeric(18,2) NOT NULL DEFAULT 0, -- Valor del casco
    valor_responsabilidad_civil numeric(18,2) NOT NULL DEFAULT 0, -- Responsabilidad civil
    nivel_ap_id uuid REFERENCES polizas_aeronavegacion_niveles_ap(id) ON DELETE SET NULL, -- Nivel de AP opcional

    -- Auditoría
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES profiles(id),
    updated_at timestamptz,
    updated_by uuid REFERENCES profiles(id),

    -- Restricción: matrícula única por póliza
    CONSTRAINT nave_matricula_unica_por_poliza UNIQUE (poliza_id, matricula)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_naves_poliza ON polizas_aeronavegacion_naves(poliza_id);
CREATE INDEX IF NOT EXISTS idx_naves_matricula ON polizas_aeronavegacion_naves(matricula);

-- Comentarios
COMMENT ON TABLE polizas_aeronavegacion_naves IS 'Naves y embarcaciones aseguradas en pólizas de aeronavegación';
COMMENT ON COLUMN polizas_aeronavegacion_naves.matricula IS 'Matrícula de registro de la nave o aeronave';
COMMENT ON COLUMN polizas_aeronavegacion_naves.uso IS 'Tipo de uso: privado, público o recreación';
COMMENT ON COLUMN polizas_aeronavegacion_naves.valor_casco IS 'Valor asegurado del casco de la nave';
COMMENT ON COLUMN polizas_aeronavegacion_naves.valor_responsabilidad_civil IS 'Valor asegurado para responsabilidad civil';
COMMENT ON COLUMN polizas_aeronavegacion_naves.nivel_ap_id IS 'Nivel de Accidentes Personales aplicable a tripulantes/pasajeros';

-- ============================================
-- 3. TABLA: polizas_aeronavegacion_asegurados
-- Asegurados adicionales (clientes registrados)
-- ============================================
CREATE TABLE IF NOT EXISTS polizas_aeronavegacion_asegurados (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES profiles(id),

    -- Restricción: un cliente solo puede estar una vez por póliza
    CONSTRAINT asegurado_aero_unico_por_poliza UNIQUE (poliza_id, client_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_asegurados_aero_poliza ON polizas_aeronavegacion_asegurados(poliza_id);
CREATE INDEX IF NOT EXISTS idx_asegurados_aero_client ON polizas_aeronavegacion_asegurados(client_id);

-- Comentarios
COMMENT ON TABLE polizas_aeronavegacion_asegurados IS 'Asegurados adicionales en pólizas de aeronavegación (clientes registrados)';
COMMENT ON COLUMN polizas_aeronavegacion_asegurados.client_id IS 'Referencia al cliente registrado en el sistema';

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE polizas_aeronavegacion_niveles_ap ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_aeronavegacion_naves ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_aeronavegacion_asegurados ENABLE ROW LEVEL SECURITY;

-- Políticas para niveles_ap
CREATE POLICY "Usuarios autenticados pueden ver niveles AP" ON polizas_aeronavegacion_niveles_ap
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar niveles AP" ON polizas_aeronavegacion_niveles_ap
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar niveles AP" ON polizas_aeronavegacion_niveles_ap
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar niveles AP" ON polizas_aeronavegacion_niveles_ap
    FOR DELETE TO authenticated USING (true);

-- Políticas para naves
CREATE POLICY "Usuarios autenticados pueden ver naves" ON polizas_aeronavegacion_naves
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar naves" ON polizas_aeronavegacion_naves
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar naves" ON polizas_aeronavegacion_naves
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar naves" ON polizas_aeronavegacion_naves
    FOR DELETE TO authenticated USING (true);

-- Políticas para asegurados
CREATE POLICY "Usuarios autenticados pueden ver asegurados aeronavegacion" ON polizas_aeronavegacion_asegurados
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar asegurados aeronavegacion" ON polizas_aeronavegacion_asegurados
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar asegurados aeronavegacion" ON polizas_aeronavegacion_asegurados
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar asegurados aeronavegacion" ON polizas_aeronavegacion_asegurados
    FOR DELETE TO authenticated USING (true);

-- ============================================
-- 5. TRIGGERS DE AUDITORÍA
-- ============================================

-- Trigger para updated_at en naves
CREATE OR REPLACE FUNCTION update_naves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_naves_updated_at
    BEFORE UPDATE ON polizas_aeronavegacion_naves
    FOR EACH ROW
    EXECUTE FUNCTION update_naves_updated_at();

-- ============================================
-- 6. VISTA PARA CONSULTAS
-- ============================================
CREATE OR REPLACE VIEW polizas_aeronavegacion_vista AS
SELECT
    n.id,
    n.poliza_id,
    n.matricula,
    n.marca,
    n.modelo,
    n.ano,
    n.serie,
    n.uso,
    n.nro_pasajeros,
    n.nro_tripulantes,
    n.valor_casco,
    n.valor_responsabilidad_civil,
    n.nivel_ap_id,
    nap.nombre as nivel_ap_nombre,
    nap.monto_muerte_accidental,
    nap.monto_invalidez,
    nap.monto_gastos_medicos,
    n.created_at,
    n.updated_at,
    p.numero_poliza,
    p.ramo
FROM polizas_aeronavegacion_naves n
LEFT JOIN polizas_aeronavegacion_niveles_ap nap ON n.nivel_ap_id = nap.id
LEFT JOIN polizas p ON n.poliza_id = p.id;

COMMENT ON VIEW polizas_aeronavegacion_vista IS 'Vista consolidada de naves/embarcaciones con niveles de AP y datos de póliza';

-- ============================================
-- RESUMEN DE CAMBIOS
-- ============================================
-- 1. polizas_aeronavegacion_niveles_ap: Niveles de AP configurables por póliza
-- 2. polizas_aeronavegacion_naves: Naves/embarcaciones con valores de casco, RC y AP
-- 3. polizas_aeronavegacion_asegurados: Asegurados adicionales (clientes registrados)
-- 4. RLS habilitado en todas las tablas
-- 5. Triggers de auditoría para updated_at
-- 6. Vista consolidada para consultas
