Esta es una lista de todos los diferentes formularios necesarios para crear una nueva poliza segun el ramo de la misma, tomar en cuenta que estas son las variaciones del paso 3 de la implementacion en el sistema de registro de polizas:
Orden: implementar todos los formularios con detalles provistos y dejar un mensaje temporal de "en trabajo" si no se encuentra el formulario especifico para el ramo

1. Campos obligatorios salud:

-   tipo de poliza (dropdown individual o corporativo)
-   Suma asegurada (numero)
-   Regional Asegurado (dropdown regional de los 9 departamentos de Bolivia fijo)
-   busqueda de cliente para ir agregando a una lista de 1 o mas asegurados, se debe definir en cada cliente seleccionado su rango (contratante, titular, conyugue, dependiente) pueden haber uno o mas dependientes pero solo 1 contratante, 1 titular y 1 conyugue, el contratante esta separado del titular porque puede ser una empresa la que contrata el seguro para sus empleados, se puede repetir la misma persona para contratante y titular que son las dos personas minimas necesarias. boton de agregar asegurado

2. campos obligatorios Incendio y aliados:

-   tipo de poliza (dropdown individual o corporativo)
-   regional asegurado (dropdown regional de los 9 departamentos de Bolivia fijo)
-   busqueda de cliente para ir agregando a una lista de 1 o mas asegurados
-   valor asegurado (numero)
-   direccion del bien asegurado (texto) 1 o mas direcciones admitidas
-   valor declarado $ (numero) que va junto a la direccion del bien asegurado 1 por cada direccion
-   PRIMER RIESGO: marcar la direccion principal del bien asegurado

*   se pueden tener N bienes asegurados en una misma poliza

3. campos obligatorios de responsabilidad civil:

-   tipo de poliza (dropdown individual o corporativo)
-   VALOR ASEGURADO: BS/USD
-   busqueda de cliente para ir agregando a una lista de 1 o más asegurados

4. campos obligatorios de Riesgos varios misceláneos:
   COBERTURAS:

-   CONVENIO 1 INFIDELIDAD DE EMPLEADOS (numero) Bs/USD
-   CONVENIO 2 PERDIDAS DENTRO DEL LOCAL (numero) Bs/USD
-   CONVENIO 3 PERDIDAS FUERA DENTRO DEL LOCALES (numero) Bs/USD
-   VALOR TOTAL ASEGURADO con moneda BS/USD
-   busqueda de cliente para ir agregando a una lista de 1 o más asegurados

5. En las polizas de accidentes personales, Vida y Sepelio se tiene un formulario previo antes del paso 3 que llamaremos paso especial 2.1 donde se deben definir los niveles de cobertura que tiene la poliza, esto es unico para Accidentes personales y Vida, y se declara de la siguiente manera:

-   se tiene una seccion donde se puede habilitar o deshabilitar las siguientes coberturas para Accidentes personales:
    [X] MUERTE ACCIDENTAL
    [X] INVALIDEZ TOTAL/PARCIAL
    [X] GASTOS MEDICOS
    [X] SEPELIO
-   para Vida:
    [X] MUERTE (por cualquier causa)
    [X] DIMA
    [X] SEPELIO
    [X] GASTOS MEDICOS
    [X] INDM POR ENFERMEDADES GRAVES
-   para Sepelio de corto y largo plazo:
    [X] SEPELIO
-   si se habilita la cobertura se debe agregar el valor asegurado de la misma
-   cuando todo haya sido configurado propiamente se debe hacer un boton de "crear nivel" para agregar un nuevo nivel de cobertura (Nivel 1, nivel 2, etc) ya se que se pueden tener N niveles de cobertura
-   una vez se haya concluido esta configuracion previa recién se va al paso 3 que es el formulario principal de la poliza

*   campos obligatorios de Accidentes personales, tambien de polizas de Vida y tambien de polizas de Sepelio:

-   tipo de poliza (dropdown individual o corporativo)
-   regional asegurado (dropdown regional de los 9 departamentos de Bolivia fijo)
-   busqueda de cliente y asignacion de su nivel previamente configurado en el paso 2.1, se pueden tener N asegurados con 1 solo nivel de cobertura

