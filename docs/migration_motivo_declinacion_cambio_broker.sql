-- Agrega "Cambio de broker" como motivo de declinación válido en el cierre de siniestros.
-- El CHECK actual (siniestros_motivo_declinacion_check) solo admite
-- 'Solicitud cliente' y 'Pagó otra póliza'; se recrea incluyendo el nuevo valor.

ALTER TABLE siniestros
	DROP CONSTRAINT siniestros_motivo_declinacion_check;

ALTER TABLE siniestros
	ADD CONSTRAINT siniestros_motivo_declinacion_check
	CHECK (motivo_declinacion IN ('Solicitud cliente', 'Pagó otra póliza', 'Cambio de broker'));
