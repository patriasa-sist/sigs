-- ============================================
-- Migración: Agregar Soporte para Clientes Unipersonales
-- Fecha: 2025-12-24
-- Descripción: Agrega la tabla unipersonal_clients y actualiza
--              el CHECK constraint de clients.client_type
-- ============================================

-- 1. Actualizar CHECK constraint en clients.client_type para permitir 'unipersonal'
ALTER TABLE clients
DROP CONSTRAINT IF EXISTS clients_client_type_check;

ALTER TABLE clients
ADD CONSTRAINT clients_client_type_check
CHECK (client_type = ANY (ARRAY['natural'::character varying, 'juridica'::character varying, 'unipersonal'::character varying]::text[]));

COMMENT ON CONSTRAINT clients_client_type_check ON clients IS
'Permite tres tipos de clientes: natural (persona natural), juridica (empresa), unipersonal (empresa unipersonal)';

-- 2. Crear tabla unipersonal_clients
CREATE TABLE IF NOT EXISTS unipersonal_clients (
    -- Primary Key y Foreign Key
    client_id uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,

    -- Datos Comerciales (Sección 4)
    razon_social varchar(255) NOT NULL,
    nit varchar(50) NOT NULL UNIQUE CHECK (nit ~ '^[0-9]{7,}$'),
    matricula_comercio varchar(100) CHECK (matricula_comercio IS NULL OR length(matricula_comercio) >= 7),
    domicilio_comercial text NOT NULL,
    telefono_comercial varchar(20) NOT NULL CHECK (telefono_comercial ~ '^[0-9]{5,}$'),
    actividad_economica_comercial varchar(200) NOT NULL,
    nivel_ingresos numeric NOT NULL CHECK (nivel_ingresos > 0),
    correo_electronico_comercial varchar(255) NOT NULL CHECK (
        correo_electronico_comercial ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),

    -- Datos del Propietario (Sección 5)
    nombre_propietario varchar(200) NOT NULL,
    apellido_propietario varchar(200) NOT NULL,
    documento_propietario varchar(50) NOT NULL CHECK (length(documento_propietario) >= 7),
    extension_propietario varchar(5),
    nacionalidad_propietario varchar(100) NOT NULL,

    -- Representante Legal (Sección 6)
    nombre_representante varchar(200) NOT NULL,
    ci_representante varchar(50) NOT NULL CHECK (length(ci_representante) >= 7),
    extension_representante varchar(5),

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_unipersonal_clients_nit ON unipersonal_clients(nit);
CREATE INDEX IF NOT EXISTS idx_unipersonal_clients_razon_social ON unipersonal_clients(razon_social);

-- 4. Comentarios descriptivos
COMMENT ON TABLE unipersonal_clients IS
'Datos comerciales para clientes unipersonales (empresas unipersonales). Requiere entrada correspondiente en clients Y natural_clients.';

COMMENT ON COLUMN unipersonal_clients.client_id IS
'Referencia a clients.id - Cliente base';

COMMENT ON COLUMN unipersonal_clients.razon_social IS
'Razón social de la empresa unipersonal (normalizado, mayúsculas)';

COMMENT ON COLUMN unipersonal_clients.nit IS
'NIT único de la empresa (solo números, mínimo 7 dígitos)';

COMMENT ON COLUMN unipersonal_clients.matricula_comercio IS
'Matrícula de comercio (opcional, mínimo 7 caracteres)';

COMMENT ON COLUMN unipersonal_clients.nivel_ingresos IS
'Nivel de ingresos: 2000 (bajo), 5000 (medio), 10000 (alto)';

COMMENT ON COLUMN unipersonal_clients.correo_electronico_comercial IS
'Email comercial de la empresa (normalizado, validado)';

COMMENT ON COLUMN unipersonal_clients.nombre_propietario IS
'Nombre completo del propietario (normalizado, mayúsculas)';

COMMENT ON COLUMN unipersonal_clients.apellido_propietario IS
'Apellido del propietario (normalizado, mayúsculas)';

COMMENT ON COLUMN unipersonal_clients.documento_propietario IS
'Documento del propietario (mínimo 7 dígitos)';

COMMENT ON COLUMN unipersonal_clients.nacionalidad_propietario IS
'Nacionalidad del propietario (normalizado, mayúsculas)';

COMMENT ON COLUMN unipersonal_clients.nombre_representante IS
'Nombre completo del representante legal (normalizado, mayúsculas)';

COMMENT ON COLUMN unipersonal_clients.ci_representante IS
'CI del representante legal (mínimo 7 dígitos)';

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE unipersonal_clients ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para unipersonal_clients

-- Política de SELECT: Usuarios autenticados pueden ver todos los clientes
CREATE POLICY "Authenticated users can view unipersonal clients"
ON unipersonal_clients
FOR SELECT
TO authenticated
USING (true);

-- Política de INSERT: Usuarios autenticados pueden insertar
CREATE POLICY "Authenticated users can insert unipersonal clients"
ON unipersonal_clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política de UPDATE: Usuarios autenticados pueden actualizar
CREATE POLICY "Authenticated users can update unipersonal clients"
ON unipersonal_clients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política de DELETE: Solo admins pueden eliminar
CREATE POLICY "Only admins can delete unipersonal clients"
ON unipersonal_clients
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 7. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_unipersonal_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_unipersonal_clients_updated_at
    BEFORE UPDATE ON unipersonal_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_unipersonal_clients_updated_at();

-- 8. Tabla de relación client_partners (para cónyuges de clientes unipersonales casados)
-- Esta tabla ya debería existir, pero agregamos el constraint si no existe

CREATE TABLE IF NOT EXISTS client_partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Datos personales del cónyuge
    primer_nombre varchar(100) NOT NULL,
    segundo_nombre varchar(100),
    primer_apellido varchar(100) NOT NULL,
    segundo_apellido varchar(100),

    -- Información de contacto
    direccion text NOT NULL,
    celular varchar(20) NOT NULL CHECK (celular ~ '^[0-9]{5,}$'),
    correo_electronico varchar(255) NOT NULL CHECK (
        correo_electronico ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),

    -- Datos laborales
    profesion_oficio varchar(200) NOT NULL,
    actividad_economica varchar(200) NOT NULL,
    lugar_trabajo varchar(200) NOT NULL,

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Constraint: Un cliente solo puede tener un cónyuge
    UNIQUE(client_id)
);

