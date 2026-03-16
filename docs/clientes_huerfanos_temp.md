# Clientes huérfanos - registros en `clients` sin detalle en tabla hija

Estos clientes tienen `client_type` asignado pero NO tienen registro en su tabla de detalle correspondiente.
Deben ser revisados y subsanados (completar datos) o eliminados.

---

## NATURAL (26 registros) — sin entrada en `natural_clients`

| UUID | created_at |
|------|-----------|
| 8f12e019-8164-473b-80d1-9e05409b6d4a | 2026-03-13 |
| 96291c08-ee41-4fe9-9bd8-391295e4a4a3 | 2026-03-13 |
| f20c4f4f-2197-4145-8c85-e8e38889183e | 2026-03-13 |
| db958897-9bdf-47c7-8278-2e1b4ccc9303 | 2026-03-13 |
| f93ea1b5-5cea-4d7e-93a7-adec8b38b19c | 2026-03-13 |
| 4db9a50a-8f2d-465c-9c7d-47ecdc0b77b3 | 2026-03-13 |
| 184354b7-416b-48fe-b258-7fcaa96d32a5 | 2026-03-12 |
| a3ff33ce-41a5-41bd-934c-f9041e5bdf68 | 2026-03-11 |
| 9ed13a50-95ab-4569-839e-4a5bbb8836e7 | 2026-03-11 |
| 6b4fb0c7-a22c-4b57-942b-63a1d5e4ea40 | 2026-03-11 |
| bc2db483-ff56-44c4-a3ff-9c15f0914b73 | 2026-03-09 |
| fb74ef60-3b8f-4193-ab34-8d5c2f88fc84 | 2026-03-09 |
| efc86dcc-bfa1-4434-b2f4-dab0601064be | 2026-03-09 |
| e44091c7-6c4e-4790-8e1d-2156ec8598d7 | 2026-03-09 |
| 3b33ea72-4024-4c5e-bc9c-2965da5c2193 | 2026-03-09 |
| 4f9c3266-f9da-446e-80fa-d368abbcec59 | 2026-03-09 |
| e3316c4d-30e0-426b-aad1-2b0478a7d57f | 2026-03-09 |
| 6b5bdfe9-5ae0-49fd-9a99-e9800900ddb7 | 2026-03-09 |
| 1b99c9bd-52f0-4ed6-9cec-fe7c7e7e1630 | 2026-03-09 |
| 6bb64860-97ec-48f3-a9b4-f0f9e69f52fb | 2026-03-06 |
| 39e0d76c-672e-4388-87bf-7b449b26e82c | 2026-03-06 |
| 58315cec-6464-4d02-aed2-ab96abbd4844 | 2026-03-06 |
| a317ed5f-a873-4cd0-80aa-8017e24334ee | 2026-03-06 |
| 416999ae-dea8-4f60-8523-feea72d17540 | 2026-03-06 |
| 6d30a9d8-792b-452e-a673-cbf93094c350 | 2026-03-06 |
| 655255cd-2342-4ec3-9008-fa6e402b7f56 | 2026-03-06 |

---

## UNIPERSONAL (12 registros) — sin entrada en `unipersonal_clients`

| UUID | created_at |
|------|-----------|
| f6f4b43d-97c2-4a1c-95b4-46e1fa229dfe | 2026-02-27 |
| 6dd05158-0ae3-4509-a3d6-6ad5eac27c6d | 2026-02-27 |
| f827bca1-ef9c-4070-b694-4199b2cab38e | 2026-02-27 |
| 81685a39-6f04-475a-a783-b0365641ea68 | 2026-02-27 |
| cebc5a6b-ed09-4c86-b1e3-f88c8791af41 | 2026-02-27 |
| 0c6e2345-9d84-4276-8b0f-0a1979a8996a | 2026-02-27 |
| daf4f3a4-1cb8-427e-8014-1e623098fb27 | 2026-02-27 |
| 69f661fd-5f54-4b98-9d64-dcf60d5580a6 | 2026-02-27 |
| 9ad29bc4-7b72-4a08-b750-0928f77641cb | 2026-02-27 |
| b52f8c3e-5462-4f11-bdd0-f1afb6e28a56 | 2026-02-27 |
| 225e8e8f-4ee5-44ff-8e08-81a86fbc1701 | 2026-02-27 |
| a0d0074c-4a63-4a63-b058-2156c4cf64fa | 2026-02-27 |

---

## SQL: verificar integridad de un UUID individual

Reemplaza `<UUID_AQUI>` y ejecuta en Supabase SQL Editor:

```sql
SELECT
  c.id,
  c.client_type,
  c.status,
  c.created_at,

  -- ¿Tiene el detalle que le corresponde?
  CASE c.client_type
    WHEN 'natural'      THEN (n.client_id IS NOT NULL)::text
    WHEN 'unipersonal'  THEN (u.client_id IS NOT NULL)::text
    WHEN 'juridica'     THEN (j.client_id IS NOT NULL)::text
  END AS detalle_ok,

  -- Nombre según tipo
  CASE c.client_type
    WHEN 'natural'     THEN n.primer_nombre || ' ' || n.primer_apellido
    WHEN 'unipersonal' THEN u.razon_social
    WHEN 'juridica'    THEN j.razon_social
  END AS nombre,

  -- ¿Tiene pólizas asociadas?
  COUNT(p.id) AS polizas_asociadas

FROM clients c
LEFT JOIN natural_clients     n ON n.client_id = c.id
LEFT JOIN unipersonal_clients u ON u.client_id = c.id
LEFT JOIN juridic_clients     j ON j.client_id = c.id
LEFT JOIN polizas             p ON p.asegurado_id = c.id

WHERE c.id = '<UUID_AQUI>'  -- ← reemplazar

GROUP BY c.id, c.client_type, c.status, c.created_at,
         n.client_id, n.primer_nombre, n.primer_apellido,
         u.client_id, u.razon_social,
         j.client_id, j.razon_social;
```

Si `detalle_ok = false` y `polizas_asociadas = 0` → seguro eliminar.

---

## Acción recomendada

Para eliminar todos si no tienen datos de ningún tipo:
```sql
-- Verificar primero que no tengan pólizas asociadas
SELECT c.id FROM clients c
LEFT JOIN polizas p ON p.asegurado_id = c.id
WHERE c.id IN (
  '8f12e019-8164-473b-80d1-9e05409b6d4a', -- ... agregar todos los UUIDs
) AND p.id IS NULL;
```
