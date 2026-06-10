import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "notificaciones@patria-sigs.com";
const APP_NAME = "SIGS - PATRIA S.A.";

export interface EnvioRechazoPolizaParams {
	destinatario: {
		nombre: string;
		email: string;
	};
	poliza: {
		numero: string;
		ramo: string;
	};
	rechazadoPor: string;
	motivo: string;
	puedeEditarHasta: Date;
	ccLider?: string;
}

export async function enviarEmailRechazoPoliza(params: EnvioRechazoPolizaParams): Promise<void> {
	const { destinatario, poliza, rechazadoPor, motivo, puedeEditarHasta, ccLider } = params;

	const fechaLimite = puedeEditarHasta.toLocaleString("es-BO", {
		timeZone: "America/La_Paz",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Póliza Rechazada</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #b91c1c; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
    .body { padding: 32px; color: #374151; }
    .alert-box { background: #fef2f2; border-left: 4px solid #b91c1c; padding: 16px; border-radius: 4px; margin: 20px 0; }
    .alert-box p { margin: 0; color: #991b1b; font-weight: 600; }
    .reason-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0; }
    .reason-box h3 { margin: 0 0 8px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .reason-box p { margin: 0; color: #111827; font-size: 15px; line-height: 1.6; }
    .deadline { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 16px; margin: 20px 0; }
    .deadline p { margin: 0; color: #9a3412; }
    .deadline strong { font-size: 16px; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 13px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Póliza Rechazada — Acción Requerida</h1>
    </div>
    <div class="body">
      <p>Hola <strong>${destinatario.nombre}</strong>,</p>
      <p>La siguiente póliza a tu cargo fue <strong>rechazada</strong> por <strong>${rechazadoPor}</strong> y requiere correcciones.</p>

      <div class="reason-box">
        <h3>Póliza</h3>
        <p><strong>N°:</strong> ${poliza.numero} &nbsp;·&nbsp; <strong>Ramo:</strong> ${poliza.ramo}</p>
      </div>

      <div class="alert-box">
        <p>Motivo del rechazo:</p>
      </div>
      <div class="reason-box">
        <p>${motivo}</p>
      </div>

      <div class="deadline">
        <p>Tienes hasta el <strong>${fechaLimite}</strong> para corregir y reenviar la póliza a revisión.</p>
        <p style="margin-top:8px;font-size:13px;">Pasada esa fecha, el permiso de edición expirará automáticamente.</p>
      </div>

      <p>Ingresa al sistema, abre la póliza rechazada y realiza las correcciones indicadas antes de enviarla nuevamente a validación.</p>

      <p style="margin-top:24px;">Saludos,<br/><strong>${APP_NAME}</strong></p>
    </div>
    <div class="footer">
      Este es un mensaje automático del sistema SIGS. No respondas a este correo.
    </div>
  </div>
</body>
</html>`;

	const text = `Póliza Rechazada — Acción Requerida

Hola ${destinatario.nombre},

La póliza N° ${poliza.numero} (${poliza.ramo}) fue rechazada por ${rechazadoPor}.

Motivo del rechazo:
${motivo}

Tienes hasta el ${fechaLimite} para corregir y reenviar la póliza a revisión.

Ingresa al sistema SIGS, abre la póliza rechazada y realiza las correcciones indicadas.

${APP_NAME}`;

	const { error } = await resend.emails.send({
		from: `${APP_NAME} <${FROM_EMAIL}>`,
		to: [destinatario.email],
		...(ccLider ? { cc: [ccLider] } : {}),
		subject: `Póliza N° ${poliza.numero} rechazada — Tienes 24 horas para corregirla`,
		html,
		text,
	});

	if (error) {
		// Log pero no bloqueamos el flujo principal
		console.error("Error enviando email de rechazo:", error);
		throw new Error(`Error al enviar email: ${error.message}`);
	}
}

export interface EnvioDocumentosIncorrectosParams {
	destinatario: {
		nombre: string;
		email: string;
	};
	cliente: {
		nombre: string;
		tipo: string;
	};
	auditor: string;
	documentosIncorrectos: { label: string; nota?: string | null }[];
	documentosFaltantes: string[];
	notas?: string | null;
}

export async function enviarEmailDocumentosIncorrectos(params: EnvioDocumentosIncorrectosParams): Promise<void> {
	const { destinatario, cliente, auditor, documentosIncorrectos, documentosFaltantes, notas } = params;

	const incorrectosHtml = documentosIncorrectos.length
		? `<ul style="margin:8px 0 0;padding-left:20px;color:#111827;">${documentosIncorrectos
				.map(
					(d) =>
						`<li style="margin-bottom:4px;"><strong>${d.label}</strong>${
							d.nota ? ` — ${d.nota}` : ""
						}</li>`,
				)
				.join("")}</ul>`
		: `<p style="margin:8px 0 0;color:#6b7280;">Ninguno.</p>`;

	const faltantesHtml = documentosFaltantes.length
		? `<ul style="margin:8px 0 0;padding-left:20px;color:#111827;">${documentosFaltantes
				.map((d) => `<li style="margin-bottom:4px;">${d}</li>`)
				.join("")}</ul>`
		: `<p style="margin:8px 0 0;color:#6b7280;">Ninguno.</p>`;

	const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Documentos observados en auditoría</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #b45309; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
    .body { padding: 32px; color: #374151; }
    .alert-box { background: #fffbeb; border-left: 4px solid #b45309; padding: 16px; border-radius: 4px; margin: 20px 0; }
    .alert-box p { margin: 0; color: #92400e; font-weight: 600; }
    .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .box h3 { margin: 0 0 4px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 13px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Documentos observados en auditoría — Acción Requerida</h1>
    </div>
    <div class="body">
      <p>Hola <strong>${destinatario.nombre}</strong>,</p>
      <p>En una revisión de auditoría realizada por <strong>${auditor}</strong> se observaron documentos del cliente a tu cargo que requieren corrección.</p>

      <div class="box">
        <h3>Cliente</h3>
        <p style="margin:0;color:#111827;"><strong>${cliente.nombre}</strong> &nbsp;·&nbsp; ${cliente.tipo}</p>
      </div>

      <div class="alert-box">
        <p>Documentos marcados como incorrectos:</p>
      </div>
      <div class="box">${incorrectosHtml}</div>

      <div class="box">
        <h3>Documentos faltantes</h3>
        ${faltantesHtml}
      </div>

      ${
			notas
				? `<div class="box"><h3>Notas del auditor</h3><p style="margin:0;color:#111827;line-height:1.6;">${notas}</p></div>`
				: ""
		}

      <p>Ingresa al sistema SIGS, abre el cliente y corrige o vuelve a cargar los documentos observados.</p>

      <p style="margin-top:24px;">Saludos,<br/><strong>${APP_NAME}</strong></p>
    </div>
    <div class="footer">
      Este es un mensaje automático del sistema SIGS. No respondas a este correo.
    </div>
  </div>
</body>
</html>`;

	const text = `Documentos observados en auditoría — Acción Requerida

Hola ${destinatario.nombre},

En una revisión de auditoría realizada por ${auditor} se observaron documentos del cliente ${cliente.nombre} (${cliente.tipo}) que requieren corrección.

Documentos marcados como incorrectos:
${documentosIncorrectos.length ? documentosIncorrectos.map((d) => `- ${d.label}${d.nota ? ` — ${d.nota}` : ""}`).join("\n") : "Ninguno."}

Documentos faltantes:
${documentosFaltantes.length ? documentosFaltantes.map((d) => `- ${d}`).join("\n") : "Ninguno."}
${notas ? `\nNotas del auditor:\n${notas}\n` : ""}
Ingresa al sistema SIGS, abre el cliente y corrige los documentos observados.

${APP_NAME}`;

	const { error } = await resend.emails.send({
		from: `${APP_NAME} <${FROM_EMAIL}>`,
		to: [destinatario.email],
		subject: `Documentos observados en auditoría — ${cliente.nombre}`,
		html,
		text,
	});

	if (error) {
		console.error("Error enviando email de documentos incorrectos:", error);
		throw new Error(`Error al enviar email: ${error.message}`);
	}
}