-- Índice para client_partners
CREATE INDEX IF NOT EXISTS idx_client_partners_client_id ON client_partners(client_id);

-- Comentarios para client_partners
COMMENT ON TABLE client_partners IS
'Datos del cónyuge para clientes naturales o unipersonales casados. Relación 1:1.';

COMMENT ON COLUMN client_partners.client_id IS
'Referencia al cliente (natural o unipersonal) que está casado';

-- Habilitar RLS en client_partners si no está habilitado
ALTER TABLE client_partners ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_partners (si no existen)
DO $$
BEGIN
    -- SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'client_partners'
        AND policyname = 'Authenticated users can view client partners'
    ) THEN
        CREATE POLICY "Authenticated users can view client partners"
        ON client_partners
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    -- INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'client_partners'
        AND policyname = 'Authenticated users can insert client partners'
    ) THEN
        CREATE POLICY "Authenticated users can insert client partners"
        ON client_partners
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;

    -- UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'client_partners'
        AND policyname = 'Authenticated users can update client partners'
    ) THEN
        CREATE POLICY "Authenticated users can update client partners"
        ON client_partners
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    -- DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'client_partners'
        AND policyname = 'Only admins can delete client partners'
    ) THEN
        CREATE POLICY "Only admins can delete client partners"
        ON client_partners
        FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        );
    END IF;
END $$;

-- Trigger para updated_at en client_partners
CREATE OR REPLACE FUNCTION update_client_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_client_partners_updated_at ON client_partners;
CREATE TRIGGER trigger_update_client_partners_updated_at
    BEFORE UPDATE ON client_partners
    FOR EACH ROW
    EXECUTE FUNCTION update_client_partners_updated_at();

-- ============================================
-- Verificación Final
-- ============================================

-- Verificar que el constraint se actualizó correctamente
DO $$
DECLARE
    constraint_def text;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conname = 'clients_client_type_check'
    AND conrelid = 'clients'::regclass;

    IF constraint_def LIKE '%unipersonal%' THEN
        RAISE NOTICE '✓ CHECK constraint actualizado correctamente - ahora permite "unipersonal"';
    ELSE
        RAISE WARNING '✗ CHECK constraint NO fue actualizado correctamente';
    END IF;
END $$;

-- Verificar que la tabla fue creada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'unipersonal_clients') THEN
        RAISE NOTICE '✓ Tabla unipersonal_clients creada exitosamente';
    ELSE
        RAISE WARNING '✗ Tabla unipersonal_clients NO fue creada';
    END IF;
END $$;

-- Verificar RLS habilitado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = 'unipersonal_clients'
        AND c.relrowsecurity = true
    ) THEN
        RAISE NOTICE '✓ RLS habilitado en unipersonal_clients';
    ELSE
        RAISE WARNING '✗ RLS NO habilitado en unipersonal_clients';
    END IF;
END $$;

-- ============================================
-- Fin de Migración
-- ============================================
