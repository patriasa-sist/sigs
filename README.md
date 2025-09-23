falta hacer que se detecte bien cuando se viene desde el email y te lleve directo a hacerte una contraseña, eso no funciona todavia

TODO Principal:
[x] borrar todo lo relacionado con prima del dashboard de datos cargados
[x] el ciasvp deber ser el dato que ingrese el ramo correcto en cada poliza y debe mostrarse en vez de la columna de prima en el dashboard
[x] el ramo deberia poder modificarse para casos especiales
[x] que la fecha sea de inicio y de fin en los datos de la tabla seguros
[x] que se muestre valor asegurado solo al final de la poliza salud y automotor
[x] cambiar prima de renovacion a valor asegurado en carta de salud
[x] que en asegurados de salud se pueda escoger y se muestre si es titular, conyugue o dependiente
[x] que tenga el texto de descargo de valores actualizados
[x] que la carta tenga info de contacto
[x] que la carta tenga firma de ejecutivo digitalizada sin sello y con pie de firma
[x] que el sistema detecte la columna nueva de tipo Moneda y cambie su parametro en la pantalla de generacion de la carta
[x] el nro de carta sea automatico segun el esquema: SCPSA-[executive glyph]-[serie from supabase 001 to 999]-[year]-[month]
[x] funcion para leer datos de la tabla tipo_seguro y comparar con datos del excel a la hora de subirlo

TODO REVISION CARTAS:
[x] quitar linea de firma de carta generada
[x] resaltar zona de notas escritas
[x] cuando se actualicen valores de asegurados, que se actualice el valor asegurado total de la carta
[x] opción de selección Bs/Sus para valor asegurado del automovil
[x] nombre de archivo cambiado segun nuevo formato: [year]_[month]_[serie from supabase 001 to 999]_vencPol_[Ramo]\_[nombre asegurado].pdf
[x] dos firmas en la carta (jefe 2da firma)
[x] extender campos de los filtros de selección en el dashboard de vencimientos
[x] quitar letra italica de la carta de salud
[x] convertir numero de telefono a link de whatsapp
[x] ajustar automaticamente la 1er letra de las condiciones extra ingresadas a mayuscula
[x] cabecera modificar "señor", "señora" inconsistente por "señor/a" y "señores"(corporativo)
[x] AUTOMOTOR>deducible que se pueda poner texto no solo numeros
[x] (gramatica) modificar preferencial por personalizada
[x] (gramatica) Requerimos >> Recomendamos
[x] (gramatica) de estas >> su regularizacion
[x] (gramatica) con su ejecutivo >> con nosotros
[xxx] en la carta debe estar fijo el mensaje de que su siguiente poliza se emitirá en bolivianos, excepto transporte y todoriesgo

[x] habilitar numero y correo del cliente como link
[x] pasar excel con parametrizacion de ramos a Marco
[x] 9112 es seguro de salud, tratarlo como tal
[x] sin incremento de valor asegurado en AP 9112 agregar en el excel
[x] agregar forma de modificar el ejecutivo
[x] agregar advertencias cuando no existe ejecutivo o se ha cambiado
[x] (performance) modificadas varias funciones que podian desbordar memoria, eliminados procesos paralelos

[] modificar texto de cartas (pedir cartas Flavio)
[x] agregar columna de PRODUCTO a excel para agregar manualmente
[x] agregar seguridad de datos en caso de cambiar el producto manualmente
[] codificar nombres de compañias segun codigo aps (pedir excel Flavio)
[] detectar si es Alianza y seguro general para forzar la plantilla

[] codificar productos segun ultimos numeros de PUC

NOTAS EXTRA:

-   SALUD:

    1. Nos permitimos recordarle que los seguros de Salud o Enfermedad se pagan por adelantado, al
       inicio de la vigencia, sea mensual o anual.
       Le informamos que a partir del _01/05/2025_, se excluye la cobertura del certificado asistencia al viajero y las pólizas se emiten en moneda nacional (BS)

-   AUTOMOTOR:
    Debido al incremento generalizado en el valor de ciertos activos, es posible que tus bienes estén asegurados por montos inferiores a su valor actual. Esta situación podría afectar la indemnización en caso de siniestro.
    Por ello, es fundamental revisar y actualizar los valores asegurados de tus pólizas, con el fin de garantizar una cobertura adecuada y efectiva ante cualquier eventualidad.

DESCARGO DE NO RENOVACION:
Es importante informarle que en caso de tener primas pendientes no se podrá renovar hasta su regularización,
la NO RENOVACION, suspende toda cobertura de la póliza de seguro.

TABLAS DE SEGUROS

