ruta de avance final>
✅crear modulo crudo de clientes
✅testear con dato generic visual
✅refinar visualizacion de clientes

> > ✅crear formulario crudo de creacion de clientes
> > ✅reunion Mauricio datos necesarios de cada tipo UIF + AMLC
> > ✅refomular tablas de clientes naturales estandar UIF
> > ✅refomular tablas de clientes unipersonales estandar UIF
> > ✅refomular tablas de clientes juridicos estandar UIF
> > ✅linkear representante a juridicos
> > ✅mejorar formulario creación de clientes con nuevos campos
> > ✅crear el backend del modulo de polizas
> > ✅testear carga de dato genérico
> > agregar reglas de seguridad
> > crear modulo crudo del modulo de polizas
> > probar carga de datos desde modulo

detalles menores>
correo cancelación de db
quitar el 2FA de la interfaz de inicio de sesión (no usado)
reformular el correo de invitación para que sea compatible con la seguridad de Outlook
anadir logica basica de seguridad de campos de datos en el formulario. Ej:

-   ✅todo texto es normalizado en mayusculas y sin acentos
-   los clientes no pueden ser menores de edad
-   lugar de trabajo no puede tener menos de 2 letras
-   ✅telefono no puede tener menos de 4 numeros
-   ✅NIT no puede tener menos de 6 numeros
-   actividad economica no puede tener menos de 4 letras
-   formato correo validado
-   documento puede contener solo numeros

---

8 12 25
Paso 1
NUEVO opción de seleccionar Asegurado adicional (opcional)

paso 2
"director comercial", recibe comisión, opcional, default Patria S.A., no excluyente.

paso 3 automotor
individual-corporativo
franquicia numero input pasar a derecha
NO TIENE DETALLES EXTRA DE PRODUCTO

paso 3 AP
Nivel agregar "prima de nivel" moneda, decimal
NUEVO carga de excel masiva con Carnet|nivel
Corporativo:: "+ Agregar Nominado por cargo" unico dato "Cargo"
NO TIENE DETALLES EXTRA DE PRODUCTO

Paso3 Sepelio
NUEVO carga masiva
largo plazo> solo individual
quitar asegurados y adicionales
NO TIENE DETALLES EXTRA DE PRODUCTO

parte3 RC
moneda eliminar
asegurados eliminados
NO TIENE DETALLES EXTRA DE PRODUCTO

paso3 incendio
Moneda es de toda la póliza
quitar "(dirección personal)"
En la creación de dirección se debe agregar "Items" como en los Niveles de AP
la sumantoria de todos los items da Valor Declarado
La sumatoria de todas las ubicaciones da Valor ASegurado TOTAL> Valor total en Riesgo
NO TIENE DETALLES EXTRA DE PRODUCTO

paso3 salud
corporativo tiene niveles para cada titular
corporativo mínimo 1 titular pueden haber mas
corporativo cada titular puede anexar sus conyugue y dependientes y comparten el nivel
NUEVO check para marcar la póliza con maternidad
Salud Internacional>> (detectado mediante cod producto)
NUEVO deducible numero

paso3 Vida
remover glosa Bs de niveles
eliminar producto texto pasarlo a lista desplegable (mod gerencias)
Vida obligatoriamente al contado forzar

paso3 Riesgos Varios Miscelaneos
quitar moneda de la seccion
5 convenios
Convenios checkbox para habilitar

CONCRETAR:

-   FIANZAS COD 92
    BENEFICIARIO (TEXTO MAYUSCULAS)
    OBJETO DEL CONTRATO (TEXTO)
    VALOR DEL CONTRATO (NUM)
    VALOR CAUCIONADO (NUM)
    UBICACION DE LA OBRA (TEXTO)

-   AERONAVEGACION // Naves y embarcaciones
    ASEGURADO ADICIONAL (cliente completo)
    DATOS OBJETO ASEGURADO
-   MARCA
-   MODELO
-   AÑO
-   SERIE
-   USO privado/publico/recreaccion/
-   MATRICULA
-   NUMERO DE PASAJERO
-   NUMERO TRIPULANTES
    VALOR ASEGURADO:
-   CASCO (numero)
-   RESPONSBILIDAD CIVIL (numero)
-   ACCIDENTES PERSONALES (desplegable de niveles AP, varios niveles)

-   ROBO
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

---

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

