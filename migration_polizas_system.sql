-- ==========================================
-- MIGRATION: Sistema Completo de Pólizas
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Eliminar tablas antiguas
DROP TABLE IF EXISTS policies CASCADE;

-- ==========================================
-- 2. TABLAS DE CATÁLOGOS
-- ==========================================

-- Compañías Aseguradoras
CREATE TABLE companias_aseguradoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regionales de Patria (9 departamentos)
CREATE TABLE regionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  codigo TEXT UNIQUE, -- Ej: "LP", "SC", "CB"
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías (empresas, afiliaciones, asociaciones)
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de vehículos (Automotor)
CREATE TABLE tipos_vehiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE, -- moto, vagoneta, camioneta, camión
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marcas de vehículos (Automotor)
CREATE TABLE marcas_vehiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE, -- Toyota, Honda, Nissan
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. TABLA PRINCIPAL DE PÓLIZAS
-- ==========================================

CREATE TABLE polizas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Paso 1: Cliente/Asegurado
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  -- Paso 2: Datos básicos
  numero_poliza TEXT NOT NULL UNIQUE,
  compania_aseguradora_id UUID NOT NULL REFERENCES companias_aseguradoras(id),
  ramo TEXT NOT NULL, -- Referencia al nombre del ramo de tipos_seguros
  inicio_vigencia DATE NOT NULL,
  fin_vigencia DATE NOT NULL,
  fecha_emision_compania DATE NOT NULL,
  responsable_id UUID NOT NULL REFERENCES profiles(id),
  regional_id UUID NOT NULL REFERENCES regionales(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),

  -- Paso 4: Modalidad de pago
  modalidad_pago TEXT NOT NULL CHECK (modalidad_pago IN ('contado', 'credito')),
  prima_total DECIMAL(12,2) NOT NULL,
  moneda TEXT NOT NULL CHECK (moneda IN ('Bs', 'USD', 'USDT', 'UFV')),
  prima_neta DECIMAL(12,2) GENERATED ALWAYS AS (prima_total * 0.87) STORED,
  comision DECIMAL(12,2) GENERATED ALWAYS AS ((prima_total * 0.87) * 0.02) STORED,

  -- Metadatos
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'vencida', 'cancelada', 'renovada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT vigencia_valida CHECK (fin_vigencia > inicio_vigencia),
  CONSTRAINT emision_antes_inicio CHECK (fecha_emision_compania <= inicio_vigencia)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_polizas_client ON polizas(client_id);
CREATE INDEX idx_polizas_numero ON polizas(numero_poliza);
CREATE INDEX idx_polizas_vigencia ON polizas(fin_vigencia);
CREATE INDEX idx_polizas_responsable ON polizas(responsable_id);
CREATE INDEX idx_polizas_estado ON polizas(estado);

-- ==========================================
-- 4. TABLA DE PAGOS/CUOTAS
-- ==========================================

CREATE TABLE polizas_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

  numero_cuota INTEGER NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'parcial')),
  observaciones TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT cuota_poliza_unica UNIQUE (poliza_id, numero_cuota),
  CONSTRAINT numero_cuota_valido CHECK (numero_cuota > 0),
  CONSTRAINT monto_positivo CHECK (monto > 0)
);

CREATE INDEX idx_pagos_poliza ON polizas_pagos(poliza_id);
CREATE INDEX idx_pagos_fecha ON polizas_pagos(fecha_vencimiento);
CREATE INDEX idx_pagos_estado ON polizas_pagos(estado);

-- ==========================================
-- 5. TABLA DE DOCUMENTOS
-- ==========================================

CREATE TABLE polizas_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

  tipo_documento TEXT NOT NULL, -- "Póliza firmada", "CI asegurado", "Tarjeta propiedad"
  nombre_archivo TEXT NOT NULL,
  archivo_url TEXT NOT NULL,
  tamano_bytes BIGINT,

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_documentos_poliza ON polizas_documentos(poliza_id);

-- ==========================================
-- 6. AUTOMOTOR - VEHÍCULOS (Relación 1:N)
-- ==========================================

CREATE TABLE polizas_automotor_vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

  -- Campos obligatorios
  placa TEXT NOT NULL,
  valor_asegurado DECIMAL(12,2) NOT NULL,
  franquicia DECIMAL(12,2) NOT NULL,
  nro_chasis TEXT NOT NULL,
  uso TEXT NOT NULL CHECK (uso IN ('publico', 'particular')),

  -- Campos opcionales
  tipo_vehiculo_id UUID REFERENCES tipos_vehiculo(id),
  marca_id UUID REFERENCES marcas_vehiculo(id),
  modelo TEXT,
  ano TEXT,
  color TEXT,
  ejes INTEGER,
  nro_motor TEXT,
  nro_asientos INTEGER,
  plaza_circulacion TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Placa única dentro de la misma póliza
  CONSTRAINT placa_unica_por_poliza UNIQUE (poliza_id, placa),
  CONSTRAINT valor_positivo CHECK (valor_asegurado > 0),
  CONSTRAINT franquicia_positiva CHECK (franquicia >= 0),
  CONSTRAINT ejes_validos CHECK (ejes IS NULL OR ejes > 0),
  CONSTRAINT asientos_validos CHECK (nro_asientos IS NULL OR nro_asientos > 0)
);

