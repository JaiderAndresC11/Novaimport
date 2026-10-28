const path = require('path');
const nodemailer = require('nodemailer');

const transportador = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Colores por estado, para la insignia del correo
const COLORES_ESTADO = {
  pendiente: { bg: '#FFF1E8', color: '#FF6B35', texto: 'Pendiente' },
  en_proceso: { bg: '#E6F7F5', color: '#0E8F82', texto: 'En proceso' },
  en_revision: { bg: '#E6F7F5', color: '#0E8F82', texto: 'En revisión' },
  resuelto: { bg: '#E6F7F5', color: '#0E8F82', texto: 'Cerrada' },
  aprobada: { bg: '#E6F7F5', color: '#0E8F82', texto: 'Aprobada' },
  rechazada: { bg: '#FBEAEA', color: '#D9363E', texto: 'Rechazada' },
  cerrada: { bg: '#E6F7F5', color: '#0E8F82', texto: 'Cerrada' },
};

// Arma el HTML completo del correo: logo, insignia de caso, estado, mensaje.
// Todo con estilos en línea (tablas), porque los clientes de correo
// (Gmail, Outlook...) ignoran las hojas de estilo externas.
function construirCorreoHtml({ nombre, numeroCaso, estado, tituloMensaje, cuerpoMensaje }) {
  const est = COLORES_ESTADO[estado] || { bg: '#F4F5F7', color: '#6B7280', texto: estado };

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7; padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; font-family:Arial,sans-serif;">

        <!-- Encabezado con logo -->
        <tr>
          <td style="background:#0C0F14; padding:22px 28px;">
            <span style="color:#FF6B35; font-size:20px;">●</span>
            <span style="color:#ffffff; font-size:18px; font-weight:bold; font-family:Georgia,serif; margin-left:6px;">NovaImport</span>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td style="padding:28px;">
            <p style="font-size:14px; color:#1A1D23; margin:0 0 18px;">Hola ${nombre},</p>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
              <tr>
                <td style="background:#F4F5F7; border-radius:6px; padding:6px 12px; font-family:monospace; font-size:13px; color:#1A1D23; font-weight:bold;">
                  ${numeroCaso}
                </td>
                <td style="width:10px;"></td>
                <td style="background:${est.bg}; border-radius:6px; padding:6px 12px; font-size:12px; color:${est.color}; font-weight:bold;">
                  ${est.texto}
                </td>
              </tr>
            </table>

            <p style="font-size:14px; color:#1A1D23; font-weight:bold; margin:0 0 8px;">${tituloMensaje}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left:3px solid #FF6B35; padding:10px 14px; background:#FAFAFA; font-size:13px; color:#333333; line-height:1.5;">
                  ${cuerpoMensaje}
                </td>
              </tr>
            </table>

            <p style="font-size:12px; color:#6B7280; margin:22px 0 0;">
              Si adjuntamos una foto o video, lo encontrarás como archivo adjunto de este correo.
            </p>
          </td>
        </tr>

        <!-- Pie de página -->
        <tr>
          <td style="background:#F4F5F7; padding:18px 28px; text-align:center;">
            <p style="font-size:11px; color:#9AA0A8; margin:0;">Este es un correo automático de NovaImport. Por favor no respondas directamente a este mensaje.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>`;
}

// archivoLocal (opcional): ruta absoluta en el servidor de una imagen o
// video a adjuntar de verdad en el correo (no solo un enlace).
async function enviarCorreo(destinatario, asunto, opciones, archivoLocal = null) {
  const pareceCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario);
  if (!pareceCorreo) {
    console.log(`No se envió correo: "${destinatario}" no parece una dirección de correo válida.`);
    return;
  }

  const attachments = [];
  if (archivoLocal) {
    attachments.push({ path: archivoLocal, filename: path.basename(archivoLocal) });
  }

  try {
    await transportador.sendMail({
      from: `"NovaImport" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: asunto,
      html: construirCorreoHtml(opciones),
      attachments,
    });
    console.log(`Correo enviado a ${destinatario}: ${asunto}`);
  } catch (err) {
    console.error('Error al enviar correo:', err.message);
  }
}

module.exports = { enviarCorreo };