-   mensaje estandarizado al registrar el siniestro [[pedir mensaje]]]

paso1

-   color segun estado de poliza al seleccionarla

alertas para siniestros (detalle grafico)

etiquetas cambiar a Etapa

acceso futuro>
enviar observaciones del caso al cliente por correo

registro

---

"SUPABASE_ACCESS_TOKEN": "sbp_e3c42038cb6e378d081cf378aada690dcf5033c7"

---

update de clientes
nuevo cliente tipo asegurado mas sencillo que un cliente completo
nuevo sistema de edicion de datos cliente

revision de update modulo polizas
nuevo sistema de edicion de polizas
logica para anexos
logica para anulaciones

---

-   selector General-personal que sea automatico según la compañía seleccionada
-   manejar cuotas de póliza de 0 a 11 (considerar poeque creo que la cuota inicial ya es la cuota cero)
-   ver donde o como se guarda el calculo de comisión para independizarlo según otra tabla (que me conviene calcularlo en el momento y guardarlo en la póliza o calcularlo a demanda según se lo pida? cual seria el mejor metodo)
-   agregar editor de polizas
-   hacer la mejora de carga de clientes, de una vez consolidar esa parte

Conciliaciones:

-   Exportar reporte de polizas en TXT:
    [cod patria, cod compania, cod moneda 0 BS-1 USD-2, ultimo dia del mes anterior, ]

---

cobranza:
✅error cannot read property (id)
✅mensaje de cobranza aparece todo el tiempo
✅por vencer que sea 10 días de advertencia
✅aumentar los registros del dia de hoy al exportar cobranzas
✅cliente y nit no se muestran en la exportación
✅agregar el detalle de prorroga en la exportación
✅si la póliza tiene 3 cuotas o mas vencidas que se habilite el botón de carta de Mora (wpp)
✅\*\* crear una póliza con cuotas ya vencidas para probar mensajes

siniestros:
✅cambiar visualmente el estado de seguimiento por "etapas de seguimiento"
✅al crear un nuevo siniestro y seleccionar la poliza del cliente el visualizador de pagos no muestra correctamente si se tiene o no cuotas vencidas, solo muestra cutoas pagadas, pendientes y total que son datos irrelevantes a la hora de registrar un siniestro, todo lo que necesita el usuario de siniestros es saber el nro de cuota, el estado y el monto junto a la fecha que deberia pagar que ya se tiene me gusta, incluso muestra la fecha original si tiene una prorroga que igual me gusta como se ve pero hay que mejorar esa visualización para que encaje con lo que el usuario de siniestros necesita y el estilo visual del proyecto

✅que se puedan seleccionar varios archivos al cargar documentos
✅al crear el siniestro que redireccione a la ventana de edición del mismo, que no lleve a la pantalla principal
✅Agregar Nueva Observación interna\*\* cambiar nombre
🔴🔴el monto total al cerrar el siniestro es la resta de monto
✅cambiar mensaje de actualización de estado no es Patria seguros y reaseguros
🔴✅si envia fue un error de la laptop?🔴error: no envia mensaje de cierre de siniestro concluido
✅en filtros cambiar departamentos por etapas
✅acomodar el orden de los datos mostrados

clientes:
✅error al cargar fecha de ingreso a la profesion
✅que se pueda clickear en las polizas para redireccionar hacia a poliza
editor de clentes

polizas:
probar que todo funcione
editor con autorizaciones de administracion

conciliación:
filtro para tener toda la sabana completa e ir limitando los campos
las anulaciones figuran en negativo

todo el sistema:
optimizar indexamiento y llamada a las tablas
aplicar particiones para las tablas mas pesadas (polizas, cobranzas, siniestros)

---

5-1-2026

oscar Einar -- cliente real

polizas:

-   que exista una forma de marcar si la póliza a registrar es nuevo o renovación, pedir esa confirmación obligatoria al principio del formulario
-   que no hayan bloqueos en la fecha de emisión de la póliza
    ✅la visualizacion de resumen de datos esta atrasada por 1 dia, Tambien al guardar, 1-12-25 paso a ser 30-11-25
    ✅se pueden seleccionar beneficiarios para las polizas de salud, un beneficiario es como un cliente pero con datos minimos: nombre, carnet, fecha de nacimiento y género
-   que se quite la opcion de contratante del selector de rol en salud
    ✅que se agrege la opcion de rol en la creacion de asegurados
