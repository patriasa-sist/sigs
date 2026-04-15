-- =============================================
-- MIGRACIÓN: Módulo Recursos Humanos (RRHH)
-- Ejecutar manualmente en Supabase SQL Editor
-- =============================================

-- -----------------------------------------------
-- 1. Agregar rol 'rrhh' al constraint de profiles
-- -----------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'admin', 'usuario', 'agente', 'comercial', 'cobranza',
    'siniestros', 'invitado', 'desactivado', 'uif', 'rrhh'
  ]));

-- -----------------------------------------------
-- 2. Tabla principal de empleados
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación personal
  nombres                      TEXT NOT NULL,
  apellidos                    TEXT NOT NULL,
  tipo_documento               TEXT NOT NULL DEFAULT 'cedula'
                                 CHECK (tipo_documento IN ('cedula', 'pasaporte', 'rnu')),
  extension                    TEXT,
  nro_documento                TEXT NOT NULL,
  complemento                  TEXT,
  nro_nua_cua                  TEXT,
  nit                          TEXT,
  fecha_nacimiento             DATE NOT NULL,
  genero                       TEXT NOT NULL CHECK (genero IN ('M', 'F')),
  nacionalidad                 TEXT NOT NULL DEFAULT 'boliviana',
  estado_civil                 TEXT CHECK (estado_civil IN (
                                 'soltero', 'casado', 'union_libre', 'divorciado', 'viudo'
                               )),
  nombre_conyuge               TEXT,

  -- Dirección domicilio
  av_calle_pasaje              TEXT,
  zona_barrio                  TEXT,
  urbanizacion_condominio      TEXT,
  edif_bloque_piso             TEXT,
  casilla                      TEXT,
  referencia_direccion         TEXT,
  departamento                 TEXT,
  pais                         TEXT DEFAULT 'Bolivia',
  lat                          DECIMAL(10, 8),
  lng                          DECIMAL(11, 8),
  croquis_url                  TEXT,

  -- Contacto
  telefono                     TEXT,
  email                        TEXT,

  -- Datos de contratación
  fecha_ingreso                DATE NOT NULL,
  cargo                        TEXT NOT NULL,
  haber_basico                 DECIMAL(12, 2),
  area_solicitante             TEXT,
  medio_comunicacion           TEXT,
  medio_comunicacion_desc      TEXT,
  entrevistado_por_nombre      TEXT,
  entrevistado_por_cargo       TEXT,
  entrevistado_fecha           DATE,
  aprobado_por_nombre          TEXT,
  aprobado_por_cargo           TEXT,
  aprobado_fecha               DATE,

  -- Estado laboral
  activo                       BOOLEAN NOT NULL DEFAULT true,
  fecha_egreso                 DATE,
  motivo_egreso                TEXT,

  -- Auditoría
  created_by                   UUID REFERENCES profiles(id),
  updated_by                   UUID REFERENCES profiles(id),
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------
-- 3. Referencias familiares (máx. 2 por empleado)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS employee_family_refs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  orden            INT  NOT NULL CHECK (orden IN (1, 2)),
  nombres_apellidos TEXT NOT NULL,
  telefono         TEXT,
  parentesco       TEXT,
  UNIQUE (employee_id, orden)
);

-- -----------------------------------------------
-- 4. Estado patrimonial (cabecera)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS employee_patrimony (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  disponible       DECIMAL(15, 2) DEFAULT 0,
  lugar_fecha      TEXT,
  fecha_declaracion DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id)
);

-- -----------------------------------------------
-- 5. Ítems patrimoniales (inmuebles, vehículos, otros, deudas)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS employee_patrimony_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrimony_id    UUID NOT NULL REFERENCES employee_patrimony(id) ON DELETE CASCADE,
  categoria       TEXT NOT NULL CHECK (categoria IN ('inmueble', 'vehiculo', 'otro_bien', 'deuda')),
  -- Inmuebles
  descripcion     TEXT,
  ubicacion       TEXT,
  -- Vehículos
  modelo_marca    TEXT,
  placa           TEXT,
  -- Deudas
  entidad         TEXT,
  tipo_deuda      TEXT,
  fecha_vencimiento DATE,
  -- Común
  valor           DECIMAL(15, 2) DEFAULT 0,
  orden           INT DEFAULT 0
);

-- -----------------------------------------------
-- 6. Checklist de documentos (JSONB flexible)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS employee_checklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  items       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES profiles(id),
  UNIQUE (employee_id)
);

-- -----------------------------------------------
-- 7. Documentos digitalizados del empleado
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS employee_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  archivo_url    TEXT NOT NULL,
  tamano_bytes   INT,
  estado         TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'descartado')),
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------
-- 8. Trigger updated_at para employees y patrimony
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER employee_patrimony_updated_at
  BEFORE UPDATE ON employee_patrimony
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------
-- 9. RLS Policies
-- -----------------------------------------------
ALTER TABLE employees               ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_family_refs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_patrimony      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_patrimony_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_checklist      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents      ENABLE ROW LEVEL SECURITY;

-- Helper: solo admin y rrhh acceden
CREATE POLICY "employees_rrhh_all" ON employees
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ));

CREATE POLICY "employee_family_refs_rrhh_all" ON employee_family_refs
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ));

CREATE POLICY "employee_patrimony_rrhh_all" ON employee_patrimony
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ));

CREATE POLICY "employee_patrimony_items_rrhh_all" ON employee_patrimony_items
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ));

CREATE POLICY "employee_checklist_rrhh_all" ON employee_checklist
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ));

CREATE POLICY "employee_documents_rrhh_select" ON employee_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ));

CREATE POLICY "employee_documents_rrhh_insert" ON employee_documents
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ));

CREATE POLICY "employee_documents_rrhh_update" ON employee_documents
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh')
  ));

-- Solo admin puede eliminar documentos físicamente
CREATE POLICY "employee_documents_admin_delete" ON employee_documents
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- -----------------------------------------------
-- 10. Permisos del sistema
-- -----------------------------------------------
INSERT INTO permissions (id, module, action, description) VALUES
  ('rrhh.ver',        'rrhh', 'ver',        'Ver lista y detalles de empleados'),
  ('rrhh.crear',      'rrhh', 'crear',       'Registrar nuevos empleados'),
  ('rrhh.editar',     'rrhh', 'editar',      'Editar datos de empleados y checklist'),
  ('rrhh.documentos', 'rrhh', 'documentos',  'Gestionar documentos de empleados')
ON CONFLICT (id) DO NOTHING;

-- Permisos del rol 'rrhh'
INSERT INTO role_permissions (role, permission_id) VALUES
  ('rrhh', 'rrhh.ver'),
  ('rrhh', 'rrhh.crear'),
  ('rrhh', 'rrhh.editar'),
  ('rrhh', 'rrhh.documentos')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------
-- 11. Storage bucket rrhh-documentos (privado)
-- -----------------------------------------------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('rrhh-documentos', 'rrhh-documentos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rrhh_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'rrhh-documentos' AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh'))
  );

CREATE POLICY "rrhh_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'rrhh-documentos' AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'rrhh'))
  );

CREATE POLICY "rrhh_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'rrhh-documentos' AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
