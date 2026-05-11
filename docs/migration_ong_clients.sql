-- ============================================================
-- MIGRACIÓN: Tipo de cliente ONG
-- Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

-- 1. Actualizar constraint de client_type en la tabla clients
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_client_type_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('natural', 'juridica', 'unipersonal', 'ong'));

-- 2. Crear tabla ong_clients
CREATE TABLE IF NOT EXISTS ong_clients (
  client_id             uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,

  -- Identificación
  nombre_ong            varchar(255) NOT NULL,
  sigla                 varchar(50),
  nit                   varchar(50),
  numero_registro_vipfe varchar(100),
  pais_origen           varchar(100) NOT NULL DEFAULT 'BOLIVIA',
  actividad_principal   text,

  -- Contacto
  direccion             varchar(500) NOT NULL,
  correo_electronico    varchar(255),
  telefono              varchar(50),

  -- Representante legal / MAE
  nombre_representante      varchar(100) NOT NULL,
  apellido_representante    varchar(100) NOT NULL,
  cargo_representante       varchar(100) NOT NULL,
  ci_representante          varchar(50)  NOT NULL,
  extension_ci_representante varchar(10),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_ong_clients_nombre
  ON ong_clients(nombre_ong);

CREATE INDEX IF NOT EXISTS idx_ong_clients_sigla
  ON ong_clients(sigla)
  WHERE sigla IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ong_clients_nit
  ON ong_clients(nit)
  WHERE nit IS NOT NULL;

-- 4. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_ong_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ong_clients_updated_at
  BEFORE UPDATE ON ong_clients
  FOR EACH ROW EXECUTE FUNCTION update_ong_clients_updated_at();

-- 5. Habilitar RLS
ALTER TABLE ong_clients ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS (misma lógica que las demás tablas de clientes)
-- Lectura: usuarios autenticados
CREATE POLICY "ong_clients_select"
  ON ong_clients FOR SELECT
  TO authenticated
  USING (true);

-- Inserción: usuarios autenticados
CREATE POLICY "ong_clients_insert"
  ON ong_clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actualización: usuarios autenticados
CREATE POLICY "ong_clients_update"
  ON ong_clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Eliminación: solo admin (vía la tabla clients con cascade)
-- La eliminación se maneja eliminando el registro en clients
