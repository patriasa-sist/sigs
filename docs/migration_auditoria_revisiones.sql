-- ============================================================================
-- Migración: Registro de revisiones de auditoría (sampling) + flagging de docs
-- ============================================================================
-- Objetivo:
--   Persistir cada revisión de documentos realizada por el auditor (rol uif)
--   en tablas dedicadas, SIN tocar la tabla clients. Permite:
--     - Constancia histórica (hoy auditó N, ayer M, etc.) y export a gerencia.
--     - Marcar documentos como erróneos -> revisión 'incorrecto' + notificación.
--     - Re-auditar el mismo cliente (sin sobrescribir revisiones previas).
--
-- Permiso reutilizado: auditoria.ver (uif por default, admin por bypass).
-- RLS alineado al patrón de document_exceptions: cada uif ve lo suyo, admin todo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla principal: una fila por cliente revisado
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_revisiones (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	client_id uuid NOT NULL REFERENCES public.clients(id),
	client_type text,
	nombre_cliente text,                 -- snapshot del nombre al momento de revisar
	revisado_por uuid NOT NULL REFERENCES public.profiles(id),
	fecha_revision timestamptz NOT NULL DEFAULT now(),
	resultado text NOT NULL CHECK (resultado IN ('correcto', 'incorrecto')),
	notas text,
	notificado boolean NOT NULL DEFAULT false,
	fecha_notificacion timestamptz,
	notificado_a text,                   -- email del destinatario (creador del cliente)
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_revisiones_revisado_por
	ON public.auditoria_revisiones (revisado_por);
CREATE INDEX IF NOT EXISTS idx_auditoria_revisiones_client_id
	ON public.auditoria_revisiones (client_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_revisiones_fecha
	ON public.auditoria_revisiones (fecha_revision DESC);

COMMENT ON TABLE public.auditoria_revisiones IS
	'Constancia de revisiones de documentos del módulo de auditoría (sampling). Independiente de clients para permitir re-auditorías.';

-- ----------------------------------------------------------------------------
-- Tabla hija: documentos problemáticos de cada revisión incorrecta
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_revision_documentos (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	revision_id uuid NOT NULL REFERENCES public.auditoria_revisiones(id) ON DELETE CASCADE,
	documento_id uuid REFERENCES public.clientes_documentos(id), -- null cuando es faltante
	tipo_documento text NOT NULL,
	problema text NOT NULL CHECK (problema IN ('incorrecto', 'faltante')),
	nota text
);

CREATE INDEX IF NOT EXISTS idx_auditoria_revision_documentos_revision
	ON public.auditoria_revision_documentos (revision_id);

COMMENT ON TABLE public.auditoria_revision_documentos IS
	'Documentos observados (incorrectos marcados por el auditor o faltantes snapshot) por revisión.';

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.auditoria_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_revision_documentos ENABLE ROW LEVEL SECURITY;

-- auditoria_revisiones: insertar solo uif/admin y como uno mismo
DROP POLICY IF EXISTS auditoria_revisiones_insert ON public.auditoria_revisiones;
CREATE POLICY auditoria_revisiones_insert ON public.auditoria_revisiones
	FOR INSERT
	WITH CHECK (
		revisado_por = (SELECT auth.uid())
		AND EXISTS (
			SELECT 1 FROM public.profiles
			WHERE profiles.id = (SELECT auth.uid())
			  AND profiles.role = ANY (ARRAY['admin'::text, 'uif'::text])
		)
	);

-- auditoria_revisiones: cada uif ve lo suyo, admin ve todo
DROP POLICY IF EXISTS auditoria_revisiones_select ON public.auditoria_revisiones;
CREATE POLICY auditoria_revisiones_select ON public.auditoria_revisiones
	FOR SELECT
	USING (
		revisado_por = (SELECT auth.uid())
		OR EXISTS (
			SELECT 1 FROM public.profiles
			WHERE profiles.id = (SELECT auth.uid())
			  AND profiles.role = 'admin'::text
		)
	);

-- auditoria_revisiones: actualizar (reintento de notificación) dueño o admin
DROP POLICY IF EXISTS auditoria_revisiones_update ON public.auditoria_revisiones;
CREATE POLICY auditoria_revisiones_update ON public.auditoria_revisiones
	FOR UPDATE
	USING (
		revisado_por = (SELECT auth.uid())
		OR EXISTS (
			SELECT 1 FROM public.profiles
			WHERE profiles.id = (SELECT auth.uid())
			  AND profiles.role = 'admin'::text
		)
	);

-- auditoria_revision_documentos: insertar si la revisión padre es del usuario (o admin)
DROP POLICY IF EXISTS auditoria_revision_documentos_insert ON public.auditoria_revision_documentos;
CREATE POLICY auditoria_revision_documentos_insert ON public.auditoria_revision_documentos
	FOR INSERT
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.auditoria_revisiones r
			WHERE r.id = revision_id
			  AND (
				r.revisado_por = (SELECT auth.uid())
				OR EXISTS (
					SELECT 1 FROM public.profiles
					WHERE profiles.id = (SELECT auth.uid())
					  AND profiles.role = 'admin'::text
				)
			  )
		)
	);

-- auditoria_revision_documentos: leer si la revisión padre es visible
DROP POLICY IF EXISTS auditoria_revision_documentos_select ON public.auditoria_revision_documentos;
CREATE POLICY auditoria_revision_documentos_select ON public.auditoria_revision_documentos
	FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.auditoria_revisiones r
			WHERE r.id = revision_id
			  AND (
				r.revisado_por = (SELECT auth.uid())
				OR EXISTS (
					SELECT 1 FROM public.profiles
					WHERE profiles.id = (SELECT auth.uid())
					  AND profiles.role = 'admin'::text
				)
			  )
		)
	);
