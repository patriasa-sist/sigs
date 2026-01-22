-- =============================================
-- CLIENTES HISTORIAL EDICIONES
-- Migration to track all changes to client data
-- =============================================

-- 1. Create history table
CREATE TABLE IF NOT EXISTS clientes_historial_ediciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    tabla_modificada text NOT NULL, -- 'clients', 'natural_clients', 'juridic_clients', 'unipersonal_clients', 'client_partners', 'legal_representatives'
    tipo_cambio text NOT NULL CHECK (tipo_cambio IN ('creacion', 'modificacion', 'eliminacion')),
    campo_modificado text, -- NULL for creation, specific field name for modifications
    valor_anterior text, -- JSON stringified old value
    valor_nuevo text, -- JSON stringified new value
    modificado_por uuid REFERENCES profiles(id),
    fecha_modificacion timestamptz NOT NULL DEFAULT now(),
    ip_address text,
    user_agent text,
    notas text
);

-- 2. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_clientes_historial_client_id
    ON clientes_historial_ediciones(client_id);
CREATE INDEX IF NOT EXISTS idx_clientes_historial_fecha
    ON clientes_historial_ediciones(fecha_modificacion DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_historial_tabla
    ON clientes_historial_ediciones(tabla_modificada);
CREATE INDEX IF NOT EXISTS idx_clientes_historial_modificado_por
    ON clientes_historial_ediciones(modificado_por);

-- 3. Enable RLS
ALTER TABLE clientes_historial_ediciones ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Only admins can view history
CREATE POLICY "Admins can view client history"
    ON clientes_historial_ediciones
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow inserts from authenticated users (for triggers)
CREATE POLICY "System can insert client history"
    ON clientes_historial_ediciones
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 5. Create view with user names for easy querying
CREATE OR REPLACE VIEW clientes_historial_vista AS
SELECT
    h.id,
    h.client_id,
    h.tabla_modificada,
    h.tipo_cambio,
    h.campo_modificado,
    h.valor_anterior,
    h.valor_nuevo,
    h.modificado_por,
    p.full_name as modificado_por_nombre,
    p.email as modificado_por_email,
    h.fecha_modificacion,
    h.notas,
    -- Get client name based on type
    CASE
        WHEN c.client_type = 'natural' THEN
            COALESCE(nc.primer_nombre || ' ' || nc.primer_apellido, 'Cliente Natural')
        WHEN c.client_type = 'juridica' THEN
            COALESCE(jc.razon_social, 'Persona Jurídica')
        WHEN c.client_type = 'unipersonal' THEN
            COALESCE(uc.razon_social, 'Unipersonal')
        ELSE 'Cliente'
    END as client_name
FROM clientes_historial_ediciones h
LEFT JOIN profiles p ON h.modificado_por = p.id
LEFT JOIN clients c ON h.client_id = c.id
LEFT JOIN natural_clients nc ON c.id = nc.client_id
LEFT JOIN juridic_clients jc ON c.id = jc.client_id
LEFT JOIN unipersonal_clients uc ON c.id = uc.client_id
ORDER BY h.fecha_modificacion DESC;

-- 6. Function to record history entry
CREATE OR REPLACE FUNCTION registrar_historial_cliente(
    p_client_id uuid,
    p_tabla text,
    p_tipo_cambio text,
    p_campo text DEFAULT NULL,
    p_valor_anterior text DEFAULT NULL,
    p_valor_nuevo text DEFAULT NULL,
    p_notas text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_history_id uuid;
BEGIN
    INSERT INTO clientes_historial_ediciones (
        client_id,
        tabla_modificada,
        tipo_cambio,
        campo_modificado,
        valor_anterior,
        valor_nuevo,
        modificado_por,
        notas
    ) VALUES (
        p_client_id,
        p_tabla,
        p_tipo_cambio,
        p_campo,
        p_valor_anterior,
        p_valor_nuevo,
        auth.uid(),
        p_notas
    )
    RETURNING id INTO v_history_id;

    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger function for natural_clients
CREATE OR REPLACE FUNCTION trigger_natural_clients_historial()
RETURNS TRIGGER AS $$
DECLARE
    v_field text;
    v_old_value text;
    v_new_value text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Record creation
        INSERT INTO clientes_historial_ediciones (
            client_id, tabla_modificada, tipo_cambio, modificado_por, valor_nuevo
        ) VALUES (
            NEW.client_id, 'natural_clients', 'creacion', auth.uid(),
            row_to_json(NEW)::text
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Compare each field and record changes
        -- primer_nombre
        IF OLD.primer_nombre IS DISTINCT FROM NEW.primer_nombre THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'primer_nombre', OLD.primer_nombre, NEW.primer_nombre, auth.uid());
        END IF;
        -- segundo_nombre
        IF OLD.segundo_nombre IS DISTINCT FROM NEW.segundo_nombre THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'segundo_nombre', OLD.segundo_nombre, NEW.segundo_nombre, auth.uid());
        END IF;
        -- primer_apellido
        IF OLD.primer_apellido IS DISTINCT FROM NEW.primer_apellido THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'primer_apellido', OLD.primer_apellido, NEW.primer_apellido, auth.uid());
        END IF;
        -- segundo_apellido
        IF OLD.segundo_apellido IS DISTINCT FROM NEW.segundo_apellido THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'segundo_apellido', OLD.segundo_apellido, NEW.segundo_apellido, auth.uid());
        END IF;
        -- tipo_documento
        IF OLD.tipo_documento IS DISTINCT FROM NEW.tipo_documento THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'tipo_documento', OLD.tipo_documento, NEW.tipo_documento, auth.uid());
        END IF;
        -- numero_documento
        IF OLD.numero_documento IS DISTINCT FROM NEW.numero_documento THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'numero_documento', OLD.numero_documento, NEW.numero_documento, auth.uid());
        END IF;
        -- extension_ci
        IF OLD.extension_ci IS DISTINCT FROM NEW.extension_ci THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'extension_ci', OLD.extension_ci, NEW.extension_ci, auth.uid());
        END IF;
        -- nacionalidad
        IF OLD.nacionalidad IS DISTINCT FROM NEW.nacionalidad THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'nacionalidad', OLD.nacionalidad, NEW.nacionalidad, auth.uid());
        END IF;
        -- fecha_nacimiento
        IF OLD.fecha_nacimiento IS DISTINCT FROM NEW.fecha_nacimiento THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'fecha_nacimiento', OLD.fecha_nacimiento::text, NEW.fecha_nacimiento::text, auth.uid());
        END IF;
        -- estado_civil
        IF OLD.estado_civil IS DISTINCT FROM NEW.estado_civil THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'estado_civil', OLD.estado_civil, NEW.estado_civil, auth.uid());
        END IF;
        -- genero
        IF OLD.genero IS DISTINCT FROM NEW.genero THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'genero', OLD.genero, NEW.genero, auth.uid());
        END IF;
        -- direccion
        IF OLD.direccion IS DISTINCT FROM NEW.direccion THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'direccion', OLD.direccion, NEW.direccion, auth.uid());
        END IF;
        -- celular
        IF OLD.celular IS DISTINCT FROM NEW.celular THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'celular', OLD.celular, NEW.celular, auth.uid());
        END IF;
        -- correo_electronico
        IF OLD.correo_electronico IS DISTINCT FROM NEW.correo_electronico THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'correo_electronico', OLD.correo_electronico, NEW.correo_electronico, auth.uid());
        END IF;
        -- profesion_oficio
        IF OLD.profesion_oficio IS DISTINCT FROM NEW.profesion_oficio THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'profesion_oficio', OLD.profesion_oficio, NEW.profesion_oficio, auth.uid());
        END IF;
        -- actividad_economica
        IF OLD.actividad_economica IS DISTINCT FROM NEW.actividad_economica THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'actividad_economica', OLD.actividad_economica, NEW.actividad_economica, auth.uid());
        END IF;
        -- lugar_trabajo
        IF OLD.lugar_trabajo IS DISTINCT FROM NEW.lugar_trabajo THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'lugar_trabajo', OLD.lugar_trabajo, NEW.lugar_trabajo, auth.uid());
        END IF;
        -- cargo
        IF OLD.cargo IS DISTINCT FROM NEW.cargo THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'cargo', OLD.cargo, NEW.cargo, auth.uid());
        END IF;
        -- nivel_ingresos
        IF OLD.nivel_ingresos IS DISTINCT FROM NEW.nivel_ingresos THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'nivel_ingresos', OLD.nivel_ingresos::text, NEW.nivel_ingresos::text, auth.uid());
        END IF;
        -- nit
        IF OLD.nit IS DISTINCT FROM NEW.nit THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'nit', OLD.nit, NEW.nit, auth.uid());
        END IF;
        -- domicilio_comercial
        IF OLD.domicilio_comercial IS DISTINCT FROM NEW.domicilio_comercial THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'natural_clients', 'modificacion', 'domicilio_comercial', OLD.domicilio_comercial, NEW.domicilio_comercial, auth.uid());
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger function for juridic_clients
CREATE OR REPLACE FUNCTION trigger_juridic_clients_historial()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO clientes_historial_ediciones (
            client_id, tabla_modificada, tipo_cambio, modificado_por, valor_nuevo
        ) VALUES (
            NEW.client_id, 'juridic_clients', 'creacion', auth.uid(),
            row_to_json(NEW)::text
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- razon_social
        IF OLD.razon_social IS DISTINCT FROM NEW.razon_social THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'razon_social', OLD.razon_social, NEW.razon_social, auth.uid());
        END IF;
        -- nit
        IF OLD.nit IS DISTINCT FROM NEW.nit THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'nit', OLD.nit, NEW.nit, auth.uid());
        END IF;
        -- tipo_sociedad
        IF OLD.tipo_sociedad IS DISTINCT FROM NEW.tipo_sociedad THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'tipo_sociedad', OLD.tipo_sociedad, NEW.tipo_sociedad, auth.uid());
        END IF;
        -- matricula_comercio
        IF OLD.matricula_comercio IS DISTINCT FROM NEW.matricula_comercio THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'matricula_comercio', OLD.matricula_comercio, NEW.matricula_comercio, auth.uid());
        END IF;
        -- pais_constitucion
        IF OLD.pais_constitucion IS DISTINCT FROM NEW.pais_constitucion THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'pais_constitucion', OLD.pais_constitucion, NEW.pais_constitucion, auth.uid());
        END IF;
        -- actividad_economica
        IF OLD.actividad_economica IS DISTINCT FROM NEW.actividad_economica THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'actividad_economica', OLD.actividad_economica, NEW.actividad_economica, auth.uid());
        END IF;
        -- direccion_legal
        IF OLD.direccion_legal IS DISTINCT FROM NEW.direccion_legal THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'direccion_legal', OLD.direccion_legal, NEW.direccion_legal, auth.uid());
        END IF;
        -- telefono
        IF OLD.telefono IS DISTINCT FROM NEW.telefono THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'telefono', OLD.telefono, NEW.telefono, auth.uid());
        END IF;
        -- correo_electronico
        IF OLD.correo_electronico IS DISTINCT FROM NEW.correo_electronico THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'juridic_clients', 'modificacion', 'correo_electronico', OLD.correo_electronico, NEW.correo_electronico, auth.uid());
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger function for unipersonal_clients
CREATE OR REPLACE FUNCTION trigger_unipersonal_clients_historial()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO clientes_historial_ediciones (
            client_id, tabla_modificada, tipo_cambio, modificado_por, valor_nuevo
        ) VALUES (
            NEW.client_id, 'unipersonal_clients', 'creacion', auth.uid(),
            row_to_json(NEW)::text
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- razon_social
        IF OLD.razon_social IS DISTINCT FROM NEW.razon_social THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'razon_social', OLD.razon_social, NEW.razon_social, auth.uid());
        END IF;
        -- nit
        IF OLD.nit IS DISTINCT FROM NEW.nit THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'nit', OLD.nit, NEW.nit, auth.uid());
        END IF;
        -- matricula_comercio
        IF OLD.matricula_comercio IS DISTINCT FROM NEW.matricula_comercio THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'matricula_comercio', OLD.matricula_comercio, NEW.matricula_comercio, auth.uid());
        END IF;
        -- actividad_economica_comercial
        IF OLD.actividad_economica_comercial IS DISTINCT FROM NEW.actividad_economica_comercial THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'actividad_economica_comercial', OLD.actividad_economica_comercial, NEW.actividad_economica_comercial, auth.uid());
        END IF;
        -- nivel_ingresos
        IF OLD.nivel_ingresos IS DISTINCT FROM NEW.nivel_ingresos THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'nivel_ingresos', OLD.nivel_ingresos::text, NEW.nivel_ingresos::text, auth.uid());
        END IF;
        -- domicilio_comercial
        IF OLD.domicilio_comercial IS DISTINCT FROM NEW.domicilio_comercial THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'domicilio_comercial', OLD.domicilio_comercial, NEW.domicilio_comercial, auth.uid());
        END IF;
        -- telefono_comercial
        IF OLD.telefono_comercial IS DISTINCT FROM NEW.telefono_comercial THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'telefono_comercial', OLD.telefono_comercial, NEW.telefono_comercial, auth.uid());
        END IF;
        -- correo_electronico_comercial
        IF OLD.correo_electronico_comercial IS DISTINCT FROM NEW.correo_electronico_comercial THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'correo_electronico_comercial', OLD.correo_electronico_comercial, NEW.correo_electronico_comercial, auth.uid());
        END IF;
        -- nombre_representante
        IF OLD.nombre_representante IS DISTINCT FROM NEW.nombre_representante THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'nombre_representante', OLD.nombre_representante, NEW.nombre_representante, auth.uid());
        END IF;
        -- ci_representante
        IF OLD.ci_representante IS DISTINCT FROM NEW.ci_representante THEN
            INSERT INTO clientes_historial_ediciones (client_id, tabla_modificada, tipo_cambio, campo_modificado, valor_anterior, valor_nuevo, modificado_por)
            VALUES (NEW.client_id, 'unipersonal_clients', 'modificacion', 'ci_representante', OLD.ci_representante, NEW.ci_representante, auth.uid());
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create triggers (drop if exists first)
DROP TRIGGER IF EXISTS trg_natural_clients_historial ON natural_clients;
CREATE TRIGGER trg_natural_clients_historial
    AFTER INSERT OR UPDATE ON natural_clients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_natural_clients_historial();

