# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

## Directivas base

- Para estructura o datos de la BD consulta Supabase directamente vía MCP; NO confíes en los archivos de migración locales.
- Cuidado con no consultar la base entera: limita columnas y filas en cada query.
- Verificación: solo `npm run lint` y `npx tsc --noEmit`. NUNCA `npm run build` ni levantar servidores (`dev`/`start`).
- SIEMPRE corrige los errores que aparezcan en lint/tsc, aunque no provengan de tus cambios.
- El usuario ejecuta las migraciones SQL manualmente; Claude solo tiene lectura en la BD. Las migraciones nuevas se dejan como archivo en `docs/migration_*.sql`.
- Prefiere la solución más confiable y estándar; simple y limpio. Al traer y renderizar datos considera initial load, transferencia de red y memoria (footprint mínimo en navegador y en bandwidth de Supabase).

## Comandos

- `npm run lint` — ESLint
- `npx tsc --noEmit` — chequeo de tipos
- `npm run format` — Prettier sobre todo el repo (o `npx prettier --write <archivos>` para archivos puntuales)
- `npm run dev` — dev server con Turbopack (no lo ejecutes)

## Stack

- Next.js 15.5 (App Router, Turbopack) + TypeScript estricto, path alias `@/*` → raíz
- Supabase: PostgreSQL + Auth SSR + Storage (cliente JS sin tipos generados)
- Tailwind CSS v4 + shadcn/ui (Radix) + design system "Petrol Corporate" (`docs/DESIGN_SYSTEM.md`, tokens en `app/globals.css`)
- React Hook Form + Zod, Recharts, ExcelJS, @react-pdf/renderer, JSZip, sonner, Sentry
- Env vars requeridas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Autenticación y permisos

- Sistema por invitación. Roles activos: admin, agente, comercial, cobranza, siniestros, uif, invitado, desactivado. El rol `usuario` existe en BD pero está deprecado: no asignarlo ni incluirlo en listas nuevas.
- Los permisos granulares viajan en el JWT (claims `user_role`, `user_permissions`, `team_member_ids`, `team_ids` inyectados por `custom_access_token_hook`). Cambios de permisos/equipos requieren re-login.
- Sello de equipo: `polizas.equipo_id` guarda el equipo del responsable al REGISTRAR (nunca se recalcula). Visibilidad de pólizas = responsable en mi equipo actual O póliza sellada con mi equipo — así la producción histórica no "viaja" cuando un miembro cambia de equipo. Helpers en `utils/auth/scopePolizas.ts` (`aplicarScopePolizas`, `polizaDentroDeScope`, `filtroEquipoOr`); la escritura (anexos, edición) sigue scopeada solo por responsable.
- Admin tiene bypass hardcodeado en código (nunca consulta permisos en BD).
- Server: helpers en `utils/auth/helpers.ts` (`getCurrentUser` cacheado, `hasPermission`/`requirePermission`, `getDataScopeFilter` — 0 queries a BD). Cliente: decodificar `session.access_token` (patrón en `components/ui/navbar.tsx` y `components/polizas/steps/DatosBasicos.tsx`).
- Middleware/proxy: `utils/supabase/middleware.ts` con mapa `PROTECTED_ROUTES` por permiso; el matcher de rutas vive SOLO en `proxy.ts` de la raíz (Next 16 renombró `middleware.ts` → `proxy.ts`).
- Doc de referencia: `docs/SISTEMA_PERMISOS_Y_EQUIPOS.md` (escrita antes del código; ante dudas, verificar la BD vía MCP).

## Módulos (app/)

- **polizas** — registro multi-paso (ver abajo), detalle, edición, renovación, anexos (inclusión/exclusión con validación gerencial), permisos por póliza.
- **clientes** — alta multi-tipo (natural, unipersonal, jurídica, ONG, club deportivo, asociación civil) con borrador en localStorage, detalle con edición, documentos con soft delete, teléfonos extra, excepciones de documentos.
- **cobranzas** — cuotas consolidadas, pagos parciales (libro de abonos con múltiples comprobantes), notas estructuradas, anexos cobrables, recordatorios por WhatsApp/email y avisos de mora en PDF.
- **siniestros** — registro multi-paso, edición (documentos por tipo, estados, responsable, cierre), export Excel.
- **vencimientos** — carga de Excel de pólizas por vencer, dashboard con filtros, cartas PDF masivas (ZIP) y WhatsApp.
- **gerencia** — dashboard estadístico (permiso `gerencia.ver`; pesado en BD, mantener aislado) y validación de pólizas/anexos en `/gerencia/validacion` (permiso `polizas.validar` o ser líder de equipo). Flujo: las pólizas nacen `pendiente` → gerencia valida (`activa`) o rechaza. Editar una póliza `activa` solo la devuelve a `pendiente` (limpiando `fecha_validacion`) si cambian campos financieros/clasificatorios (prima, comisiones, moneda, modalidad/cuotas, producto, compañía, ramo); las ediciones cosméticas preservan la validación para no duplicar producción ya reportada a la APS.
- **reportes** — exports consolidados, módulo independiente de gerencia: `gerencia.exportar` (Producción, Contable, Comisiones por Director, con data scoping por equipo), `gerencia.amlc` (reporte AMLC regulatorio, sin scoping) y `gerencia.aps` (9 reportes APS en ZIP: Producción PDF + Comisión/Prima Neta Excel × Ingreso/Egreso/General; sin scoping, USD→Bs con tipo de cambio editable).
- **auditoria** — revisiones por muestreo de clientes, flags de documentos erróneos (notifica por correo al creador), otorgamiento de excepciones, ventana de carga retroactiva.
- **rrhh** — perfiles de empleados con documentos.
- **admin** — usuarios (incluye firma PNG para PDFs), roles y permisos, equipos, catálogos de seguros, transferencias de datos, eliminación nuclear de pólizas.

