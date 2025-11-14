-- =====================================================
-- Migration: Restructure Client Schema
-- Date: 2025-11-14
-- Purpose: Simplify tier requirements, add unipersonal client type,
--          add partner support, reorganize fields for intuitive forms
-- =====================================================

-- =====================================================
-- 1. UPDATE CLIENTS TABLE - Add 'unipersonal' client type
-- =====================================================

-- Drop existing constraint and recreate with new value
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_type_check;
ALTER TABLE clients ADD CONSTRAINT clients_client_type_check
    CHECK (client_type IN ('natural', 'juridica', 'unipersonal'));

COMMENT ON COLUMN clients.client_type IS 'Client type: natural (individual), juridica (company), unipersonal (sole proprietorship)';

-- =====================================================
-- 2. UPDATE NATURAL_CLIENTS TABLE - Simplify and reorganize
-- =====================================================

-- Note: We'll drop columns and recreate them to ensure proper constraints
-- Back up existing data first if needed in production!

-- Step 2.1: Update tipo_documento constraint to only allow 'ci' and 'pasaporte'
ALTER TABLE natural_clients DROP CONSTRAINT IF EXISTS natural_clients_tipo_documento_check;
ALTER TABLE natural_clients ADD CONSTRAINT natural_clients_tipo_documento_check
    CHECK (LOWER(tipo_documento) IN ('ci', 'pasaporte'));

-- Step 2.2: Add minimum length constraint to numero_documento
ALTER TABLE natural_clients DROP CONSTRAINT IF EXISTS natural_clients_numero_documento_length;
ALTER TABLE natural_clients ADD CONSTRAINT natural_clients_numero_documento_length
    CHECK (LENGTH(TRIM(numero_documento)) >= 6);

-- Step 2.3: Update estado_civil constraint to specific values
ALTER TABLE natural_clients DROP CONSTRAINT IF EXISTS natural_clients_estado_civil_check;
ALTER TABLE natural_clients ADD CONSTRAINT natural_clients_estado_civil_check
    CHECK (LOWER(estado_civil) IN ('casado', 'soltero', 'divorciado', 'viudo'));

-- Step 2.4: Make correo_electronico and celular REQUIRED (remove NULL)
ALTER TABLE natural_clients ALTER COLUMN correo_electronico SET NOT NULL;
ALTER TABLE natural_clients ALTER COLUMN celular SET NOT NULL;

-- Step 2.5: Add celular validation (only numbers, min 5 digits)
ALTER TABLE natural_clients DROP CONSTRAINT IF EXISTS natural_clients_celular_check;
ALTER TABLE natural_clients ADD CONSTRAINT natural_clients_celular_check
    CHECK (celular ~ '^[0-9]{5,}$');

-- Step 2.6: Update genero constraint to lowercase values
ALTER TABLE natural_clients DROP CONSTRAINT IF EXISTS natural_clients_genero_check;
ALTER TABLE natural_clients ADD CONSTRAINT natural_clients_genero_check
    CHECK (genero IS NULL OR LOWER(genero) IN ('masculino', 'femenino', 'otro'));

-- Step 2.7: Rename 'oficio' to 'profesion_oficio' for clarity
ALTER TABLE natural_clients RENAME COLUMN oficio TO profesion_oficio;

-- Step 2.8: Change nivel_ingresos from varchar to numeric
ALTER TABLE natural_clients ALTER COLUMN nivel_ingresos TYPE numeric USING
    CASE
        WHEN LOWER(nivel_ingresos) LIKE '%bajo%' THEN 2000
        WHEN LOWER(nivel_ingresos) LIKE '%medio%' THEN 5000
        WHEN LOWER(nivel_ingresos) LIKE '%alto%' THEN 10000
        ELSE NULL
    END;

-- Step 2.9: Change anio_ingreso from integer to date
ALTER TABLE natural_clients ALTER COLUMN anio_ingreso TYPE date USING
    CASE
        WHEN anio_ingreso IS NOT NULL THEN make_date(anio_ingreso, 1, 1)
        ELSE NULL
    END;

-- Step 2.10: Add NIT validation (min 7 digits when provided)
ALTER TABLE natural_clients DROP CONSTRAINT IF EXISTS natural_clients_nit_check;
ALTER TABLE natural_clients ADD CONSTRAINT natural_clients_nit_check
    CHECK (nit IS NULL OR (nit ~ '^[0-9]+$' AND LENGTH(nit) >= 7));

