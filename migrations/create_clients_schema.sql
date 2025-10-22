-- Migration: Create comprehensive clients management schema
-- This schema handles both natural (human) and juridic (company) clients
-- with tier-based data requirements based on premium amounts

-- =====================================================
-- 1. BASE CLIENTS TABLE (Shared across all client types)
-- =====================================================

CREATE TABLE clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_type varchar(20) NOT NULL CHECK (client_type IN ('natural', 'juridica')),
    executive_in_charge text, -- Reference to executive managing this client
    status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- =====================================================
-- 2. NATURAL CLIENTS TABLE (Human individuals)
-- =====================================================

CREATE TABLE natural_clients (
    client_id uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,

    -- TIER 1: Required for all natural clients (up to $1000 premium)
    primer_nombre varchar(100) NOT NULL,
    segundo_nombre varchar(100),
    primer_apellido varchar(100) NOT NULL,
    segundo_apellido varchar(100),
    tipo_documento varchar(50) NOT NULL, -- CI, Pasaporte, DNI, etc.
    numero_documento varchar(50) NOT NULL,
    extension_ci varchar(5), -- LP, CB, SC, OR, PT, TJ, CH, BE, PD
    nacionalidad varchar(100) NOT NULL DEFAULT 'Boliviana',
    fecha_nacimiento date NOT NULL,
    estado_civil varchar(50), -- Soltero/a, Casado/a, Divorciado/a, Viudo/a, Unión Libre
    direccion text NOT NULL,
    oficio varchar(200),

    -- TIER 2: Required for $1001-$5000 premium
    celular varchar(20),
    actividad_economica varchar(200),
    lugar_trabajo varchar(200),

    -- TIER 3: Required for above $5000 premium
    correo_electronico varchar(255),
    pais_residencia varchar(100) DEFAULT 'Bolivia',
    genero varchar(20) CHECK (genero IN ('Masculino', 'Femenino', 'Otro')),
    nivel_ingresos varchar(100), -- e.g., "0-5000", "5001-10000", etc.
    cargo varchar(200),
    anio_ingreso integer,
    nit varchar(50),
    domicilio_comercial text,

    -- METADATA
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- CONSTRAINTS
    CONSTRAINT unique_natural_documento UNIQUE (tipo_documento, numero_documento),
    CONSTRAINT valid_email CHECK (correo_electronico IS NULL OR correo_electronico ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_fecha_nacimiento CHECK (fecha_nacimiento <= CURRENT_DATE AND fecha_nacimiento >= '1900-01-01')
);

-- =====================================================
-- 3. JURIDIC CLIENTS TABLE (Companies/Organizations)
-- =====================================================

CREATE TABLE juridic_clients (
    client_id uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,

    -- REQUIRED COMPANY INFORMATION
    razon_social varchar(255) NOT NULL,
    tipo_sociedad varchar(100), -- SRL, SA, Unipersonal, Fundación, ONG, etc.
    tipo_documento varchar(50) NOT NULL DEFAULT 'NIT',
    nit varchar(50) NOT NULL,
    matricula_comercio varchar(100), -- SEPREC registration number
    pais_constitucion varchar(100) NOT NULL DEFAULT 'Bolivia',
    direccion_legal text NOT NULL,
    actividad_economica varchar(200) NOT NULL,
    correo_electronico varchar(255),
    telefono varchar(20),

    -- METADATA
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- CONSTRAINTS
    CONSTRAINT unique_juridic_nit UNIQUE (nit),
    CONSTRAINT valid_juridic_email CHECK (correo_electronico IS NULL OR correo_electronico ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- 4. LEGAL REPRESENTATIVES TABLE (for juridic clients)
-- =====================================================

CREATE TABLE legal_representatives (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    juridic_client_id uuid NOT NULL REFERENCES juridic_clients(client_id) ON DELETE CASCADE,

    -- REPRESENTATIVE INFORMATION
    nombre varchar(100) NOT NULL,
    primer_apellido varchar(100) NOT NULL,
    segundo_apellido varchar(100),
    tipo_documento varchar(50) NOT NULL,
    numero_documento varchar(50) NOT NULL,
    extension varchar(5),

    -- ADDITIONAL INFO
    is_primary boolean DEFAULT true, -- Primary legal representative
    cargo varchar(200), -- Position: Gerente General, Representante Legal, etc.
    telefono varchar(20),
    correo_electronico varchar(255),

    -- METADATA
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- CONSTRAINTS
    CONSTRAINT unique_rep_documento UNIQUE (juridic_client_id, tipo_documento, numero_documento),
    CONSTRAINT valid_rep_email CHECK (correo_electronico IS NULL OR correo_electronico ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- 5. POLICIES TABLE (Insurance policies linked to clients)
-- =====================================================

CREATE TABLE policies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

    -- POLICY DETAILS
    policy_number varchar(100) NOT NULL,
    insurance_type varchar(50) NOT NULL CHECK (insurance_type IN ('salud', 'automotor', 'vida', 'general')),
    status varchar(20) NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'vencida', 'cancelada', 'pendiente')),
    start_date date NOT NULL,
    expiration_date date NOT NULL,
    premium_usd decimal(10, 2) NOT NULL CHECK (premium_usd >= 0),

    -- ADDITIONAL INFO
    beneficiary_name varchar(255),
    coverage_details text,
    notes text,

    -- METADATA
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- CONSTRAINTS
    CONSTRAINT unique_policy_number UNIQUE (policy_number),
    CONSTRAINT valid_dates CHECK (expiration_date > start_date)
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Clients table indexes
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_executive ON clients(executive_in_charge);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);

-- Natural clients indexes
CREATE INDEX idx_natural_documento ON natural_clients(numero_documento);
CREATE INDEX idx_natural_nombre ON natural_clients(primer_nombre, primer_apellido);
CREATE INDEX idx_natural_nit ON natural_clients(nit) WHERE nit IS NOT NULL;

-- Juridic clients indexes
CREATE INDEX idx_juridic_nit ON juridic_clients(nit);
CREATE INDEX idx_juridic_razon ON juridic_clients(razon_social);

-- Legal representatives indexes
CREATE INDEX idx_legal_rep_juridic ON legal_representatives(juridic_client_id);
CREATE INDEX idx_legal_rep_primary ON legal_representatives(juridic_client_id, is_primary) WHERE is_primary = true;

-- Policies indexes
CREATE INDEX idx_policies_client ON policies(client_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_expiration ON policies(expiration_date);
CREATE INDEX idx_policies_number ON policies(policy_number);
CREATE INDEX idx_policies_active ON policies(client_id, status) WHERE status = 'vigente';

-- =====================================================
-- 7. FUNCTIONS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

CREATE TRIGGER trigger_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_natural_clients_updated_at
    BEFORE UPDATE ON natural_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_juridic_clients_updated_at
    BEFORE UPDATE ON juridic_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_legal_representatives_updated_at
    BEFORE UPDATE ON legal_representatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE natural_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE juridic_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- Clients table RLS policies
CREATE POLICY "Allow authenticated users to view clients"
    ON clients FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert clients"
    ON clients FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update clients"
    ON clients FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin users to delete clients"
    ON clients FOR DELETE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Natural clients RLS policies (inherits from clients)
CREATE POLICY "Allow authenticated users to view natural clients"
    ON natural_clients FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage natural clients"
    ON natural_clients FOR ALL
    USING (auth.role() = 'authenticated');

-- Juridic clients RLS policies (inherits from clients)
CREATE POLICY "Allow authenticated users to view juridic clients"
    ON juridic_clients FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage juridic clients"
    ON juridic_clients FOR ALL
    USING (auth.role() = 'authenticated');

-- Legal representatives RLS policies
CREATE POLICY "Allow authenticated users to view legal representatives"
    ON legal_representatives FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage legal representatives"
    ON legal_representatives FOR ALL
    USING (auth.role() = 'authenticated');

-- Policies table RLS policies
CREATE POLICY "Allow authenticated users to view policies"
    ON policies FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage policies"
    ON policies FOR ALL
    USING (auth.role() = 'authenticated');

-- =====================================================
-- 10. HELPER FUNCTIONS FOR COMMON QUERIES
-- =====================================================

-- Function to get total active premium for a client
CREATE OR REPLACE FUNCTION get_client_active_premium(p_client_id uuid)
RETURNS decimal AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(premium_usd), 0)
        FROM policies
        WHERE client_id = p_client_id
        AND status = 'vigente'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get active policy count for a client
CREATE OR REPLACE FUNCTION get_client_active_policy_count(p_client_id uuid)
RETURNS integer AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::integer
        FROM policies
        WHERE client_id = p_client_id
        AND status = 'vigente'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to determine required tier based on total premium
CREATE OR REPLACE FUNCTION get_required_tier_for_premium(p_premium_usd decimal)
RETURNS integer AS $$
BEGIN
    IF p_premium_usd <= 1000 THEN
        RETURN 1;
    ELSIF p_premium_usd <= 5000 THEN
        RETURN 2;
    ELSE
        RETURN 3;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE clients IS 'Base table for all clients (natural and juridic)';
COMMENT ON TABLE natural_clients IS 'Natural persons (human individuals) with tier-based data requirements';
COMMENT ON TABLE juridic_clients IS 'Juridic persons (companies/organizations)';
COMMENT ON TABLE legal_representatives IS 'Legal representatives for juridic clients';
COMMENT ON TABLE policies IS 'Insurance policies linked to clients';

COMMENT ON COLUMN natural_clients.primer_nombre IS 'Required for all tiers';
COMMENT ON COLUMN natural_clients.celular IS 'Required from tier 2 ($1001+)';
COMMENT ON COLUMN natural_clients.correo_electronico IS 'Required from tier 3 ($5001+)';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
