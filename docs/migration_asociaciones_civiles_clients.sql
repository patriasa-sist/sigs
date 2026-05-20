-- ============================================================
-- MIGRACIÓN: Tipo de cliente ASOCIACIÓN CIVIL
-- Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

-- 1. Actualizar constraint de client_type en la tabla clients
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_client_type_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('natural', 'juridica', 'unipersonal', 'ong', 'club', 'asociacion_civil'));

-- 2. Crear tabla asociacion_civil_clients
CREATE TABLE IF NOT EXISTS asociacion_civil_clients (
  client_id             uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,

  -- Identificación
  nombre_asociacion     varchar(255) NOT NULL,
  sigla                 varchar(50),
  tipo_asociacion       varchar(50)  NOT NULL,
  rubro_actividad       varchar(255) NOT NULL,
  nit                   varchar(50),

  -- Personería jurídica (identificador legal único)
  numero_personeria_juridica   varchar(100) NOT NULL,
  entidad_otorgante_personeria varchar(255) NOT NULL,

  -- Contacto
  direccion             varchar(500) NOT NULL,
  correo_electronico    varchar(255),
  telefono              varchar(50),

  -- Representante legal
  nombre_representante       varchar(100) NOT NULL,
  apellido_representante     varchar(100) NOT NULL,
  cargo_representante        varchar(100) NOT NULL,
  ci_representante           varchar(50)  NOT NULL,
  extension_ci_representante varchar(10),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints de valores permitidos
  CONSTRAINT asociacion_civil_clients_tipo_check CHECK (
    tipo_asociacion IN (
      'sociedad_profesional', 'asociacion_gremial', 'fundacion', 'otra'
    )
  )
);

-- 3. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_asociacion_civil_clients_nombre
  ON asociacion_civil_clients(nombre_asociacion);

CREATE INDEX IF NOT EXISTS idx_asociacion_civil_clients_sigla
  ON asociacion_civil_clients(sigla)
  WHERE sigla IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asociacion_civil_clients_rubro
  ON asociacion_civil_clients(rubro_actividad);

CREATE INDEX IF NOT EXISTS idx_asociacion_civil_clients_tipo
  ON asociacion_civil_clients(tipo_asociacion);

-- 3.b Reglas de unicidad para evitar asociaciones duplicadas
--   - NIT único cuando está presente
--   - Composite único: nº de personería sólo es único dentro de la entidad otorgante
CREATE UNIQUE INDEX IF NOT EXISTS uq_asociacion_civil_clients_nit
  ON asociacion_civil_clients(nit)
  WHERE nit IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_asociacion_civil_clients_personeria
  ON asociacion_civil_clients(entidad_otorgante_personeria, numero_personeria_juridica);

-- 4. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_asociacion_civil_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asociacion_civil_clients_updated_at
  BEFORE UPDATE ON asociacion_civil_clients
  FOR EACH ROW EXECUTE FUNCTION update_asociacion_civil_clients_updated_at();

-- 5. Habilitar RLS
ALTER TABLE asociacion_civil_clients ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS (misma lógica que las demás tablas de clientes)
CREATE POLICY "asociacion_civil_clients_select"
  ON asociacion_civil_clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "asociacion_civil_clients_insert"
  ON asociacion_civil_clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "asociacion_civil_clients_update"
  ON asociacion_civil_clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- La eliminación se maneja eliminando el registro en clients (ON DELETE CASCADE)
