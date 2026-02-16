Checklist de pruebas para Fase 2

1. Verificar que el SQL se ejecuto correctamente (confirmado)
   Ejecuta en Supabase SQL Editor:

-- Tablas creadas
SELECT _ FROM equipos;
SELECT _ FROM equipo_miembros;

-- Funciones existen
SELECT get_team_member_ids('UUID-de-cualquier-usuario');

-- Permiso nuevo
SELECT \* FROM permissions WHERE id = 'admin.equipos';

-- Politicas RLS actualizadas
SELECT policyname FROM pg_policies WHERE tablename = 'polizas' AND cmd = 'SELECT';
-- Debe mostrar: polizas_select_scoped (NO cobranza_select_polizas)

SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND cmd = 'SELECT';
-- Debe mostrar: clients_select_scoped (NO las 2 anteriores)

2. Probar UI de admin (fallo)
   Login como admin
   En el dropdown de usuario, verificar que aparece el link "Equipos"
   Ir a /admin/equipos
   Crear un equipo (ej: "Equipo Comercial A")
   Agregar 2 comerciales al equipo
   Cambiar uno a lider (verificar que el selector funciona)
   Remover un miembro y volver a agregarlo
   Eliminar un equipo (verificar dialogo de confirmacion)

3. Probar aislamiento - Comerciales (pendiente)
   Toma nota de 2 comerciales que tengan polizas/clientes asignados (ver polizas.responsable_id y clients.executive_in_charge en Supabase)
   Sin equipo: Login como comercial A → debe ver solo sus propias polizas y clientes
   Sin equipo: Login como comercial B → debe ver solo sus propias polizas y clientes
   Desde admin, crear equipo con ambos comerciales
   Con equipo: Login como comercial A (re-login necesario) → debe ver sus polizas + las de comercial B
   Con equipo: Login como comercial B → debe ver sus polizas + las de comercial A
   Verificar que la busqueda de polizas tambien esta filtrada (buscar una poliza del otro comercial)
   Verificar que la lista de clientes tambien esta filtrada

4. Probar aislamiento - Roles sin restriccion (pendiente)
   Login como admin → debe ver todas las polizas y clientes (bypass)
   Login como usuario → debe ver todas
   Login como cobranza → debe ver todas las polizas con pagos pendientes
   Login como siniestros → debe ver todos los siniestros

5. Probar caso borde - Sin equipo (pendiente)
   Login como un agente que no esta en ningun equipo
   Debe ver solo sus propias polizas (o ninguna si no tiene)
   Los counts de paginacion deben ser correctos (no mostrar "50 resultados" y luego 0 filas)

6. Probar multi-equipo (opcional si tienes suficientes usuarios) (pendiente)
   Crear Equipo X con comercial A + comercial B
   Crear Equipo Y con comercial A + comercial C
   Login como comercial A → debe ver datos de A + B + C (union de ambos equipos)
   Login como comercial B → debe ver datos de A + B (solo Equipo X)
   Si algo falla: Lo mas probable es un problema de RLS. Verifica en Supabase SQL Editor:

-- Simular lo que ve un usuario especifico (pendiente)
SELECT id, numero_poliza, responsable_id
FROM polizas
WHERE responsable_id = ANY(get_team_member_ids('78befca9-1cd5-4f5f-be44-089526d9e395'));
Una vez que todo pase, estamos listos para la Fase 3. Avisame cuando quieras continuar.