DROP TRIGGER IF EXISTS trg_juridic_clients_historial ON juridic_clients;
CREATE TRIGGER trg_juridic_clients_historial
    AFTER INSERT OR UPDATE ON juridic_clients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_juridic_clients_historial();

DROP TRIGGER IF EXISTS trg_unipersonal_clients_historial ON unipersonal_clients;
CREATE TRIGGER trg_unipersonal_clients_historial
    AFTER INSERT OR UPDATE ON unipersonal_clients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_unipersonal_clients_historial();

-- 11. Also update the updated_by field when clients are updated
CREATE OR REPLACE FUNCTION update_client_updated_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_clients_updated_by ON clients;
CREATE TRIGGER trg_clients_updated_by
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_client_updated_by();

-- 12. Grant necessary permissions
GRANT SELECT ON clientes_historial_ediciones TO authenticated;
GRANT INSERT ON clientes_historial_ediciones TO authenticated;
GRANT SELECT ON clientes_historial_vista TO authenticated;

-- 13. Add comments
COMMENT ON TABLE clientes_historial_ediciones IS 'Registro de todos los cambios realizados a los datos de clientes';
COMMENT ON COLUMN clientes_historial_ediciones.tabla_modificada IS 'Tabla donde se realizó el cambio';
COMMENT ON COLUMN clientes_historial_ediciones.tipo_cambio IS 'Tipo de cambio: creacion, modificacion, eliminacion';
COMMENT ON COLUMN clientes_historial_ediciones.campo_modificado IS 'Campo específico que fue modificado';
COMMENT ON COLUMN clientes_historial_ediciones.valor_anterior IS 'Valor antes del cambio';
COMMENT ON COLUMN clientes_historial_ediciones.valor_nuevo IS 'Valor después del cambio';