```sql
-- Crear tabla para tipos de seguros con estructura jerárquica
CREATE TABLE tipos_seguros (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE, -- ej: "91", "9101", "9102"
    nombre VARCHAR(255) NOT NULL,
    es_ramo_padre BOOLEAN DEFAULT FALSE,
    ramo_padre_id INTEGER REFERENCES tipos_seguros(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- Crear índices para optimizar consultas
CREATE INDEX idx_tipos_seguros_ramo_padre ON tipos_seguros(ramo_padre_id);
CREATE INDEX idx_tipos_seguros_codigo ON tipos_seguros(codigo);
CREATE INDEX idx_tipos_seguros_es_ramo_padre ON tipos_seguros(es_ramo_padre);

-- Insertar los datos basados en tu lista
INSERT INTO tipos_seguros (codigo, nombre, es_ramo_padre, ramo_padre_id) VALUES

-- RAMOS PADRES
('91', 'Seguros Generales', TRUE, NULL),
('92', 'Seguros de Fianzas', TRUE, NULL),
('93', 'Seguros de Personas', TRUE, NULL),
('94', 'Seguros Obligatorios', TRUE, NULL),
('96', 'Seguros Previsionales', TRUE, NULL),

-- SEGUROS GENERALES (hijos del ramo 91)
('9101', 'Incendio y aliados', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9102', 'Robo', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9103', 'Transportes', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9104', 'Naves o embarcaciones', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9105', 'Automotores', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9106', 'Aeronavegación', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9107', 'Ramos técnicos', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9108', 'Responsabilidad civil', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9109', 'Riesgos varios misceláneos', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9110', 'Agropecuario', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9111', 'Salud o enfermedad', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),
('9112', 'Accidentes personales', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '91')),

-- SEGUROS DE FIANZAS (hijos del ramo 92)
('9221', 'Seriedad de propuesta', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9222', 'Cumplimiento de obra', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9223', 'Buena ejecución de obra', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9224', 'Cumplimiento de servicios', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9225', 'Cumplimiento de suministros', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9226', 'Inversión de anticipos', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9227', 'Fidelidad de empleados', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9228', 'Créditos', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9229', 'Cumplimiento de Obligaciones Aduaneras', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),
('9230', 'Cumplimiento de Obligaciones Legales y Contractuales de Telecomunicaciones', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '92')),

-- SEGUROS DE PERSONAS (hijos del ramo 93)
('9341', 'Vida individual largo plazo', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9342', 'Vida individual corto plazo', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9343', 'Rentas', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9344', 'Defunción o sepelio largo plazo', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9345', 'Defunción o sepelio corto plazo', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9346', 'Vida en grupo corto plazo', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9347', 'Salud o enfermedad', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9348', 'Desgravamen hipotecario largo plazo', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9349', 'Desgravamen hipotecario corto plazo', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),
('9350', 'Accidentes personales', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '93')),

-- SEGUROS OBLIGATORIOS (hijos del ramo 94)
('9455', 'Accidentes de tránsito', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '94')),
('9505', 'Servicios de Pre-Pago', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '94')),
('9561', 'Salud o enfermedad', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '94')),
('9562', 'Defunción o sepelio', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '94')),

-- SEGUROS PREVISIONALES (hijos del ramo 96)
('9674', 'Vitalicios', FALSE, (SELECT id FROM tipos_seguros WHERE codigo = '96'));

-- Función para obtener todos los ramos hijos de un ramo padre
CREATE OR REPLACE FUNCTION obtener_ramos_hijos(padre_codigo VARCHAR)
RETURNS TABLE(
    id INTEGER,
    codigo VARCHAR,
    nombre VARCHAR
) AS $
BEGIN
    RETURN QUERY
    SELECT ts.id, ts.codigo, ts.nombre
    FROM tipos_seguros ts
    INNER JOIN tipos_seguros padre ON ts.ramo_padre_id = padre.id
    WHERE padre.codigo = padre_codigo
    AND ts.activo = TRUE
    ORDER BY ts.codigo;
END;
$ LANGUAGE plpgsql;

-- Función para obtener la estructura completa
CREATE OR REPLACE FUNCTION obtener_estructura_seguros()
RETURNS TABLE(
    ramo_padre VARCHAR,
    ramo_padre_nombre VARCHAR,
    ramo_hijo_codigo VARCHAR,
    ramo_hijo_nombre VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        padre.codigo as ramo_padre,
        padre.nombre as ramo_padre_nombre,
        hijo.codigo as ramo_hijo_codigo,
        hijo.nombre as ramo_hijo_nombre
    FROM tipos_seguros padre
    LEFT JOIN tipos_seguros hijo ON hijo.ramo_padre_id = padre.id
    WHERE padre.es_ramo_padre = TRUE
    AND padre.activo = TRUE
    ORDER BY padre.codigo, hijo.codigo;
END;
$$ LANGUAGE plpgsql;
```
