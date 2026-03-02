Vamos a crear un sistema de anexos para nuestro modulo de polizas,
un anexo es un boton separado al de nueva poliza que crea un set de datos separados de la poliza original sin modificar la original para temas de auditoria y seguridad de datos.
existen los siguientes tipos de anexos:

1. inclusion: agrega bienes o beneficiarios a las polizas, aumentando la prima que paga en subsecuentes pagos pendientes (imposible tocar pagos ya realizados)
2. exclusion: quita bienes o beneficiarios a las polizas, reduciendo la prima que paga en subsecuentes pagos pendientes (imposible tocar pagos ya realizados)
3. anulación: anula la poliza y deja de estar vigente

para anulacion e inclusion se rerefencia la poliza original y los datos a modificar son SOLO los datos especificos y datos de cobro ademas de cargar el documento de anexo, en el cobro se ingresan montos positivos o negativos que vienen a sumar o restar al monto original en la visualización de la poliza posterior.
para la exclusion se recepciona el documento de anulacion y se crea el "cobro de vigencia corrida" de corresponder que son los dias pasados desde el ultimo pago hasta la fecha de anulacion para que cobranzas haga la recaudacion correspondiente

cuando una poliza sufre un anexo en la visualización se deben actualizar los montos y bienes, si se anexaron cosas la prima debe aumentar o disminuir
si se anularon polizas se muestran las cuotas no realizadas como congeladas y se agrega la cuota de vigencia corrida con el monto correspondiente

todo este proceso de anexos es no destructible dado que no afecta los datos de la poliza original y viven en tablas separadas, solo de cara al usuario se muestran los movimientos consolidados, dado que una poliza puede tener multiples anexos a lo largo de su vida a excepcion de anulacion ese automaticamente ya no permite mas anexos o ediciones en la poliza original

En resumen el flujo que yo pienso y pido tu opinión como experto sería:
boton nuevo anexo>buscar poliza existente>ingresar nro de anexo (input texto)>cargar datos especificos de la poliza original y editar a gusto>cargar cuotas o pago unico pero con monto original como el hint del input y indicar al usuario que debe ingresar la diferencia de dinero que se esta aumentando o disminuyendo al monto original>adjuntar documento de anexo obligatoriamente>resumen de cambios>boton guardar

Dime tus consideraciones y opiniones en esta nueva funcion

---todo lo de arriba ya enviado ---

una vez se valide el anexo, sus datos se combinan con los datos de la poliza original dando la ilusion al usuario de que la poliza se ha "actualizado con los nuevos datos del anexo" pero al fondo estará siempre una pestaña para "mostrar anexos" que desplegará el detalle de los anexos agregados a dicha poliza, esto para una siguiente iteracion del problema

-------- diagrama de poliza detalle --------
POL-1234 (activa) [editar] [+nuevo anexo] [permisos] |
{{detalles de cliente}} | |
{{detalles de poliza}} | {{resumen financiero}} |
{{plan de pagos}} | {{estado de pagos}} |
{{documentos}} | {{historial}} | <--- en el historial deberia figurar la creacion, modificacion, validacion de anexos
"ver anexos" <--- esto esconde o muestra los anexos si existiera alguno
AN-234 (pendiente) [editar] [permisos] [validar] [rechazar] |
{{detalles modificados}}
{{cuotas cambiadas}}
{{documentos}}