-- Step 2.11: Update estado_civil to be NOT NULL
ALTER TABLE natural_clients ALTER COLUMN estado_civil SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN natural_clients.extension_ci IS 'CI extension: LP, CB, SC, OR, PT, TJ, CH, BE, PD';
COMMENT ON COLUMN natural_clients.estado_civil IS 'Marital status: casado, soltero, divorciado, viudo';
COMMENT ON COLUMN natural_clients.celular IS 'Mobile phone: only numbers, minimum 5 digits';
COMMENT ON COLUMN natural_clients.correo_electronico IS 'Email: required, validated format';
COMMENT ON COLUMN natural_clients.profesion_oficio IS 'Profession or trade';
COMMENT ON COLUMN natural_clients.nivel_ingresos IS 'Income level: 2000 (bajo), 5000 (medio), 10000 (alto)';
COMMENT ON COLUMN natural_clients.anio_ingreso IS 'Entry date to workplace';

-- =====================================================
-- 3. CREATE CLIENT_PARTNERS TABLE (for married natural clients)
-- =====================================================

CREATE TABLE client_partners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- PERSONAL DATA
    primer_nombre varchar(100) NOT NULL,
    segundo_nombre varchar(100),
    primer_apellido varchar(100) NOT NULL,
    segundo_apellido varchar(100),

    -- CONTACT INFORMATION
    direccion text NOT NULL,
    celular varchar(20) NOT NULL,
    correo_electronico varchar(255) NOT NULL,

    -- PROFESSIONAL DATA
    profesion_oficio varchar(200) NOT NULL,
    actividad_economica varchar(200) NOT NULL,
    lugar_trabajo varchar(200) NOT NULL,

    -- METADATA
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- CONSTRAINTS
    CONSTRAINT unique_partner_per_client UNIQUE (client_id),
    CONSTRAINT valid_partner_email CHECK (correo_electronico ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_partner_celular CHECK (celular ~ '^[0-9]{5,}$')
);

-- Enable RLS
ALTER TABLE client_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view partners"
    ON client_partners FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage partners"
    ON client_partners FOR ALL
    USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER trigger_client_partners_updated_at
    BEFORE UPDATE ON client_partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index
CREATE INDEX idx_client_partners_client ON client_partners(client_id);

-- Comments
COMMENT ON TABLE client_partners IS 'Partner/spouse data for married natural clients';
COMMENT ON COLUMN client_partners.client_id IS 'References natural client (when estado_civil = casado)';

-- =====================================================
-- 4. CREATE UNIPERSONAL_CLIENTS TABLE
-- =====================================================

