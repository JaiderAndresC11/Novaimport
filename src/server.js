require('dotenv').config();                  // Carga variables de entorno
const express = require('express');           // Trae Express
const cors = require('cors');                 // Trae CORS

const app = express();                         // Crea la aplicación del servidor

app.use(cors());                               // Permite peticiones desde el navegador
app.use(express.json());                       // Permite recibir datos en formato JSON

app.get('/', (req, res) => {                   // Ruta de prueba: "/"
  res.json({ mensaje: 'API de NovaImport funcionando' });  // Responde con un mensaje
});

const PORT = process.env.PORT || 3000;         // Usa el puerto del .env, o 3000 si no hay
app.listen(PORT, () => {                       // Arranca el servidor
  console.log(`Servidor corriendo en puerto ${PORT}`);  // Avisa en consola
});