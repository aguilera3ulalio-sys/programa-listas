// Email delivery for NIP recovery.
//
// Uses Resend (https://resend.com) when RESEND_API_KEY is set. If it is not
// configured, the code is written to the server log instead of being sent, so
// the whole flow can still be tested locally without an email provider.
// Nothing here ever throws in a way that would leak whether an account exists.

const FROM = process.env.MAIL_FROM || 'UAQ Docentes <onboarding@resend.dev>'
const APP_NAME = 'UAQ Docentes'

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

function buildHtml(name, code, minutes) {
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f0f0f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:460px;margin:0 auto;background:#ffffff;border-radius:14px;padding:32px;">
      <div style="font-size:18px;font-weight:700;color:#1a1a26;margin-bottom:4px;">${APP_NAME}</div>
      <div style="font-size:12px;color:#888;margin-bottom:24px;">Facultad de Informatica &middot; UAQ</div>
      <p style="font-size:14px;color:#1a1a26;line-height:1.6;margin:0 0 18px;">
        Hola${name ? ' ' + escapeHtml(name) : ''}, recibimos una solicitud para restablecer tu NIP.
        Usa este codigo:
      </p>
      <div style="background:#f5f5f8;border:1px dashed #c0185a;border-radius:10px;padding:18px;text-align:center;
                  font-size:30px;font-weight:700;letter-spacing:7px;color:#1a1a26;font-family:monospace;margin-bottom:18px;">
        ${code}
      </div>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 14px;">
        El codigo vence en ${minutes} minutos y solo puede usarse una vez.
      </p>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0;">
        Si tu no pediste esto, ignora este correo: tu NIP no ha cambiado.
      </p>
    </div>
  </body>
</html>`
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// Returns true if the message was handed off to the provider.
async function sendRecoveryCode(to, name, code, minutes = 15) {
  if (!isConfigured()) {
    console.log(`[correo no configurado] Codigo de recuperacion para ${to}: ${code} (vence en ${minutes} min)`)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `Tu codigo para restablecer el NIP - ${APP_NAME}`,
        html: buildHtml(name, code, minutes),
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('Fallo al enviar correo:', res.status, body)
      return false
    }
    return true
  } catch (e) {
    console.error('Fallo al enviar correo:', e.message)
    return false
  }
}

module.exports = { sendRecoveryCode, isConfigured }
