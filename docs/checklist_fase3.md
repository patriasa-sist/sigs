1. Scoping de siniestros (prioridad alta)
   Login como usuario con rol siniestros → ir a /siniestros → debe ver solo sus siniestros y los de su equipo
   Login como comercial → ir a /siniestros → debe ver solo siniestros de pólizas de su equipo
   Login como admin → debe ver todos los siniestros

2. Scoping en detalle (COMPLETADO)
   Login como comercial → intentar acceder a /polizas/[id] de una póliza que NO es de su equipo → debe mostrar error "No tiene acceso"
   Lo mismo con un cliente: ir a la ficha de un cliente que no es de su equipo

3. Auto-asignación en pólizas (COMPLETADO)
   Login como comercial/agente → ir a /polizas/nueva → en paso 2 (Datos Básicos):
   El campo "Ejecutivo comercial" debe mostrar solo miembros de su equipo
   Debe estar pre-seleccionado con su propio nombre
   Puede cambiarlo a otro miembro del equipo

4. Auto-asignación en clientes (pendiente) LOGICA INCORRECTA CORREGIR!!!!! <-----------------
   Login como comercial/agente → ir a /clientes/nuevo → el campo "Director de cartera" debe:
   Mostrar solo miembros de su equipo
   Pre-seleccionarse con el usuario actual

5. Transferencia de datos (admin) (pendiente)
   Login como admin → ir a /admin/transferencias
   Seleccionar un usuario origen → debe mostrar sus pólizas y clientes
   Seleccionar usuario destino → transferir algunas pólizas → verificar que se movieron

6. Dashboard por equipo (admin) (COMPLETADO)
   Login como admin → ir a /admin/dashboard-equipos
   Debe mostrar cards por equipo con métricas (pólizas, clientes, siniestros, prima)

7. Reportes con filtro de equipo (admin) (COMPLETADO)
   Login como admin → ir a /admin/reportes
   El dropdown "Equipo" debe aparecer → seleccionar un equipo → exportar → debe filtrar solo pólizas de ese equipo

8. Clientes huérfanos (pendiente) (COMPLETADO)
   Login como comercial → verificar que NO ve clientes sin executive_in_charge asignado (ya no debería haber ninguno gracias al SQL que los asignó a la cuenta maestra)