-   rol del asegurado es obligatorio

validacion:
✅el boton de ver me lleva directo a la poliza
-el boton de rechazar contiene una razon del rechazo que se elimina al modificar la poliza
✅mostrar fecha de creacion
✅guardar y mostrar fecha de validacion

SISTEMA DE EDICION:

1. Error de usuario: (se pide permiso a adm)

-   modificar y guardar dejando trazabilidad

2. inclusion:

-   hacia la póliza principal
    --nro anexo
    --cambios a agregar
    --documento de anexo
    --aumento de cuotas (si aplica)

4. exclusion:
   -lo mismo que arriba y las cuotas no pagadas se pueden modificar

5. anulación:
   -nro de anulación
   -archivo
   -la póliza debe dejar de figurar en la lista de pólizas

---

✅crea la tabla de trazabilidad de historial de ediciones de clientes

✅vamos a mejorar el modulo de polizas al crear una poliza nueva actualmente solo se selecciona el ramo, pero ahora se debe seleccionar obligatoriamente el producto porque el producto trae consigo la comision que recibe patria y el factor de comision que recibe el encargado de ese cliente, por lo que quiero crear una tabla vacia de momento en la db que contenga un uuid, cod_aseguradora FK de tabla companias_aseguradoras, cod_ramo FK de tabla tipos_seguros, cod_producto entero, nombre_producto texto, porcentaje_comision decimal, factor_contado decimal y factor_credito decimal. Notaras que si la poliza se paga al contado tiene un factor y si es al credito otro.
Una vez seleccionada la compañia y el ramo quiero que se habilite la seleccion del producto de la lista de productos disponibles para ese ramo y esa compañia en especifico, y ya que lo hemos seleccionado al final cuando se está creando el plan de pago se podrá calcular la comsión real que recibe la empresa y el usuario y no como ahora que es un valor fijo inventado de comsión.

✅pequeñas modificaciones en lo que acabamos de crear 1. al seleccionar el producto no quiero que me indique los valores del mismo 2. al calcular las cuotas no quiero que se vea la comision del usuario

✅vamos a mejorar el modulo de polizas creando el mismo modo de edicion para administrador y otorgar permisos para los demas usuarios comerciales, el boton de edicion debe estar dentro de la vista a detalle de la poliza, no olvidar tambien que estas modificaciones deben ser registradas en la tabla de trazabilidad y mostradas en el detalle de la poliza una vez guardada (ya creamos esa seccion anteriormente)

✅vamos a mejorar el validador de polizas porque ahora necesitamos que el boton de rechazar contenga el motivo del rechazo de la póliza y active automaticamente un permiso de 1 dia para modificar los datos de la poliza, este motivo de rechazo aparecerá en la tabla de trazabilidad junto con la fecha de rechazo y el administrador que rechazó la poliza.

✅vamos a mejorar el modulo de administración con un sistema para exportar el reporte consolidado de producción del mes, esta función estará en una seccion llamada "reportes" y dentro del modulo de administración. Esta funcion toma la exportacion que reporte de cobranzas que ya existe pero agrega campos importantes como prima neta, comision empresa, factor prima neta, porcentaje de comision empresa. Estos campos deben ser calculados tanto para la prima total como para la cuota individual. comparto una imagen de ejemplo con las celdas resaltadas para que se entienda.

✅vamos a crear la funcion para enviar correo de reseteo de contraseña

✅vamos a mejorar el modulo de administración en la seccion de "seguros" para que exista la opcion de editar las empresas aseguradoras, los tipos de seguros, los productos de cada ramo y las categorias de polizas, aqui se pueden crear, actualizar y hacer soft delete de los registros mas no borrar permanentenmente.

✅vamos a crear una funcion y sistema para poder enviar correos de recuperacion

vamos a mejorar el modulo de administracion para poder modificar las comisiones de cada usuario del sistema, esta funcion debe estar bajo la nueva seccion llamada "usuarios"

vamos a mejorar el modulo de siniestros ahora permitiendo registrar un siniestro anónimo (sin póliza asociada) para luego poder asociarle una póliza en el futuro. {{{{debatible con Pablo si es necesario}}}}

nit puede tener cualquier cantidad de numero, minimo 5
datos de conyugue grabado en borrador
avisar vecimientos pers/30 uni-juri/60
avisar prima 7dias antes

ejecutar script para eliminar huerfanos