## Flujo de creación de pólizas (`app/polizas/nueva`)

Formulario de 6 pasos, vertical acumulativo, orquestado por `components/polizas/NuevaPolizaForm.tsx`:
Buscar asegurado → Datos básicos → Datos específicos del ramo → Modalidad de pago → Documentos → Resumen.

- **Live-sync**: todos los pasos y ramo-forms sincronizan con el padre vía `hooks/useLiveSync` mientras se escribe (sin presionar "Continuar"); el borrador en localStorage siempre refleja lo escrito.
- **Recovery**: al reingresar con borrador pendiente se ofrece restaurar vía AlertDialog; `calcularPasoMaximoFormulario` (`utils/polizaValidation.ts`) recalcula hasta qué paso estaba desbloqueado.
- **Navegación step-aware**: se puede volver a pasos previos y editar sin perder datos.
- **Validación final**: Resumen revalida todo antes de guardar (datos básicos, modalidad, estructura por ramo, documentos obligatorios — constante `DOCUMENTOS_OBLIGATORIOS` en `utils/validationConstants.ts`); las advertencias tipo `error` bloquean el guardado.
- **Guardado**: server action `guardarPoliza` (`app/polizas/nueva/actions.ts`); ante fallo parcial, `limpiarPolizaFallida` revierte todo lo insertado (RPC `eliminar_poliza_completo` + archivos de Storage).
- Ramos con formulario propio en `components/polizas/ramos/` (Automotor, Salud, Vida, AP, Sepelio, Incendio, Riesgos Varios, RC, Ramos Técnicos, Transporte, Aeronavegación/Naves), con import desde Excel donde aplica.
- Pagos: contado/crédito con cuotas editables; cálculos por producto de aseguradora (`calcularComisionesConProducto`). `tipo_prima = sin_prima_propia` (madre open-cover) y `es_retroactiva` (carga histórica) relajan las validaciones de pago.
- Renovación: precarga datos base + ramo (no cuotas ni documentos) vía `utils/polizas/cargarFormState.ts`, compartido con edición.

## Documentos de pólizas

- Bucket de Storage: `polizas-documentos`.
- Subida SIEMPRE client-side a `temp/` (los Server Actions están limitados a 2MB y solo reciben metadatos); el action registra/mueve el archivo.
- Límite: 20MB por archivo. Formatos: PDF, JPG, PNG (el bucket `polizas-documentos` solo admite `image/*` y `application/pdf`; la subida pasa `contentType` con fallback por extensión para PDFs sin MIME detectado).
- Tipos de documento: Póliza (obligatorio para avanzar), Plan de pago CLIENTE, Plan de pago BROKER, Condicionado general, Otro.
- Soft delete: campo `estado` activo/descartado — comercial solo descarta; admin restaura o elimina físicamente (`docs/SOFT_DELETE_DOCUMENTOS.md`).

## Convenciones

- **ExcelJS** (NUNCA xlsx) para todo manejo de Excel; índices de celda empiezan en 1; `workbook.xlsx.load(buffer)` para leer y `writeBuffer()` para descargar.
- **Diálogos**: prohibido `confirm()`/`alert()` nativos — AlertDialog de shadcn para acciones destructivas, `toast` de sonner (Toaster global en `app/layout.tsx`) para avisos.
- **Colores**: solo tokens semánticos del design system (`bg-card`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-destructive`, success/warning/info con patrón `/10` fondos, `/20`–`/30` bordes, `/15` badges). No usar la paleta cruda de Tailwind.
- **Fechas** (zona America/La_Paz): helpers de `utils/formatters.ts` — columnas `date` → `formatDate`; `timestamptz` → `formatFechaLaPaz`/`formatHoraLaPaz`; hoy → `hoyLaPaz()`; Excel → `toExcelDateLaPaz()`.
- **Errores en cliente**: en los `catch` usar el helper `captureError` (Sentry), no solo `console.error`.
- **Responsive**: tabla en `md+` / tarjetas en `<md` para todos los listados; navbar con menú Sheet en móvil.
- **Combobox**: usar `components/ui/combobox.tsx` (cmdk). NO ejecutar `shadcn add` a ciegas: el registro actual trae variantes Base UI que sobrescriben `button.tsx`.
- Indentación con tabs (Prettier ya configurado en el repo).

## Known issues

- El bucket de Storage se crea manualmente en Supabase.
- Edición concurrente de pólizas no implementada.
- La subida de documentos durante el guardado no muestra indicador de progreso.
- El flujo de confirmación de email para reset de password necesita mejora.
- Considerar un job programado para limpiar documentos descartados con 90+ días.
