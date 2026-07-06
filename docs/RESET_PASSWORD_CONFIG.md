# Configuración manual: flujo de reseteo de contraseña

**Estado: PENDIENTE de aplicar en el Dashboard de Supabase** (el código de la app ya está listo).

## Problema

El link del correo de recuperación usa la plantilla por defecto (`{{ .ConfirmationURL }}`), que pasa por
`https://<proyecto>.supabase.co/auth/v1/verify?token=pkce_...&redirect_to=https://patria-sigs.com`. Eso falla por dos
motivos:

1. **Token PKCE**: el intercambio del código exige el `code_verifier` guardado en el navegador que _solicitó_ el
   reseteo. Como el reseteo lo dispara un **admin** desde `/admin/users` (server action), ese verifier vive en las
   cookies del admin — el usuario destino abre el link en otro navegador y el intercambio es imposible.
2. **`redirect_to` recortado a la raíz**: la app pasa `redirectTo: <origen>/auth/confirm`, pero como esa URL no está en
   la allow-list de Redirect URLs, GoTrue la reemplaza por el Site URL pelado. El usuario cae en `/` sin sesión y el
   middleware lo manda a `/auth/login`.

## Solución (Dashboard de Supabase)

### 1. Cambiar la plantilla del correo "Reset Password"

**Authentication → Emails (Templates) → Reset Password**: reemplazar el href que usa `{{ .ConfirmationURL }}` por un
link directo a la app con el token hash:

```html
<h2>Restablecer contraseña</h2>
<p>Haz clic abajo para restablecer la contraseña de tu cuenta SIGS:</p>
<p>
	<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Restablecer contraseña</a>
</p>
<p>Si no solicitaste este cambio, ignora este correo.</p>
```

Con `{{ .TokenHash }}` el link va directo a `/auth/confirm` de la app, que lo verifica server-side con
`supabase.auth.verifyOtp({ type: "recovery", token_hash })` — no depende de PKCE ni del navegador de origen — y
redirige a `/auth/reset-password` con sesión de recovery en cookies.

### 2. Verificar URLs

**Authentication → URL Configuration**:

- **Site URL**: `https://patria-sigs.com` (la plantilla usa `{{ .SiteURL }}`).
- **Redirect URLs** (allow-list): agregar `https://patria-sigs.com/**` y `http://localhost:3000/**`. No lo usa este
  flujo (el link ya no pasa por `/auth/v1/verify`), pero evita el mismo recorte silencioso en cualquier otro flujo que
  pase `redirectTo`.

## Flujo resultante

1. Admin dispara el reseteo en `/admin/users` (`resetPasswordForEmail`).
2. El correo llega con link a `https://patria-sigs.com/auth/confirm?token_hash=...&type=recovery`.
3. `app/auth/confirm/route.ts` verifica el OTP y redirige a `/auth/reset-password` (ruta pública en el middleware).
4. El usuario define la nueva contraseña (`app/auth/reset-password/actions.ts` → `updateUser`).

## Notas

- Los correos enviados **antes** del cambio de plantilla seguirán rotos (el `redirect_to` ya va incrustado); reenviar
  el reseteo después de aplicar la configuración.
- Probar en local requiere apuntar temporalmente el Site URL a `http://localhost:3000` o probar directo en producción,
  porque `{{ .SiteURL }}` es global por proyecto.
