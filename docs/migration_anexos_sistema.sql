-- ============================================
-- MIGRATION: Sistema de Anexos para Pólizas
-- ============================================
-- Ejecutar manualmente en Supabase SQL Editor
-- Este script crea todas las tablas necesarias para el sistema de anexos
-- ============================================

-- ============================================
-- 1. AGREGAR 'anulada' AL CONSTRAINT DE ESTADO
-- ============================================

ALTER TABLE polizas DROP CONSTRAINT IF EXISTS polizas_estado_check;
ALTER TABLE polizas ADD CONSTRAINT polizas_estado_check CHECK (estado = ANY (ARRAY[
  'pendiente'::text, 'activa'::text, 'vencida'::text, 'cancelada'::text,
  'renovada'::text, 'rechazada'::text, 'anulada'::text
]));

-- ============================================
-- 2. TABLA PRINCIPAL: polizas_anexos
-- ============================================

CREATE TABLE IF NOT EXISTS polizas_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE RESTRICT,
  numero_anexo text NOT NULL,
  tipo_anexo text NOT NULL CHECK (tipo_anexo IN ('inclusion', 'exclusion', 'anulacion')),
  fecha_anexo date NOT NULL DEFAULT CURRENT_DATE,
  fecha_efectiva date NOT NULL,
  observaciones text,
  -- Estado y validación gerencial
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'activo', 'rechazado')),
  validado_por uuid REFERENCES profiles(id),
  fecha_validacion timestamptz,
  motivo_rechazo text,
  rechazado_por uuid REFERENCES profiles(id),
  fecha_rechazo timestamptz,
  -- Auditoría
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id)
);

-- Índice único: no puede haber dos anexos con el mismo número en la misma póliza
CREATE UNIQUE INDEX IF NOT EXISTS idx_polizas_anexos_numero
  ON polizas_anexos(poliza_id, numero_anexo);

-- Índice parcial: máximo 1 anulación activa o pendiente por póliza
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_anulacion_per_poliza
  ON polizas_anexos(poliza_id)
  WHERE tipo_anexo = 'anulacion' AND estado IN ('pendiente', 'activo');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_polizas_anexos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_polizas_anexos_updated_at ON polizas_anexos;
CREATE TRIGGER trigger_polizas_anexos_updated_at
  BEFORE UPDATE ON polizas_anexos
  FOR EACH ROW EXECUTE FUNCTION update_polizas_anexos_updated_at();

-- ============================================
-- 3. TABLA: polizas_anexos_pagos (cuotas delta)
-- ============================================

CREATE TABLE IF NOT EXISTS polizas_anexos_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  cuota_original_id uuid REFERENCES polizas_pagos(id), -- NULL para vigencia_corrida
  tipo text NOT NULL DEFAULT 'ajuste'
    CHECK (tipo IN ('ajuste', 'vigencia_corrida')),
  numero_cuota integer,
  monto numeric NOT NULL, -- positivo=inclusión, negativo=exclusión
  fecha_vencimiento date,
  estado text DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagado', 'vencido')),
  observaciones text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. TABLA: polizas_anexos_documentos
-- ============================================

CREATE TABLE IF NOT EXISTS polizas_anexos_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,
  nombre_archivo text NOT NULL,
  archivo_url text NOT NULL,
  tamano_bytes bigint,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id),
  estado varchar DEFAULT 'activo'
);

-- ============================================
-- 5. TABLAS ESPEJO POR RAMO
-- ============================================

-- 5a. AUTOMOTOR - Vehículos incluidos/excluidos
CREATE TABLE IF NOT EXISTS polizas_anexos_automotor_vehiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('inclusion', 'exclusion')),
  original_item_id uuid REFERENCES polizas_automotor_vehiculos(id), -- para exclusiones
  -- Campos espejo de polizas_automotor_vehiculos
  placa text NOT NULL,
  valor_asegurado numeric NOT NULL,
  franquicia numeric NOT NULL,
  nro_chasis text NOT NULL,
  uso text NOT NULL,
  coaseguro numeric NOT NULL DEFAULT 0,
  tipo_vehiculo_id uuid,
  marca_id uuid,
  modelo text,
  ano integer,
  color text,
  ejes integer,
  nro_motor text,
  nro_asientos integer,
  plaza_circulacion text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- 5b. SALUD - Asegurados incluidos/excluidos
CREATE TABLE IF NOT EXISTS polizas_anexos_salud_asegurados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('inclusion', 'exclusion')),
  original_item_id uuid REFERENCES polizas_salud_asegurados(id),
  -- Campos espejo
  client_id uuid NOT NULL,
  nivel_id text NOT NULL,
  rol text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- 5c. SALUD - Beneficiarios incluidos/excluidos
CREATE TABLE IF NOT EXISTS polizas_anexos_salud_beneficiarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('inclusion', 'exclusion')),
  original_item_id uuid REFERENCES polizas_salud_beneficiarios(id),
  -- Campos espejo
  nombre_completo text NOT NULL,
  carnet text NOT NULL,
  fecha_nacimiento date NOT NULL,
  genero text NOT NULL,
  nivel_id text NOT NULL,
  rol text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- 5d. RAMOS TÉCNICOS - Equipos incluidos/excluidos
