-- ============================================
-- Sistema de Productos por Aseguradora/Ramo
-- Permite definir comisiones dinámicas basadas en la combinación compañía + ramo
-- ============================================

-- Fase 1.1: Crear tabla productos_aseguradoras
CREATE TABLE IF NOT EXISTS productos_aseguradoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compania_aseguradora_id UUID NOT NULL REFERENCES companias_aseguradoras(id),
    tipo_seguro_id INTEGER NOT NULL REFERENCES tipos_seguros(id),
    codigo_producto VARCHAR(20) NOT NULL,
    nombre_producto TEXT NOT NULL,
    factor_contado DECIMAL(10,4) NOT NULL DEFAULT 35.0000,
    factor_credito DECIMAL(10,4) NOT NULL DEFAULT 40.0000,
    porcentaje_comision DECIMAL(5,4) NOT NULL DEFAULT 0.1500,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraint: código único por compañía + tipo de seguro
    CONSTRAINT productos_codigo_unico UNIQUE (compania_aseguradora_id, tipo_seguro_id, codigo_producto),
    -- Validaciones de rango
    CONSTRAINT factor_contado_positivo CHECK (factor_contado > 0),
    CONSTRAINT factor_credito_positivo CHECK (factor_credito > 0),
    CONSTRAINT porcentaje_comision_rango CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 1)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_productos_compania ON productos_aseguradoras(compania_aseguradora_id);
CREATE INDEX IF NOT EXISTS idx_productos_tipo_seguro ON productos_aseguradoras(tipo_seguro_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos_aseguradoras(activo) WHERE activo = true;

-- Comentarios de documentación
COMMENT ON TABLE productos_aseguradoras IS 'Catálogo de productos por aseguradora y tipo de seguro con factores de cálculo de comisiones';
COMMENT ON COLUMN productos_aseguradoras.factor_contado IS 'Factor para calcular prima neta en pago contado. Fórmula: prima_neta = prima_total / (factor/100 + 1)';
COMMENT ON COLUMN productos_aseguradoras.factor_credito IS 'Factor para calcular prima neta en pago a crédito. Fórmula: prima_neta = prima_total / (factor/100 + 1)';
COMMENT ON COLUMN productos_aseguradoras.porcentaje_comision IS 'Porcentaje de comisión sobre prima neta. Valor decimal entre 0 y 1 (ej: 0.15 = 15%)';

-- ============================================
-- Fase 1.2: Modificar tabla profiles (agregar porcentaje_comision usuario)
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS porcentaje_comision DECIMAL(5,4) DEFAULT 0.5000;

-- Agregar constraint solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_porcentaje_comision_rango'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_porcentaje_comision_rango
        CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 1);
    END IF;
END$$;

COMMENT ON COLUMN profiles.porcentaje_comision IS 'Porcentaje de comisión que recibe el usuario (encargado) sobre la comisión de la empresa. Valor decimal entre 0 y 1';

-- ============================================
-- Fase 1.3: Modificar tabla polizas
-- ============================================

-- Primero, eliminar vistas dependientes que usan p.*
DROP VIEW IF EXISTS polizas_con_auditoria CASCADE;

-- Agregar columnas nuevas
ALTER TABLE polizas
ADD COLUMN IF NOT EXISTS producto_id UUID REFERENCES productos_aseguradoras(id),
ADD COLUMN IF NOT EXISTS comision_empresa DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS comision_encargado DECIMAL(12,2);

-- Verificar si prima_neta es columna GENERATED para reconstruir
DO $$
DECLARE
    is_generated BOOLEAN;
BEGIN
    SELECT attgenerated != '' INTO is_generated
    FROM pg_attribute
    WHERE attrelid = 'polizas'::regclass
    AND attname = 'prima_neta';

    IF is_generated THEN
        -- Eliminar columna GENERATED y recrear como normal
        ALTER TABLE polizas DROP COLUMN IF EXISTS prima_neta;
        ALTER TABLE polizas ADD COLUMN prima_neta DECIMAL(12,2);
    END IF;
END$$;

-- Verificar si comision es columna GENERATED para reconstruir
DO $$
DECLARE
    is_generated BOOLEAN;
