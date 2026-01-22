-- =====================================================
-- Migration: Sistema de Permisos de Edición de Clientes
-- Fecha: 2026-01-21
-- Descripción: Permite a administradores otorgar permisos
--              de edición a usuarios comerciales para
--              clientes específicos.
-- =====================================================

-- =====================================================
-- 1. TABLA DE PERMISOS DE EDICIÓN
-- =====================================================

CREATE TABLE IF NOT EXISTS client_edit_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    granted_by uuid NOT NULL REFERENCES profiles(id),
    granted_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz, -- NULL significa que nunca expira
    revoked_at timestamptz, -- NULL significa activo, cuando se revoca se setea
    revoked_by uuid REFERENCES profiles(id),
    notes text, -- Razón opcional para otorgar/revocar

    -- Un usuario solo puede tener un permiso activo por cliente
    CONSTRAINT unique_client_user_permission UNIQUE (client_id, user_id),
    -- La fecha de expiración debe ser posterior a la de otorgamiento
    CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Comentarios de documentación
COMMENT ON TABLE client_edit_permissions IS 'Permisos granulares para que usuarios comerciales puedan editar clientes específicos';
COMMENT ON COLUMN client_edit_permissions.client_id IS 'ID del cliente que puede ser editado';
COMMENT ON COLUMN client_edit_permissions.user_id IS 'ID del usuario comercial que recibe el permiso';
COMMENT ON COLUMN client_edit_permissions.granted_by IS 'ID del administrador que otorgó el permiso';
COMMENT ON COLUMN client_edit_permissions.expires_at IS 'Fecha de expiración opcional. NULL = nunca expira';
COMMENT ON COLUMN client_edit_permissions.revoked_at IS 'Soft delete. Cuando se setea, el permiso está inactivo';
COMMENT ON COLUMN client_edit_permissions.revoked_by IS 'ID del administrador que revocó el permiso';

-- =====================================================
-- 2. ÍNDICES PARA CONSULTAS EFICIENTES
-- =====================================================

-- Consulta rápida: ¿puede usuario X editar cliente Y?
CREATE INDEX IF NOT EXISTS idx_client_edit_perm_lookup
    ON client_edit_permissions(client_id, user_id)
    WHERE revoked_at IS NULL;

-- Consulta rápida: todos los permisos de un cliente
CREATE INDEX IF NOT EXISTS idx_client_edit_perm_client
    ON client_edit_permissions(client_id)
    WHERE revoked_at IS NULL;

-- Consulta rápida: todos los permisos de un usuario
CREATE INDEX IF NOT EXISTS idx_client_edit_perm_user
    ON client_edit_permissions(user_id)
    WHERE revoked_at IS NULL;

-- Auditoría: quién otorgó permisos
CREATE INDEX IF NOT EXISTS idx_client_edit_perm_granted_by
    ON client_edit_permissions(granted_by);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE client_edit_permissions ENABLE ROW LEVEL SECURITY;

-- Admin puede ver todos los permisos
DROP POLICY IF EXISTS "Admin ve todos los permisos" ON client_edit_permissions;
CREATE POLICY "Admin ve todos los permisos"
    ON client_edit_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Usuarios pueden ver sus propios permisos
DROP POLICY IF EXISTS "Usuario ve sus propios permisos" ON client_edit_permissions;
CREATE POLICY "Usuario ve sus propios permisos"
    ON client_edit_permissions FOR SELECT
    USING (user_id = auth.uid());

-- Solo admin puede insertar permisos
DROP POLICY IF EXISTS "Admin puede insertar permisos" ON client_edit_permissions;
CREATE POLICY "Admin puede insertar permisos"
    ON client_edit_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Solo admin puede actualizar permisos (para revocar)
DROP POLICY IF EXISTS "Admin puede actualizar permisos" ON client_edit_permissions;
CREATE POLICY "Admin puede actualizar permisos"
    ON client_edit_permissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Solo admin puede eliminar permisos
DROP POLICY IF EXISTS "Admin puede eliminar permisos" ON client_edit_permissions;
CREATE POLICY "Admin puede eliminar permisos"
    ON client_edit_permissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 4. FUNCIÓN HELPER: Verificar Permiso de Edición
-- =====================================================

CREATE OR REPLACE FUNCTION can_edit_client(p_client_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
    v_role text;
    v_has_permission boolean;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO v_role FROM profiles WHERE id = p_user_id;

    -- Si no existe el usuario, no puede editar
    IF v_role IS NULL THEN
        RETURN false;
    END IF;

    -- Admin siempre puede editar
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- Solo rol comercial puede tener permisos específicos
    IF v_role != 'comercial' THEN
        RETURN false;
    END IF;

    -- Verificar si tiene permiso activo y no expirado
    SELECT EXISTS (
        SELECT 1 FROM client_edit_permissions
        WHERE client_id = p_client_id
        AND user_id = p_user_id
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_edit_client IS 'Verifica si un usuario puede editar un cliente específico. Admin siempre puede, comercial solo si tiene permiso activo.';

-- =====================================================
-- 5. CAMPO updated_by EN CLIENTS (si no existe)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE clients ADD COLUMN updated_by uuid REFERENCES profiles(id);
        COMMENT ON COLUMN clients.updated_by IS 'ID del usuario que realizó la última modificación';
    END IF;
END $$;

-- =====================================================
-- 6. TRIGGER PARA AUDITORÍA DE ACTUALIZACIONES
-- =====================================================

CREATE OR REPLACE FUNCTION track_client_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_clients_track_update ON clients;
CREATE TRIGGER trigger_clients_track_update
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION track_client_update();

-- =====================================================
-- 7. VISTA PARA PERMISOS CON INFORMACIÓN DE USUARIOS
-- =====================================================

CREATE OR REPLACE VIEW client_edit_permissions_view AS
SELECT
    cep.id,
    cep.client_id,
    cep.user_id,
    u.full_name as user_name,
    u.email as user_email,
    cep.granted_by,
    g.full_name as granted_by_name,
    cep.granted_at,
    cep.expires_at,
    cep.revoked_at,
    cep.revoked_by,
    r.full_name as revoked_by_name,
    cep.notes,
    -- Calcular si está activo
    CASE
        WHEN cep.revoked_at IS NOT NULL THEN false
        WHEN cep.expires_at IS NOT NULL AND cep.expires_at <= now() THEN false
        ELSE true
    END as is_active
FROM client_edit_permissions cep
LEFT JOIN profiles u ON u.id = cep.user_id
LEFT JOIN profiles g ON g.id = cep.granted_by
LEFT JOIN profiles r ON r.id = cep.revoked_by;

COMMENT ON VIEW client_edit_permissions_view IS 'Vista enriquecida de permisos con nombres de usuarios';
