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
1. modificar riesgos varios miscelaneos
1. muchos errores de lint
1. agregar seguridad RLS a la db
1. optimizar querys de la db
1. optimizar frontend de polizas

el paso 3 para las siguientes polizas no es visible a pesar de que ya fue programado:
Accidentes personales (general y personas)
Defuncion o Sepelio
Defuncion o Sepelio corto y largo plazo
Vida en grupo corto plazo
Vida individual corto y largo plazo

en salud al buscar a los asegurados se deberia poder volver a seleccionar al mismo cliente que ya se agrego
Aeronavegacion agregado?

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

## Cobranzas (listo)

crearemos el módulo de cobranza, este módulo solo tienen acceso las cuentas marcadas como cobranza y la visualización es similar a la de las pólizas, pero se centra en ser capaz de visualizar ques cuentas tienen cobranzas pendientes para cobrar y luego actualizar las cuotas como pagadas. Puede suceder que un cliente pague más o menos en su cuota pendiente y esto debe repercutir en la actualización de las demás cuotas pendientes. En otras palabras el agente de cobranza debe ser capaz de modificar las cuotas pendientes más no las cuotas ya pagadas.

1. Cuotas Vencidas: Solo se pueden pagar dentro del mismo mes de vencimiento
2. Roles: Solo "cobranza" y "admin" tienen acceso al módulo
3. Excesos: Deben redistribuirse completamente antes de confirmar
4. RLS: Las policies permiten SELECT/UPDATE solo a cobranza y admin

## clientes feedback (Listo)

sociedad con rubrica y detalle
2do apellido obligatorio
CEX NUEVO DOCUMENTO
CONYUGUE OPCIONAL
Bolivia residencia obligatorio
obl profesion
unipersonal nro telefono comercial
agregar es el mismo
documento seprec opcional unipersonal
Información de Contacto-cobranza una o mas
ACCIONISTAS o SOCIOS: nombre, carnet, porcentaje (puede existir sin accionistas)
RENOVACION DE POLIZA EXIGE RENOVACION DE DOCUMENTOS
carta de nombramiento todos clientes
botón para ver detalles de la póliza
visualización cliente>póliza agregar compañía
ejecutivo visible
agente visible
paso extra para datos de facturacion

NUEVO tipo de cliente llamado "asegurado" con datos minimos

form extra accionista
todos datos obligatorios en natural excepto salario

POlizas
Ci cambiar por vigencia fecha inicio-fecha fin
visualización rapida>compañía
anexos inclusion/exclusion visualizan dentro de la misma poliza

Cobranza
modificación de datos bloqueados bajo solicitud

## polizas feedback

8 12 25
Paso1
NUEVO opción de seleccionar Asegurado adicional (opcional)
paso 2
"director comercial", recibe comisión, opcional, default Patria S.A., no excluyente.
paso 3 Accidentes personales
NUEVO carga de excel masiva con Carnet|nivel
paso 3 sepelio
largo plazo> solo individual
quitar asegurados y adicionales
paso 3 salud
Salud Internacional>> (detectado mediante cod producto)
NUEVO deducible numero

este es el feedback de correcciones para el modulo de polizas que quiero que mejores esta indicado por el paso de registro y el ramo al que pertenece, toma cada punto como una mejora a implementar:
paso 3 automotor
NUEVO opcion de marcar individual-corporativo
Nro chasis pasar a columna izquierda y franquicia cambiar a input y pasar a derecha

paso 3 Accidentes personales
NUEVO Nivel agregar "prima de nivel" que es un monto que engloba la suma de todo el nivel (input moneda, 2 decimales)
NUEVO para Corporativo dar la opcion de agregar un dato "Cargo" que sea input para referenciar por ejemplo a un "Gerente" con Nivel 1 pero 3 "Operadores" con Nivel 2

Paso3 Sepelio
NUEVO carga masiva de asegurados leyendo su carnet y nombre de nivel (para que sea aceptado el carnet debe ser encontrado en la base de clientes y el nivel ya debe estar creado previamente)