*   campos opcionales de Accidentes personales, tambien de polizas de Vida y tambien de polizas de Sepelio:

-   Producto (texto)

errores a solucionar:

1. feedback a implementar en polizas automotor
1. poliza automotor no se sube a la db
1. no se cargan archivos a la db, algo parece estar mal
1. cuales son los esquemas para la db en los seguros de salud, incendio, responsabilidad civil, riesgos varios miscelaneos, accidentes personales, vida y sepelio
1. muchos errores de lint
1. agregar seguridad RLS a la db
1. optimizar querys de la db
1. optimizar frontend de polizas

-   trabajar en seccion de edicion de datos de polizas
-   mejorar el modulo de creacion de clientes
-   PR de refactorizacion de modulo de polizas para mover validaciones de campos a Zod y no hacerlo manual
-   modulo cobranzas de polizas
-   modulo de siniestros
-   centralizacion de constantes de validacion en todos los modulos
-   optimizacion para eliminacion periodica de archivos "eliminados" de supabase cada 90 dias

mejoraremos partes del flujo de creacion de las polizas nuevas en los siguientes aspectos paso por paso, te ire dando cada paso a mejorar gradualmente:
Paso 2:
[] no deberia ser posible la creacion de nuevas categorias desde este módulo, borrar toda logica de ello y recordar agregarlo en un futuro dentro del modulo de administracion del sistema
[] cambiar el nombre del campo "categorias" por "Grupo de negocios"
[] grupo de negocios debe ser opcional no obligatorio
[] NUEVO campo "Grupo de produccion" dropdown con generales/personales
[] la moneda a nivel de toda la poliza debe ser seleccionable desde este paso

Paso 3 Automotor:
[] NUEVO campo coaseguro tipo porcentaje de 0% a 100%
[] Franquicia numero parametrizado 700, 1000, 1400 Bs
[] NUEVO tipo de vehiculo "Semiremolque" y "Tracto Camion", quitar vehiculo Trailer
[] extender marcas de vehiculos a
[] año del vehiculo no debe aceptar caracteres solo numeros de años desde 1950 a 2050
[] plaza ciruculacion dropdown 9 departamentos
[] visualizacion de decimales con coma no punto

Paso 4:
[] fecha de pago no puede ser mayor a la vigencia, advertir pero no bloquear
[] fecha de pago si puede ser el mismo dia que se inicia la vigencia, se esta detectando una falso error que indica "Fecha de pago no puede ser anterior a hoy" cuando se selecciona hoy como la fecha de pago al contado o pago inicial
[] al escoger a credito se debe primero llenar la prima total, cantidad de cuotas, cuota inicial, NUEVO fecha inicial y NUEVO periodos de pago para cuotas (mensual, trimestral, semestral) con eso se presiona el NUEVO boton "generar cuotas" que genera la tabla de cuotas con las fechas correspondientes
[] las cuotas van de 1 a N cuotas no es necesario marcar la 1ra como "Inicial" solo con el color se sobreentiende
[] no mas de 12 cuotas desde el inicio de vigencia, quiza cambiar el input numerico por un slider de 1 a 12
[] si no se ingresa cuota inicial al generar la tabla de cuotas se asume que esta poliza fue iniciada por otra compañia y se debe ser capaz de cambiar los numeros de cuota para reflejar que en el sistema se esta cargando desde por ejemplo la cuota 5 en adelante
[] todos los campos de cuota y de fecha de cuota deben ser editables, actualmente la cuota inicial no lo es
[] ninguna fecha de cuota excederan el fin de vigencia, advertir y no dejar pasar al siguiente paso
[] al corregir los errores de este paso las advertencias no se borran

Paso 5:
[] se pueden cargar correos de outlook descargados .MSG .EML
[] los documentos no se están guardando en la base de datos, revisar configuraciones de supabase y lógica de carga de archivos, los archivos no deberian exceder los 20Mb de tamaño

"Director comercial" visualizacion a detalle
NUEVO boton de impresion de detalles

Incencidos>
ubicacion del bien