CREATE TABLE IF NOT EXISTS polizas_anexos_ramos_tecnicos_equipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('inclusion', 'exclusion')),
  original_item_id uuid REFERENCES polizas_ramos_tecnicos_equipos(id),
  -- Campos espejo
  nro_serie text NOT NULL,
  valor_asegurado numeric NOT NULL,
  franquicia numeric NOT NULL,
  nro_chasis text NOT NULL,
  uso text NOT NULL,
  coaseguro numeric NOT NULL DEFAULT 0,
  placa text,
  tipo_equipo_id uuid,
  marca_equipo_id uuid,
  modelo text,
  ano integer,
  color text,
  nro_motor text,
  plaza_circulacion text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- 5e. AERONAVEGACIÓN - Naves incluidas/excluidas
CREATE TABLE IF NOT EXISTS polizas_anexos_aeronavegacion_naves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('inclusion', 'exclusion')),
  original_item_id uuid REFERENCES polizas_aeronavegacion_naves(id),
  -- Campos espejo
  matricula text NOT NULL,
  marca text NOT NULL,
  modelo text NOT NULL,
  ano integer NOT NULL,
  serie text NOT NULL,
  uso text NOT NULL,
  nro_pasajeros integer NOT NULL,
  nro_tripulantes integer NOT NULL,
  valor_casco numeric NOT NULL,
  valor_responsabilidad_civil numeric NOT NULL,
  nivel_ap_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- 5f. INCENDIO - Bienes incluidos/excluidos (items como JSONB dentro)
CREATE TABLE IF NOT EXISTS polizas_anexos_incendio_bienes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('inclusion', 'exclusion')),
  original_item_id uuid REFERENCES polizas_incendio_bienes(id),
  -- Campos espejo
  direccion text NOT NULL,
  valor_total_declarado numeric NOT NULL,
  es_primer_riesgo boolean NOT NULL DEFAULT false,
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{nombre, monto}]
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- 5g. RIESGOS VARIOS - Bienes incluidos/excluidos (items como JSONB dentro)
CREATE TABLE IF NOT EXISTS polizas_anexos_riesgos_varios_bienes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('inclusion', 'exclusion')),
  original_item_id uuid REFERENCES polizas_riesgos_varios_bienes(id),
  -- Campos espejo
  direccion text NOT NULL,
  valor_total_declarado numeric NOT NULL,
  es_primer_riesgo boolean NOT NULL DEFAULT false,
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{nombre, monto}]
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- 5h. VIDA/SEPELIO/AP - Asegurados con nivel incluidos/excluidos
CREATE TABLE IF NOT EXISTS polizas_anexos_asegurados_nivel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES polizas_anexos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('inclusion', 'exclusion')),
  original_item_id uuid REFERENCES polizas_asegurados_nivel(id),
  -- Campos espejo
  client_id uuid NOT NULL,
  nivel_id uuid NOT NULL,
  cargo text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- ============================================
-- 6. RLS POLICIES
-- ============================================

ALTER TABLE polizas_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_automotor_vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_salud_asegurados ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_salud_beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_ramos_tecnicos_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_aeronavegacion_naves ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_incendio_bienes ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_riesgos_varios_bienes ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_anexos_asegurados_nivel ENABLE ROW LEVEL SECURITY;

-- Política genérica: usuarios autenticados pueden leer y escribir
-- (el filtrado por equipo se hace a nivel de aplicación con getDataScopeFilter)

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'polizas_anexos',
    'polizas_anexos_pagos',
    'polizas_anexos_documentos',
    'polizas_anexos_automotor_vehiculos',
    'polizas_anexos_salud_asegurados',
    'polizas_anexos_salud_beneficiarios',
    'polizas_anexos_ramos_tecnicos_equipos',
    'polizas_anexos_aeronavegacion_naves',
    'polizas_anexos_incendio_bienes',
    'polizas_anexos_riesgos_varios_bienes',
    'polizas_anexos_asegurados_nivel'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON %I;
      CREATE POLICY %I ON %I
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    ',
      'allow_authenticated_' || tbl, tbl,
      'allow_authenticated_' || tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================
-- 7. COMENTARIOS
-- ============================================

COMMENT ON TABLE polizas_anexos IS 'Anexos (endorsements) de pólizas: inclusiones, exclusiones y anulaciones';
COMMENT ON COLUMN polizas_anexos.tipo_anexo IS 'Tipo: inclusion (agrega bienes/beneficiarios), exclusion (quita), anulacion (cancela póliza)';
COMMENT ON COLUMN polizas_anexos.estado IS 'Estado del anexo: pendiente (requiere validación), activo (validado), rechazado';
COMMENT ON TABLE polizas_anexos_pagos IS 'Cuotas delta generadas por anexos. monto positivo=inclusión, negativo=exclusión';
COMMENT ON COLUMN polizas_anexos_pagos.cuota_original_id IS 'Referencia a la cuota original que se ajusta. NULL para vigencia_corrida';
COMMENT ON COLUMN polizas_anexos_pagos.tipo IS 'ajuste=delta sobre cuota existente, vigencia_corrida=cobro proporcional por anulación';