CREATE INDEX idx_automotor_poliza ON polizas_automotor_vehiculos(poliza_id);
CREATE INDEX idx_automotor_placa ON polizas_automotor_vehiculos(placa);

-- ==========================================
-- 7. TRIGGERS PARA updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_polizas_updated_at
  BEFORE UPDATE ON polizas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagos_updated_at
  BEFORE UPDATE ON polizas_pagos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 8. DATOS INICIALES DE CATÁLOGOS
-- ==========================================

-- Regionales (9 departamentos de Bolivia)
INSERT INTO regionales (nombre, codigo) VALUES
  ('La Paz', 'LP'),
  ('Santa Cruz', 'SC'),
  ('Cochabamba', 'CB'),
  ('Oruro', 'OR'),
  ('Potosí', 'PT'),
  ('Tarija', 'TJ'),
  ('Chuquisaca', 'CH'),
  ('Beni', 'BN'),
  ('Pando', 'PD');

-- Tipos de vehículos comunes
INSERT INTO tipos_vehiculo (nombre) VALUES
  ('Moto'),
  ('Vagoneta'),
  ('Camioneta'),
  ('Camión'),
  ('Automóvil'),
  ('Jeep'),
  ('Minibús'),
  ('Bus'),
  ('Trailer');

-- Marcas de vehículos comunes
INSERT INTO marcas_vehiculo (nombre) VALUES
  ('Toyota'),
  ('Honda'),
  ('Nissan'),
  ('Mazda'),
  ('Hyundai'),
  ('Kia'),
  ('Chevrolet'),
  ('Ford'),
  ('Volkswagen'),
  ('Suzuki'),
  ('Mitsubishi');

-- Compañías aseguradoras (ejemplos - ajustar según necesidad)
INSERT INTO companias_aseguradoras (nombre) VALUES
  ('ALIANZA SEGUROS S.A.'),
  ('ALIANZA VIDA SEGUROS Y REASEGUROS S.A.'),
  ('BISA SEGUROS Y REASEGUROS S.A.'),
  ('COMPAÑÍA DE SEGUROS DE VIDA FORTALEZA S.A.'),
  ('COMPAÑÍA DE SEGUROS Y REASEGUROS FORTALEZA S.A.'),
  ('CREDINFORM INTERNATIONAL S.A.'),
  ('CREDISEGURO S.A. SEGUROS GENERALES'),
  ('CREDISEGURO S.A. SEGUROS PERSONALES'),
  ('LA BOLIVIANA CIACRUZ DE SEGUROS Y REASEGUROS S.A.'),
  ('LA BOLIVIANA CIACRUZ DE SEGUROS PERSONALES S.A.'),
  ('LA VITALICIA SEGUROS Y REASEGUROS DE VIDA S.A.'),
  ('MERCANTIL SANTA CRUZ SEGUROS Y REASEGUROS GENERALES S.A.'),
  ('NACIONAL SEGUROS PATRIMONIALES Y FIANZAS S.A.'),
  ('NACIONAL SEGUROS VIDA Y SALUD S.A.'),
  ('UNIVIDA S.A.'),
  ('SEGUROS ILLIMANI S.A.'),
  ('UNIBIENES SEGUROS Y REASEGUROS PATRIMONIALES S.A.'),


-- Categorías iniciales (desde categories.ts)
INSERT INTO categorias (nombre) VALUES
  ('Grupo la Fuente'),
  ('Grupo Esperanza'),
  ('Grupo Roda'),
  ('Asociación 1ro de Mayo'),
  ('Asociación Mineros');

-- ==========================================
-- 9. COMENTARIOS PARA DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE polizas IS 'Tabla principal de pólizas con datos base comunes a todos los ramos';
COMMENT ON TABLE polizas_automotor_vehiculos IS 'Vehículos asegurados en pólizas de ramo Automotor (relación 1:N)';
COMMENT ON TABLE polizas_pagos IS 'Cuotas de pago de pólizas (contado o crédito)';
COMMENT ON TABLE polizas_documentos IS 'Documentos digitalizados asociados a pólizas';

-- ==========================================
-- FIN DE LA MIGRACIÓN
-- ==========================================