parte3 Responsabilidad civil
Eliminar seleccion de moneda interna, usar moneda de toda la poliza
eliminar seleccion de asegurados eso no va a ser necesario

paso3 incendio
Moneda es de toda la póliza, borrar eso que dice "Valor declarado (USD)" al agregar una ubicacion
borrar texto "(dirección personal)" del check "marcar como PRIMER RIESGO"
NUEVO En la creación de dirección se deben agregar "Items" como en los Niveles de AP, estos items son las siguientes caracteristicas de esta poliza:

-   Edificaciones, instalaciones en general
-   Activos fijos en general
-   Equipos electronicos
-   maquinaria fija o equipos
-   existencias (mercaderia)
-   Dinero y valores dentro del predio
-   vidrios y cristales
-   valor total declarado
    la sumantoria de todos los items da "Valor total Declarado"
    La sumatoria de todas las ubicaciones da "Valor Asegurado TOTAL"

paso3 salud
NUEVO en corporativo definir niveles con un monto para aplicar luego a cada asegurado
cuando es corporativo se pueden definir niveles para cada asegurado aparte de su tipo de asegurado
corporativo mínimo 1 titular pueden haber mas
corporativo cada titular puede anexar sus conyugue y dependientes y comparten el nivel
NUEVO check para marcar la póliza con maternidad

paso3 Vida
remover texto "Bs" de los niveles en el placeholder "valor asegurado Bs"
eliminar input de producto texto pasarlo a lista desplegable con opciones parametrizadas "vida producto 1" y "Vida producto 2" que vienen de la base de datos
Vida se paga obligatoriamente al contado

paso3 Riesgos Varios Miscelaneos
quitar selector de moneda interna, se usa la de toda la poliza
5 convenios no 3 (rellenar con titulo convenio4: pendiente y convenio5: pendiente por el momento)
Convenios checkbox para habilitar o deshabilitar, cada uno con su monto

CONCRETAR:

-   plantilla de FIANZAS es todo ramo que empieze con el codigo "92"
    BENEFICIARIO (TEXTO MAYUSCULAS)
    OBJETO DEL CONTRATO (TEXTO)
    VALOR DEL CONTRATO (NUM)
    VALOR CAUCIONADO (NUM)
    UBICACION DE LA OBRA (TEXTO)

-   plantilla AERONAVEGACION // Naves y embarcaciones
    ASEGURADO ADICIONAL (buscar cliente)
    DATOS OBJETO ASEGURADO:

    -   MARCA
    -   MODELO
    -   AÑO
    -   SERIE
    -   USO privado/publico/recreaccion/
    -   MATRICULA
    -   NUMERO DE PASAJERO
    -   NUMERO TRIPULANTES
        VALOR ASEGURADO: (monto)
    -   CASCO (texto)
    -   RESPONSBILIDAD CIVIL (monto)
    -   ACCIDENTES PERSONALES (desplegable de niveles AP, varios niveles)

-   plantilla ROBO
    Ubicación de riesgo
    Items seleccionables con su monto
    valor asegurado

faltante>>

-   RAMOS TECNICOS
    Placa opcional
    tipo de vehículo pasa a "tipo de equipo" (industrial)
    marcas industriales
    sin ejes ni asientos
    NUEVO nro de serie opcional

-   TRANSPORTE
    Materia asegurada (texto largo)
    tipo de embalaje (texto)
    fecha embarque (fecha)
    tipo transporte (terrestre, marítimo, arereo, ferreo, multimodal)
    ciudad origen (texto)
    país origen (parametrizado)
    país destino (parametrizado)
    ciudad destino (texto)
    Valor asegurado (num)
    factura (texto)
    fecha factura (fecha)
    Cobertura A, C checkbox
    modalidad (selección: flotante, flat, un solo embarque, flat con prima minima deposito)

Ramos generales:: NUEVO Subrrogacion texto y moneda por cada item cubierto

-   automotor
-   equipo móvil pesado (ramos técnicos)
-   incendio y aliados

TODAS LAS POLIZAS DEBEN SER LIGADAS AL TIPO DE CLIENTE INDIVIDUAL, UNI, JURID

