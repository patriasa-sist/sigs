-- ============================================================
-- MIGRACIÓN: Tipo de cliente CLUB DEPORTIVO
-- Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

-- 1. Actualizar constraint de client_type en la tabla clients
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_client_type_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('natural', 'juridica', 'unipersonal', 'ong', 'club'));

-- 2. Crear tabla club_clients
CREATE TABLE IF NOT EXISTS club_clients (
  client_id             uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,

  -- Identificación
  nombre_club           varchar(255) NOT NULL,
  sigla                 varchar(50),
  disciplina_principal  varchar(50)  NOT NULL,
  nit                   varchar(50),
  numero_registro_vipfe varchar(100),

  -- Acreditación de existencia legal
  tipo_registro         varchar(50)  NOT NULL,
  entidad_registro      varchar(255) NOT NULL,
  numero_registro       varchar(100) NOT NULL,

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
  CONSTRAINT club_clients_disciplina_check CHECK (
    disciplina_principal IN (
      'futbol', 'basquetbol', 'voleibol', 'tenis',
      'natacion', 'ciclismo', 'multiple', 'otra'
    )
  ),
  CONSTRAINT club_clients_tipo_registro_check CHECK (
    tipo_registro IN (
      'municipal', 'gobernacion', 'viceministerio_de_deportes', 'otra'
    )
  )
);

-- 3. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_club_clients_nombre
  ON club_clients(nombre_club);

CREATE INDEX IF NOT EXISTS idx_club_clients_sigla
  ON club_clients(sigla)
  WHERE sigla IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_club_clients_disciplina
  ON club_clients(disciplina_principal);

-- 3.b Reglas de unicidad para evitar clubes duplicados
--   - NIT único cuando está presente (los clubes formalizados no se repiten en SIN)
--   - Composite único: el número de registro solo tiene sentido dentro de la entidad emisora
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_clients_nit
  ON club_clients(nit)
  WHERE nit IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_club_clients_registro
  ON club_clients(tipo_registro, entidad_registro, numero_registro);

-- 4. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_club_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER club_clients_updated_at
  BEFORE UPDATE ON club_clients
  FOR EACH ROW EXECUTE FUNCTION update_club_clients_updated_at();

-- 5. Habilitar RLS
ALTER TABLE club_clients ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS (misma lógica que las demás tablas de clientes)
CREATE POLICY "club_clients_select"
  ON club_clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "club_clients_insert"
  ON club_clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "club_clients_update"
  ON club_clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- La eliminación se maneja eliminando el registro en clients (ON DELETE CASCADE)