BEGIN
    SELECT attgenerated != '' INTO is_generated
    FROM pg_attribute
    WHERE attrelid = 'polizas'::regclass
    AND attname = 'comision';

    IF is_generated THEN
        -- Eliminar columna GENERATED y recrear como normal
        ALTER TABLE polizas DROP COLUMN IF EXISTS comision;
        ALTER TABLE polizas ADD COLUMN comision DECIMAL(12,2);
    END IF;
END$$;

COMMENT ON COLUMN polizas.producto_id IS 'Referencia al producto de la aseguradora usado para calcular comisiones';
COMMENT ON COLUMN polizas.comision_empresa IS 'Comisión total para la empresa = prima_neta * porcentaje_comision_producto';
COMMENT ON COLUMN polizas.comision_encargado IS 'Comisión para el encargado = comision_empresa * porcentaje_comision_usuario';

-- Recrear la vista polizas_con_auditoria con TODAS las columnas actuales + nuevas
CREATE OR REPLACE VIEW polizas_con_auditoria AS
SELECT
    p.id,
    p.client_id,
    p.numero_poliza,
    p.compania_aseguradora_id,
    p.ramo,
    p.inicio_vigencia,
    p.fin_vigencia,
    p.fecha_emision_compania,
    p.responsable_id,
    p.regional_id,
    p.categoria_id,
    p.modalidad_pago,
    p.prima_total,
    p.moneda,
    p.prima_neta,
    p.comision,
    p.estado,
    p.created_at,
    p.updated_at,
    p.created_by,
    p.updated_by,
    p.validado_por,
    p.fecha_validacion,
    p.grupo_produccion,
    p.producto_id,
    p.comision_empresa,
    p.comision_encargado,
    c_user.full_name AS creado_por_nombre,
    c_user.email AS creado_por_email,
    u_user.full_name AS editado_por_nombre,
    u_user.email AS editado_por_email,
    r.full_name AS responsable_nombre,
    comp.nombre AS compania_nombre,
    reg.nombre AS regional_nombre,
    cat.nombre AS categoria_nombre,
    cli.client_type AS tipo_cliente
FROM polizas p
LEFT JOIN profiles c_user ON p.created_by = c_user.id
LEFT JOIN profiles u_user ON p.updated_by = u_user.id
LEFT JOIN profiles r ON p.responsable_id = r.id
LEFT JOIN companias_aseguradoras comp ON p.compania_aseguradora_id = comp.id
LEFT JOIN regionales reg ON p.regional_id = reg.id
LEFT JOIN categorias cat ON p.categoria_id = cat.id
LEFT JOIN clients cli ON p.client_id = cli.id;

COMMENT ON VIEW polizas_con_auditoria IS 'Vista con información completa de pólizas incluyendo nombres de usuarios para auditoría';

-- ============================================
-- Fase 1.4: RLS para productos_aseguradoras
-- ============================================
ALTER TABLE productos_aseguradoras ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a todos los usuarios autenticados
DROP POLICY IF EXISTS "productos_select_authenticated" ON productos_aseguradoras;
CREATE POLICY "productos_select_authenticated" ON productos_aseguradoras
    FOR SELECT TO authenticated USING (true);

-- Permitir todas las operaciones solo a administradores
DROP POLICY IF EXISTS "productos_admin_all" ON productos_aseguradoras;
CREATE POLICY "productos_admin_all" ON productos_aseguradoras
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- Trigger para actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_productos_aseguradoras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_productos_aseguradoras_updated_at ON productos_aseguradoras;
CREATE TRIGGER trigger_update_productos_aseguradoras_updated_at
    BEFORE UPDATE ON productos_aseguradoras
    FOR EACH ROW
    EXECUTE FUNCTION update_productos_aseguradoras_updated_at();

-- ============================================
-- Vista para productos con nombres de catálogos
-- ============================================
CREATE OR REPLACE VIEW productos_aseguradoras_vista AS
SELECT
    p.id,
    p.compania_aseguradora_id,
    ca.nombre AS compania_nombre,
    p.tipo_seguro_id,
    ts.nombre AS tipo_seguro_nombre,
    ts.codigo AS tipo_seguro_codigo,
    p.codigo_producto,
    p.nombre_producto,
    p.factor_contado,
    p.factor_credito,
    p.porcentaje_comision,
    p.activo,
    p.created_at,
    p.updated_at
FROM productos_aseguradoras p
JOIN companias_aseguradoras ca ON p.compania_aseguradora_id = ca.id
JOIN tipos_seguros ts ON p.tipo_seguro_id = ts.id;

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