CLIENTES
Carga masiva de "asegurado" nombre completo, carnet, fecha nacimiento, genero

PARAMETRIZACIONES>
[] cod y Nombre de compañías aseguradoras
[] lista Grupo de Negocios
[x] cuadro de valores 'rubro/items' para ubicación de incendio y aliados
[] lista de cod y subramos/productos
[] lista de productos por compañía
[] lista de productos AP/vida
[] tipos de uso de aeronaves

## siniestros (listo)

similar al modulo de cobranzas, ahora haremos el módulo de siniestros:

1. tendra como pantalla principal un buscador general (de detalles de cliente y de polizas) o quiza un buscador para siniestros no estoy seguro qué mostrar en la pantalla principal de siniestros. Quiza solo los siniestros ya que las polizas se ven en el modulo de polizas y el cliente se ve en el modulo de clientes
2. boton inferior derecho para "registrar un siniestro" que tiene los siguientes pasos:
   paso 1: se selecciona la poliza siniestrada y se confirman los datos más importantes que son el cliente, el responsable de esa poliza, las cuotas y los asegurados dentro de dicha poliza (personas, autos, viviendas, etc, etc) para saber que ese es el cliente siniestrado
   paso 2: se registran los detalles del siniestro como:

-   fecha siniestro (fecha, obligatorio)
-   fecha reporte (fecha, obligatorio)
-   lugar del hecho (texto, obligatorio)
-   departamento (selector departamento, obligatorio)
-   monto de reseva (moneda 2 decimales, obligatorio)
-   selector de moneda (Bs/USD)
-   area de texto para la descripcion del siniestro (texto largo, obligatorio)
-   contacto (uno o varios correos electronicos)
    paso 3: se marcan las coberturas que se cubren en el siniestro
-   se ingresa la cobertura como texto y se marca el checkbox de la cobertura
    paso 4: carga de documentos opcionales con sus etiquetas
-   fotografia VA
-   fotografia RC
-   formulario de denuncia
-   licencia de conducir
-   informe transito
-   informe soat
-   test alcoholemia
-   franquicia y/o deducible
-   proforma
-   orden de compra/trabajo
-   inspeccion
-   liquidacion
    una vez se llena todo se guarda el siniestro y queda etiquetado como "abierto"

si yo entro al reporte y este está abierto tengo la posibilidad de visualizar los datos previos y agregar nuevos como:

-   agregar nuevos archivos
-   agregar nuevas observaciones del proceso del siniestro
-   agregar fecha de llegada de repuestos necesarios para la reparacion
-   actualizar el estado final del siniestro en 3 posibles conclusiones:
    rechazado: se agrega una carta de rechazo (archivo obligatorio), se selecciona el motivo de rechazo de una lista parametrizada (Mora, incumplimiento, sin cobertura, no aplicable) y boton "cerrar reporte"
    declinado: carta de respaldo (archivo obligatorio), seleccionar el motivo de una lista parametrizada (solicitud cliente, pagó otra poliza) y boton "cerrar reporte"
    concluido: - seccion indemnizacion: archivo UIF y archivo PEP ambos obligatorios - monto reclamado y selector moneda Bs/USD - deducible y selector moneda Bs/USD - monto pagado y selector moneda Bs/USD - check para marcar si es un "pago comercial" - boton "cerrar reporte"
    toda actualizacion que se haga en este modo edicion debe quedar registrada en el propio siniestro para saber quién subió x archivo o quién anotó Y observación, además de quién cambió el siniestro de estado o quién lo cerró, esto debe ser visualizado como una lista con la fecha, el autor y el cambio realizado

## siniestros 2da reunion

reunion 18-12-2025

paso 2

-   fecha de reporte siniestro (no futura, ancla de aviso)
-   fecha de reporte cliente (no futura)
-   fecha reporte compania (no futura)
-   NUEVO alerta de dias de "aviso de siniestro"
-   (fecha de registro interno es automatico)

modificar contacto>
nombre (obligatorio)
telefono (obligatorio)
correo (opcional)

