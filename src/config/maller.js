const nodemailer = require('nodemailer');

// El transportador es quien realmente "envía" el correo, usando tu
// cuenta de Gmail como remitente. Las credenciales viven en el .env,
// nunca escritas aquí en el código.
const transportador = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // contraseña de aplicación, no tu clave normal
  },
});

// Función reutilizable: le pasas a quién, el asunto y el mensaje.
// Si el "contacto" del caso no parece un correo válido (a veces los
// clientes ponen su teléfono ahí), simplemente no intenta enviar nada.
async function enviarCorreo(destinatario, asunto, mensajeHtml) {
  const pareceCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario);
  if (!pareceCorreo) {
    console.log(`No se envió correo: "${destinatario}" no parece una dirección de correo válida.`);
    return;
  }

  try {
    await transportador.sendMail({
      from: `"NovaImport" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: asunto,
      html: mensajeHtml,
    });
    console.log(`Correo enviado a ${destinatario}: ${asunto}`);
  } catch (err) {
    // Si falla el envío de correo, NO debe tumbar toda la petición —
    // el caso ya se guardó bien en la base de datos, el correo es un
    // extra. Solo lo dejamos registrado en la consola.
    console.error('Error al enviar correo:', err.message);
  }
}

module.exports = { enviarCorreo };