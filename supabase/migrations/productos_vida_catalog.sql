-- Migration: productos_vida_catalog
-- Description: Create catalog table for Vida insurance products
-- Created: 2025-12-15

-- ============================================================================
-- 1. CREATE PRODUCTOS_VIDA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.productos_vida (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.productos_vida IS 'Catálogo de productos de seguro de Vida';
COMMENT ON COLUMN public.productos_vida.id IS 'UUID del producto';
COMMENT ON COLUMN public.productos_vida.nombre IS 'Nombre del producto (debe ser único)';
COMMENT ON COLUMN public.productos_vida.descripcion IS 'Descripción detallada del producto';
COMMENT ON COLUMN public.productos_vida.activo IS 'Estado del producto (activo/inactivo)';

-- ============================================================================
-- 2. INSERT INITIAL DATA
-- ============================================================================

INSERT INTO public.productos_vida (nombre, descripcion) VALUES
('Vida producto 1', 'Producto de seguro de vida estándar con coberturas básicas'),
('Vida producto 2', 'Producto de seguro de vida premium con coberturas ampliadas');

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.productos_vida ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios autenticados pueden leer productos
CREATE POLICY "Usuarios autenticados pueden leer productos vida"
    ON public.productos_vida
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Solo admins pueden modificar productos
CREATE POLICY "Solo admins pueden modificar productos vida"
    ON public.productos_vida
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_productos_vida_activo
    ON public.productos_vida(activo)
    WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_productos_vida_nombre
    ON public.productos_vida(nombre);

-- ============================================================================
-- 5. DOCUMENT JSON STRUCTURE CHANGES IN POLIZAS
-- ============================================================================

-- Update comments to document JSON datos_especificos changes
COMMENT ON TABLE public.polizas IS 'Tabla principal de pólizas de seguros

JSON datos_especificos estructura actualizada (2025-12-15):

AUTOMOTOR:
- Added: tipo_poliza ("individual" | "corporativo")
- vehiculos array remains unchanged

ACCIDENTES PERSONALES:
- Added: prima_nivel (number) to each nivel in niveles array
- Added: cargo (string) to each asegurado in asegurados array

SALUD:
- COMPLETE RESTRUCTURE:
  - Added: niveles array [{id, nombre, monto}]
  - Added: tiene_maternidad (boolean)
  - Modified: asegurados now have nivel_id instead of rol
  - Simplified: rol is now optional ("contratante" | "titular")
  - Removed: cónyugue and dependiente roles

VIDA:
- Added: producto_id (UUID reference to productos_vida.id)
- producto field remains as display value

INCENDIO Y ALIADOS:
- Modified: bienes structure changed
  - Removed: valor_declarado field
  - Added: items array [{nombre, monto}] with 7 predefined item types
  - Added: valor_total_declarado (calculated from items sum)
- valor_asegurado now equals sum of all bienes valor_total_declarado

RESPONSABILIDAD CIVIL:
- Removed: moneda field (use policy-wide moneda)
- Removed: asegurados array (not needed for this ramo)

RIESGOS VARIOS MISCELÁNEOS:
- Modified: convenio fields changed from number to object {habilitado, monto}
  - convenio_1_infidelidad_empleados
  - convenio_2_perdidas_dentro_local
  - convenio_3_perdidas_fuera_local
- Added: convenio_4_pendiente {habilitado, monto}
- Added: convenio_5_pendiente {habilitado, monto}
- Removed: moneda field (use policy-wide moneda)
- valor_total_asegurado now calculated from enabled convenios only

SEPELIO:
- No structural changes
- New feature: Excel bulk import for asegurados (CI + nivel_nombre validation)
';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on the table to authenticated users
GRANT SELECT ON public.productos_vida TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.productos_vida TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify products were created
DO $$
DECLARE
    product_count integer;
BEGIN
    SELECT COUNT(*) INTO product_count FROM public.productos_vida;
    RAISE NOTICE 'Migration completed successfully. % productos_vida records created.', product_count;
END $$;