paso3
agregar "Gestion comercial" como cobertura seleccionable

paso4
cambiar a vista mejorada (dibujo)

Resumen>
visual de datos como cobranza
info de registro quitar

Documentos>
nueva visual ref

-------------------- acomodar

Nuevo archivo "correo compania"
alerta si el reporte no ha sufrido cambios en 10 dias y sigue abierto

Observaciones>>

-   NUEVA seccion "estados" encima de agregar observacion
    Espera informe transito
    Espera proforma
    Espera franquicia
    Espera orden
    Espera reparacion
    Espera conformidad
    Espera receta medica
    Espera autorizacion/ordenes
    Espera liquidacion
    [[[FALTA ESTADOS DE POLIZAS GENERALES]]]

-   Documentos siniestro con minatura reconstruccion total
    [[[pasar etiquetado e archivos para revision]]]

-   visualizar no solo polizas vigentes, sino vencidas dentro del anio

selector de conclusion>

-   indemnizacion y/o reembolso>
    UIF y PEP obligatorio
-   ordenes>
    reclamado, deducible, pagado
-   quitar pago comercial de cierre concluido

-   NUEVO Enviar mensaje de WhatsApp al cerrar el cierre del reporte

-   quitar informacion de registro

-   mensaje estandarizado al registrar el siniestro [[pedir mensaje]]

paso1

-   color segun estado de poliza al seleccionarla

alertas para siniestros (detalle grafico)

etiquetas cambiar a Etapa

acceso futuro>
enviar observaciones del caso al cliente por correo

---

prompt:
Mejoraremos el modulo de siniestros con los siguientes cambios:

1. colorear en rojo el siniestro cargado en la visualización inicial si este no ha sufrido actualizaciones en los ultimos 10 dias

2. agregar limitantes en sistema de conclusion de siniestros de la siguiente manera:

-   quitar pago comercial de cierre concluido
-   NUEVO Enviar mensaje de WhatsApp al cerrar el cierre del reporte (inventar mensaje estandar formal)
-   mensaje estandarizado al registrar el siniestro [[pedir mensaje]]

3. modificar la edicion de siniestros de la siguiente forma:

seccion resumen:

-   agregar detalles completos de la persona y los bienes asegurados en la poliza asociada como sucede en el modulo cobranzas
-   quitar parte de informacion de registro

seccion documentos:

-   reconstrucción completa de la seccion de documentos al cargar y editar el siniestro, ahora los tipos de documento se deben mostrar como pestañas en un lateral y al seleccionar cualquier pestaña se muestran todos los archivos bajo esa etiqueta, ademas se muestran miniaturas de los archivos de imagen y en cada pestaña (etiqueta) se puede cargar un nuevo archivo (de forma manual sin arrastrar) que queda etiquetado automaticamente.

seccion observaciones:
NUEVA seccion de "estados" encima de la seccion de "agregar observacion" que debe tener los siguientes estados (traidos desde la db, crear tabla de eso) en un menu desplegable
Espera informe transito
Espera proforma
Espera franquicia
Espera orden
Espera reparacion
Espera conformidad
Espera receta medica
Espera autorizacion/ordenes
Espera liquidacion

1. Base de Datos ✅

-   Creada migración SQL completa con:
    -   Tabla siniestros_estados_catalogo (9 estados predefinidos)
    -   Tabla siniestros_estados_historial (auditoría de cambios)
    -   Vista siniestros_con_estado_actual con flag requiere_atencion
    -   Función obtener_contacto_poliza() para WhatsApp
    -   Índices optimizados en updated_at
    -   Políticas RLS configuradas

2. Tipos TypeScript ✅

-   Agregados ~15 nuevos tipos en types/siniestro.ts
-   Incluye tipos para estados, contactos, WhatsApp, y vistas extendidas

3. Server Actions ✅

