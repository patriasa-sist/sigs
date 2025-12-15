-- Agregar política RLS de INSERT para siniestros_historial
-- El historial es automático y debe poder insertarse desde server actions

-- Política: Permitir INSERT en historial para usuarios autenticados con roles autorizados
CREATE POLICY "Usuarios autorizados pueden insertar en historial"
ON siniestros_historial FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('siniestros', 'comercial', 'admin')
  )
);

COMMENT ON POLICY "Usuarios autorizados pueden insertar en historial" ON siniestros_historial IS 'Permite que usuarios con rol siniestros, comercial o admin registren cambios en el historial';
