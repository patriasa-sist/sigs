-- =====================================================
-- MIGRACIÓN: Tablas para datos específicos de ramos
-- Fecha: 2026-03-01
-- Descripción: Crea tablas normalizadas para persistir
-- los datos específicos de todos los ramos que faltan.
-- =====================================================

-- =====================================================
-- 1. INCENDIO Y ALIADOS (bienes + items + asegurados)
-- =====================================================

CREATE TABLE polizas_incendio_bienes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    direccion text NOT NULL,
    valor_total_declarado numeric NOT NULL DEFAULT 0,
    es_primer_riesgo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE polizas_incendio_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bien_id uuid NOT NULL REFERENCES polizas_incendio_bienes(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    monto numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE polizas_incendio_asegurados (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    client_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_incendio_bienes_poliza ON polizas_incendio_bienes(poliza_id);
CREATE INDEX idx_incendio_items_bien ON polizas_incendio_items(bien_id);
CREATE INDEX idx_incendio_asegurados_poliza ON polizas_incendio_asegurados(poliza_id);

-- RLS
ALTER TABLE polizas_incendio_bienes ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_incendio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_incendio_asegurados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read" ON polizas_incendio_bienes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_incendio_bienes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_incendio_bienes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_incendio_bienes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON polizas_incendio_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_incendio_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_incendio_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_incendio_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON polizas_incendio_asegurados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_incendio_asegurados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_incendio_asegurados FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_incendio_asegurados FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 2. RIESGOS VARIOS MISCELÁNEOS (bienes + items + asegurados)
-- =====================================================

CREATE TABLE polizas_riesgos_varios_bienes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    direccion text NOT NULL,
    valor_total_declarado numeric NOT NULL DEFAULT 0,
    es_primer_riesgo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE polizas_riesgos_varios_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bien_id uuid NOT NULL REFERENCES polizas_riesgos_varios_bienes(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    monto numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE polizas_riesgos_varios_asegurados (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    client_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_rv_bienes_poliza ON polizas_riesgos_varios_bienes(poliza_id);
CREATE INDEX idx_rv_items_bien ON polizas_riesgos_varios_items(bien_id);
CREATE INDEX idx_rv_asegurados_poliza ON polizas_riesgos_varios_asegurados(poliza_id);

-- RLS
ALTER TABLE polizas_riesgos_varios_bienes ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_riesgos_varios_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_riesgos_varios_asegurados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read" ON polizas_riesgos_varios_bienes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_riesgos_varios_bienes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_riesgos_varios_bienes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_riesgos_varios_bienes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON polizas_riesgos_varios_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_riesgos_varios_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_riesgos_varios_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_riesgos_varios_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON polizas_riesgos_varios_asegurados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_riesgos_varios_asegurados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_riesgos_varios_asegurados FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_riesgos_varios_asegurados FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 3. RESPONSABILIDAD CIVIL (datos simples)
-- =====================================================

CREATE TABLE polizas_responsabilidad_civil (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    tipo_poliza text NOT NULL DEFAULT 'individual',
    valor_asegurado numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rc_poliza ON polizas_responsabilidad_civil(poliza_id);

ALTER TABLE polizas_responsabilidad_civil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read" ON polizas_responsabilidad_civil FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_responsabilidad_civil FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_responsabilidad_civil FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_responsabilidad_civil FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 4. NIVELES COMPARTIDOS (Vida, Sepelio, Accidentes Personales)
-- Tabla genérica reutilizable para los 3 ramos con niveles
-- =====================================================

CREATE TABLE polizas_niveles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    prima_nivel numeric NULL, -- Solo usado por Accidentes Personales
    coberturas jsonb NOT NULL DEFAULT '{}', -- Estructura varía por ramo
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN polizas_niveles.coberturas IS 'JSONB con coberturas específicas del ramo. AP: {muerte_accidental, invalidez_total_parcial, gastos_medicos, sepelio}. Vida: {muerte, dima, sepelio, gastos_medicos, indm_enfermedades_graves}. Sepelio: {sepelio}. Cada cobertura: {habilitado: bool, valor: number}';

CREATE TABLE polizas_asegurados_nivel (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    client_id uuid NOT NULL,
    nivel_id uuid NOT NULL REFERENCES polizas_niveles(id) ON DELETE CASCADE,
    cargo text NULL, -- Solo usado por Accidentes Personales corporativo
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_niveles_poliza ON polizas_niveles(poliza_id);
CREATE INDEX idx_asegurados_nivel_poliza ON polizas_asegurados_nivel(poliza_id);
CREATE INDEX idx_asegurados_nivel_nivel ON polizas_asegurados_nivel(nivel_id);

-- RLS
ALTER TABLE polizas_niveles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_asegurados_nivel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read" ON polizas_niveles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_niveles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_niveles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_niveles FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON polizas_asegurados_nivel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_asegurados_nivel FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_asegurados_nivel FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_asegurados_nivel FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 5. SALUD - Tablas complementarias (niveles + asegurados_ramo)
-- La tabla polizas_salud_beneficiarios ya existe
-- =====================================================

CREATE TABLE polizas_salud_niveles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    monto numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE polizas_salud_asegurados (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    client_id uuid NOT NULL,
    nivel_id text NOT NULL, -- Referencia al nivel (texto, UUID del cliente)
    rol text NOT NULL, -- 'contratante' o 'titular'
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_salud_niveles_poliza ON polizas_salud_niveles(poliza_id);
CREATE INDEX idx_salud_asegurados_poliza ON polizas_salud_asegurados(poliza_id);

-- RLS
ALTER TABLE polizas_salud_niveles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_salud_asegurados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read" ON polizas_salud_niveles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_salud_niveles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_salud_niveles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_salud_niveles FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON polizas_salud_asegurados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON polizas_salud_asegurados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON polizas_salud_asegurados FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON polizas_salud_asegurados FOR DELETE TO authenticated USING (true);