CREATE TABLE unipersonal_clients (
    client_id uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,

    -- COMMERCIAL DATA
    razon_social varchar(255) NOT NULL,
    nit varchar(50) NOT NULL,
    matricula_comercio varchar(100),
    domicilio_comercial text NOT NULL,
    telefono_comercial varchar(20) NOT NULL,
    actividad_economica_comercial varchar(200) NOT NULL,
    nivel_ingresos numeric NOT NULL,
    correo_electronico_comercial varchar(255) NOT NULL,

    -- OWNER DATA
    nombre_propietario varchar(200) NOT NULL,
    apellido_propietario varchar(200) NOT NULL,
    documento_propietario varchar(50) NOT NULL,
    extension_propietario varchar(5),
    nacionalidad_propietario varchar(100) NOT NULL,

    -- LEGAL REPRESENTATIVE DATA
    nombre_representante varchar(200) NOT NULL,
    ci_representante varchar(50) NOT NULL,
    extension_representante varchar(5),

    -- METADATA
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- CONSTRAINTS
    CONSTRAINT unique_unipersonal_nit UNIQUE (nit),
    CONSTRAINT valid_unipersonal_nit CHECK (nit ~ '^[0-9]+$' AND LENGTH(nit) >= 7),
    CONSTRAINT valid_unipersonal_email CHECK (correo_electronico_comercial ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_unipersonal_telefono CHECK (telefono_comercial ~ '^[0-9]{5,}$'),
    CONSTRAINT valid_unipersonal_matricula CHECK (matricula_comercio IS NULL OR LENGTH(matricula_comercio) >= 7),
    CONSTRAINT valid_documento_propietario CHECK (LENGTH(documento_propietario) >= 7),
    CONSTRAINT valid_ci_representante CHECK (LENGTH(ci_representante) >= 7),
    CONSTRAINT valid_nivel_ingresos CHECK (nivel_ingresos > 0)
);

-- Enable RLS
ALTER TABLE unipersonal_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view unipersonal clients"
    ON unipersonal_clients FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage unipersonal clients"
    ON unipersonal_clients FOR ALL
    USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER trigger_unipersonal_clients_updated_at
    BEFORE UPDATE ON unipersonal_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_unipersonal_nit ON unipersonal_clients(nit);
CREATE INDEX idx_unipersonal_razon ON unipersonal_clients(razon_social);
CREATE INDEX idx_unipersonal_client ON unipersonal_clients(client_id);

-- Comments
COMMENT ON TABLE unipersonal_clients IS 'Unipersonal (sole proprietorship) clients - extends natural client with commercial data';
COMMENT ON COLUMN unipersonal_clients.razon_social IS 'Business legal name';
COMMENT ON COLUMN unipersonal_clients.nit IS 'Tax identification number (min 7 digits)';
COMMENT ON COLUMN unipersonal_clients.nivel_ingresos IS 'Income level: 2000 (bajo), 5000 (medio), 10000 (alto)';

-- =====================================================
-- 5. UPDATE JURIDIC_CLIENTS TABLE
-- =====================================================

-- Step 5.1: Add tipo_sociedad enum constraint
ALTER TABLE juridic_clients DROP CONSTRAINT IF EXISTS juridic_clients_tipo_sociedad_check;
ALTER TABLE juridic_clients ADD CONSTRAINT juridic_clients_tipo_sociedad_check
    CHECK (tipo_sociedad IS NULL OR UPPER(tipo_sociedad) IN (
        'SRL', 'SCO', 'SCS', 'SA', 'SCA', 'AAP', 'SEM', 'LIM',
        'EPB', 'UNI', 'MIC', 'FUN', 'SCI', 'IED', 'ORR'
    ));

-- Step 5.2: Add matricula_comercio minimum length constraint
ALTER TABLE juridic_clients DROP CONSTRAINT IF EXISTS juridic_clients_matricula_check;
ALTER TABLE juridic_clients ADD CONSTRAINT juridic_clients_matricula_check
    CHECK (matricula_comercio IS NULL OR LENGTH(matricula_comercio) >= 7);

-- Step 5.3: Update NIT constraint (min 7 digits)
ALTER TABLE juridic_clients DROP CONSTRAINT IF EXISTS juridic_clients_nit_check;
ALTER TABLE juridic_clients ADD CONSTRAINT juridic_clients_nit_check
    CHECK (nit ~ '^[0-9]+$' AND LENGTH(nit) >= 7);

-- Step 5.4: Add telefono validation (min 5 digits)
ALTER TABLE juridic_clients DROP CONSTRAINT IF EXISTS juridic_clients_telefono_check;
ALTER TABLE juridic_clients ADD CONSTRAINT juridic_clients_telefono_check
    CHECK (telefono IS NULL OR telefono ~ '^[0-9]{5,}$');

-- Add comments
COMMENT ON COLUMN juridic_clients.tipo_sociedad IS 'Company type: SRL, SA, SCO, SCS, SCA, AAP, SEM, LIM, EPB, UNI, MIC, FUN, SCI, IED, ORR';
COMMENT ON COLUMN juridic_clients.matricula_comercio IS 'Commercial registry number (min 7 characters)';

-- =====================================================
-- 6. UPDATE LEGAL_REPRESENTATIVES TABLE
-- =====================================================

-- Step 6.1: Add columns for split name (primer_nombre, segundo_nombre)
-- Note: We already have 'nombre', we'll keep it for now and add new columns
ALTER TABLE legal_representatives ADD COLUMN IF NOT EXISTS primer_nombre varchar(100);
ALTER TABLE legal_representatives ADD COLUMN IF NOT EXISTS segundo_nombre varchar(100);

-- Step 6.2: Migrate existing data (split 'nombre' into primer_nombre, segundo_nombre)
UPDATE legal_representatives
SET primer_nombre = SPLIT_PART(nombre, ' ', 1),
    segundo_nombre = CASE
        WHEN array_length(string_to_array(nombre, ' '), 1) > 1
        THEN SUBSTRING(nombre FROM POSITION(' ' IN nombre) + 1)
        ELSE NULL
    END
WHERE nombre IS NOT NULL AND primer_nombre IS NULL;

-- Step 6.3: Make primer_nombre required after migration
-- In production, verify all records have primer_nombre before this step
-- ALTER TABLE legal_representatives ALTER COLUMN primer_nombre SET NOT NULL;

-- Step 6.4: Add tipo_documento constraint
ALTER TABLE legal_representatives DROP CONSTRAINT IF EXISTS legal_representatives_tipo_documento_check;
ALTER TABLE legal_representatives ADD CONSTRAINT legal_representatives_tipo_documento_check
    CHECK (LOWER(tipo_documento) IN ('ci', 'pasaporte'));

-- Step 6.5: Add numero_documento minimum length
ALTER TABLE legal_representatives DROP CONSTRAINT IF EXISTS legal_representatives_numero_documento_check;
ALTER TABLE legal_representatives ADD CONSTRAINT legal_representatives_numero_documento_check
    CHECK (LENGTH(TRIM(numero_documento)) >= 6);

-- Add comments
COMMENT ON COLUMN legal_representatives.primer_nombre IS 'First name (replaces single nombre field)';
COMMENT ON COLUMN legal_representatives.segundo_nombre IS 'Second name (optional)';
COMMENT ON COLUMN legal_representatives.nombre IS 'DEPRECATED: Use primer_nombre and segundo_nombre instead';

-- =====================================================
-- 7. DATA MIGRATION HELPERS
-- =====================================================

-- Function to normalize text (uppercase, trim)
CREATE OR REPLACE FUNCTION normalize_text(text_input text)
RETURNS text AS $$
BEGIN
    RETURN UPPER(TRIM(text_input));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean phone number (extract only digits)
CREATE OR REPLACE FUNCTION clean_phone(phone_input varchar)
RETURNS varchar AS $$
BEGIN
    RETURN regexp_replace(phone_input, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_text IS 'Normalizes text: uppercase and trim whitespace';
COMMENT ON FUNCTION clean_phone IS 'Extracts only numeric digits from phone number';

-- =====================================================
-- 8. UPDATE INDEXES FOR NEW TABLES
-- =====================================================

-- No additional indexes needed beyond what was created with tables

-- =====================================================
-- 9. VIEWS FOR EASIER QUERYING
-- =====================================================

-- View: Complete natural client data with partner info
CREATE OR REPLACE VIEW v_natural_clients_complete AS
SELECT
    c.id,
    c.client_type,
    c.executive_in_charge,
    c.status,
    c.created_at,
    nc.*,
    cp.id as partner_id,
    cp.primer_nombre as partner_primer_nombre,
    cp.segundo_nombre as partner_segundo_nombre,
    cp.primer_apellido as partner_primer_apellido,
    cp.segundo_apellido as partner_segundo_apellido,
    cp.direccion as partner_direccion,
    cp.celular as partner_celular,
    cp.correo_electronico as partner_correo_electronico,
    cp.profesion_oficio as partner_profesion_oficio,
    cp.actividad_economica as partner_actividad_economica,
    cp.lugar_trabajo as partner_lugar_trabajo
FROM clients c
JOIN natural_clients nc ON c.id = nc.client_id
LEFT JOIN client_partners cp ON c.id = cp.client_id
WHERE c.client_type = 'natural';

-- View: Complete unipersonal client data
CREATE OR REPLACE VIEW v_unipersonal_clients_complete AS
SELECT
    c.id,
    c.client_type,
    c.executive_in_charge,
    c.status,
    c.created_at,
    nc.*,
    uc.*
FROM clients c
JOIN natural_clients nc ON c.id = nc.client_id
JOIN unipersonal_clients uc ON c.id = uc.client_id
WHERE c.client_type = 'unipersonal';

-- View: Complete juridic client data with representatives
CREATE OR REPLACE VIEW v_juridic_clients_complete AS
SELECT
    c.id,
    c.client_type,
    c.executive_in_charge,
    c.status,
    c.created_at,
    jc.*,
    json_agg(
        json_build_object(
            'id', lr.id,
            'primer_nombre', lr.primer_nombre,
            'segundo_nombre', lr.segundo_nombre,
            'primer_apellido', lr.primer_apellido,
            'segundo_apellido', lr.segundo_apellido,
            'tipo_documento', lr.tipo_documento,
            'numero_documento', lr.numero_documento,
            'extension', lr.extension,
            'is_primary', lr.is_primary,
            'cargo', lr.cargo,
            'telefono', lr.telefono,
            'correo_electronico', lr.correo_electronico
        )
    ) as legal_representatives
FROM clients c
JOIN juridic_clients jc ON c.id = jc.client_id
LEFT JOIN legal_representatives lr ON jc.client_id = lr.juridic_client_id
WHERE c.client_type = 'juridica'
GROUP BY c.id, jc.client_id;

COMMENT ON VIEW v_natural_clients_complete IS 'Natural clients with optional partner data';
COMMENT ON VIEW v_unipersonal_clients_complete IS 'Unipersonal clients with personal and commercial data';
COMMENT ON VIEW v_juridic_clients_complete IS 'Juridic clients with aggregated legal representatives';

-- =====================================================
-- 10. VALIDATION NOTES
-- =====================================================

-- IMPORTANT PRODUCTION NOTES:
-- 1. Back up all client data before running this migration
-- 2. Verify that existing natural_clients have correo_electronico and celular before making them NOT NULL
-- 3. Review nivel_ingresos data conversion (varchar to numeric)
-- 4. Review anio_ingreso data conversion (integer to date)
-- 5. Test legal_representatives nombre split logic thoroughly
-- 6. Update application code to use new field names (oficio -> profesion_oficio)
-- 7. Update application code to handle new unipersonal client type
-- 8. Update forms to collect partner data when estado_civil = 'casado'

-- =====================================================
-- END OF MIGRATION
-- =====================================================
