# Política de Seguridad

## Reporte de Vulnerabilidades

Para reportar una vulnerabilidad de seguridad, contactar al equipo de desarrollo de PATRIA SA directamente. No abrir issues públicos para problemas de seguridad.

## Versiones Soportadas

Solo la rama `master` recibe parches de seguridad activos.

## Riesgos Aceptados

Esta sección documenta vulnerabilidades conocidas que han sido evaluadas y aceptadas tras análisis de impacto.

### postcss < 8.5.10 anidado en next

- **Advisory**: [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
- **Severidad reportada**: Moderate
- **Severidad real para SIGS**: Ninguna
- **Fecha de evaluación**: 2026-05-20
- **Re-evaluar**: cuando Next.js publique una versión que actualice su postcss anidado, o anualmente

**Ruta de la dependencia**: `next@15.5.18 → postcss@8.4.31` (pin exacto dentro del propio package.json de Next).

**Vulnerabilidad**: XSS al stringificar CSS con `</style>` sin escapar mediante `postcss.stringify()`.

**Por qué no aplica a SIGS**:

1. `postcss` solo se ejecuta en **build-time**, nunca en runtime de producción.
2. Procesa exclusivamente nuestro código fuente CSS y el de Tailwind — no hay flujo donde CSS proveniente de usuarios externos llegue a `postcss.stringify()`.
3. Para explotar la vulnerabilidad un atacante necesitaría ya tener control sobre el pipeline de build, escenario en el cual este CVE es el menor de los problemas.

**Por qué no se aplicó un `overrides` en package.json**:

Forzar una versión distinta a la que Next pinea explícitamente añade complejidad de mantenimiento sin mitigar un riesgo real. Se prefiere mantener la dependencia tal como Next.js la distribuye y documentar la excepción.

**Mitigación**: ninguna requerida. Se monitorea via `npm audit` en cada update de dependencias.
