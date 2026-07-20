-- Permitir archivos Excel en el bucket polizas-documentos
-- (documentos de anexos ahora aceptan XLS/XLSX además de PDF/JPG/PNG).
-- El límite de tamaño (20MB) no cambia.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
	'image/*',
	'application/pdf',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'polizas-documentos';
