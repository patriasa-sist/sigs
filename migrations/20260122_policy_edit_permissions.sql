-- =====================================================
-- Migración: Sistema de Permisos de Edición de Pólizas
-- Fecha: 2026-01-22
-- Descripción: Permite a administradores otorgar permisos
--              temporales de edición a usuarios comerciales
--              para pólizas específicas.
-- =====================================================

-- 1. TABLA DE PERMISOS DE EDICIÓN DE PÓLIZAS
CREATE TABLE IF NOT EXISTS policy_edit_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    granted_by uuid NOT NULL REFERENCES profiles(id),
    granted_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz, -- NULL significa que nunca expira
    revoked_at timestamptz, -- NULL significa activo
    revoked_by uuid REFERENCES profiles(id),
    notes text,

    CONSTRAINT unique_policy_user_permission UNIQUE (poliza_id, user_id),
    CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > granted_at)
);

COMMENT ON TABLE policy_edit_permissions IS 'Permisos granulares para que usuarios comerciales puedan editar pólizas específicas';
COMMENT ON COLUMN policy_edit_permissions.poliza_id IS 'ID de la póliza a la que se otorga permiso';
COMMENT ON COLUMN policy_edit_permissions.user_id IS 'ID del usuario comercial que recibe el permiso';
COMMENT ON COLUMN policy_edit_permissions.granted_by IS 'ID del admin que otorgó el permiso';
COMMENT ON COLUMN policy_edit_permissions.granted_at IS 'Fecha y hora en que se otorgó el permiso';
COMMENT ON COLUMN policy_edit_permissions.expires_at IS 'Fecha de expiración opcional del permiso';
COMMENT ON COLUMN policy_edit_permissions.revoked_at IS 'Fecha de revocación (soft delete)';
COMMENT ON COLUMN policy_edit_permissions.revoked_by IS 'ID del admin que revocó el permiso';
COMMENT ON COLUMN policy_edit_permissions.notes IS 'Notas opcionales sobre el permiso';

-- 2. ÍNDICES PARA BÚSQUEDAS EFICIENTES
CREATE INDEX IF NOT EXISTS idx_policy_edit_perm_lookup
    ON policy_edit_permissions(poliza_id, user_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_policy_edit_perm_policy
    ON policy_edit_permissions(poliza_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_policy_edit_perm_user
    ON policy_edit_permissions(user_id)
    WHERE revoked_at IS NULL;

-- 3. ROW LEVEL SECURITY
ALTER TABLE policy_edit_permissions ENABLE ROW LEVEL SECURITY;

-- Política: Admin puede ver todos los permisos
DROP POLICY IF EXISTS "Admin ve todos permisos poliza" ON policy_edit_permissions;
CREATE POLICY "Admin ve todos permisos poliza"
    ON policy_edit_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Política: Usuario puede ver sus propios permisos
DROP POLICY IF EXISTS "Usuario ve sus permisos poliza" ON policy_edit_permissions;
CREATE POLICY "Usuario ve sus permisos poliza"
    ON policy_edit_permissions FOR SELECT
    USING (user_id = auth.uid());

-- Política: Admin puede insertar permisos
DROP POLICY IF EXISTS "Admin puede insertar permisos poliza" ON policy_edit_permissions;
CREATE POLICY "Admin puede insertar permisos poliza"
    ON policy_edit_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Política: Admin puede actualizar permisos (para revocar)
DROP POLICY IF EXISTS "Admin puede actualizar permisos poliza" ON policy_edit_permissions;
CREATE POLICY "Admin puede actualizar permisos poliza"
    ON policy_edit_permissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Política: Admin puede eliminar permisos
DROP POLICY IF EXISTS "Admin puede eliminar permisos poliza" ON policy_edit_permissions;
CREATE POLICY "Admin puede eliminar permisos poliza"
    ON policy_edit_permissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 4. FUNCIÓN HELPER: Verificar si usuario puede editar póliza
CREATE OR REPLACE FUNCTION can_edit_policy(p_poliza_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
    v_role text;
    v_has_permission boolean;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO v_role FROM profiles WHERE id = p_user_id;

    IF v_role IS NULL THEN
        RETURN false;
    END IF;

    -- Admin siempre puede editar
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- Solo rol comercial puede tener permisos temporales
    IF v_role != 'comercial' THEN
        RETURN false;
    END IF;

    -- Verificar si tiene permiso activo y no expirado
    SELECT EXISTS (
        SELECT 1 FROM policy_edit_permissions
        WHERE poliza_id = p_poliza_id
        AND user_id = p_user_id
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_edit_policy(uuid, uuid) IS 'Verifica si un usuario puede editar una póliza específica';

-- 5. VISTA PARA PERMISOS CON INFORMACIÓN DE USUARIOS
CREATE OR REPLACE VIEW policy_edit_permissions_view AS
SELECT
    pep.id,
    pep.poliza_id,
    pol.numero_poliza,
    pep.user_id,
    u.full_name as user_name,
    u.email as user_email,
    pep.granted_by,
    g.full_name as granted_by_name,
    pep.granted_at,
    pep.expires_at,
    pep.revoked_at,
    pep.revoked_by,
    r.full_name as revoked_by_name,
    pep.notes,
    CASE
        WHEN pep.revoked_at IS NOT NULL THEN false
        WHEN pep.expires_at IS NOT NULL AND pep.expires_at <= now() THEN false
        ELSE true
    END as is_active
FROM policy_edit_permissions pep
LEFT JOIN polizas pol ON pol.id = pep.poliza_id
LEFT JOIN profiles u ON u.id = pep.user_id
LEFT JOIN profiles g ON g.id = pep.granted_by
LEFT JOIN profiles r ON r.id = pep.revoked_by;

COMMENT ON VIEW policy_edit_permissions_view IS 'Vista enriquecida de permisos con información de usuarios y estado calculado';