-   Implementadas 8 nuevas funciones en app/siniestros/actions.ts:
    -   obtenerEstadosCatalogo() - Lista de estados
    -   obtenerHistorialEstados() - Historial cronológico
    -   cambiarEstadoSiniestro() - Cambiar estado con observación
    -   obtenerSiniestrosConAtencion() - Query con flag de atención
    -   obtenerContactoParaWhatsApp() - Contacto del cliente
    -   generarWhatsAppRegistroSiniestro() - URL WhatsApp registro
    -   generarWhatsAppCierreSiniestro() - URL WhatsApp cierre
    -   obtenerDetalleCompletoPoliza() - Detalle completo por ramo

4. Componentes Nuevos ✅

-   BotonWhatsAppRegistro.tsx - Botón WhatsApp después de registro
-   BotonWhatsAppCierre.tsx - Botón WhatsApp al cerrar
-   UltimoCambioSiniestro.tsx - Card destacado con último cambio
-   DetallePolizaSiniestro.tsx - Detalles completos de póliza por ramo
-   SeccionEstados.tsx - Dropdown de estados + historial + modal
-   DocumentosPorTipo.tsx - Sistema de tabs laterales con 16 tipos

5. Modificaciones a Componentes ✅

-   Dashboard (page.tsx + Dashboard.tsx + SiniestrosTable.tsx):
    -   Usa obtenerSiniestrosConAtencion()
    -   Filas rojas para siniestros sin actualización en 10+ días
    -   Badge "⚠️ Atención" visible
    -   Tooltip explicativo
-   CerrarSiniestro.tsx:
    -   Eliminado checkbox "Pago Comercial"
    -   Integrado WhatsApp automático al cerrar
    -   Mensajes personalizados por tipo de cierre
-   Registro (RegistrarSiniestroForm.tsx):
    -   Pantalla de éxito con WhatsApp opcional
    -   No redirige inmediatamente
    -   Botón "Ir al Dashboard"
-   EditarSiniestroForm.tsx:
    -   Tab Resumen: Agregados UltimoCambioSiniestro + DetallePolizaSiniestro
    -   Tab Documentos: Reemplazado con DocumentosPorTipo
    -   Tab Observaciones: Agregado SeccionEstados arriba
-   ResumenReadonly.tsx:
    -   Eliminada sección "Información de Registro" completa
    -   Datos ahora visibles en historial y último cambio

📋 Para ejecutar manualmente:

1. Ejecutar la migración SQL en Supabase (supabase/migrations/migration_siniestros_mejoras.sql)
2. Verificar que los 9 estados se insertaron correctamente
3. Probar el flujo completo de registro → edición → cierre

-   ✅ Siniestros sin actualización: fondo rojo + badge de atención
-   ✅ Pestañas laterales de documentos con contadores
-   ✅ Timeline de estados con indicadores visuales
-   ✅ Cards destacados para último cambio
-   ✅ Mensajes de éxito con opciones de acción
-   ✅ Tooltips informativos
-   ✅ Dark mode compatible en todos los componentes

---

ahora continuaremos con las mejoras esta vez en la forma en la que se registran los siniestros por cada paso:

4. paso 2

-   fecha de reporte siniestro (no fecha futura, alerta de aviso si la fecha ingresada es mayor a 10 dias pasados)
-   fecha de reporte cliente (no fecha futura)
-   fecha reporte compania (no fecha futura)
-   modificar la forma de agregar contacto>
    nombre (obligatorio)
    telefono (obligatorio)
    correo (opcional)

5. paso3

-   agregar "Gestion comercial" como cobertura seleccionable extra a las coberturas que se cargan de la poliza

6. paso4

-   cambiar a vista mejorada de documentos usada en la parte de modificacion de documentos

errores y cambios a realizar:

1. dashboard siniestros no se visualiza datos de cliente en siniestros
2. resumen: existen dos secciones que muestran la misma información (datos de cliente y datos de poliza) consolidar en una sola seccion
3. resumen: ultimo cambio no refleja modificaciones en el estado del siniestro
4. el cambio de estado no deberia tener observacion opcional, para eso ya existe el campo de observaciones
5. el historial de estado deberia ser parte del historial goblal del siniestro, por que esta separado? se puede corregir o es complicado?
