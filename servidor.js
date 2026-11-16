require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conexion = require('./conexion');

const app = express();
app.use(cors({ origin: process.env.URL_PAGINA_WEB }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor de AcreditaTech funcionando' });
});

app.get('/prueba-bd', async (req, res) => {
  try {
    const resultado = await conexion.query('SELECT nombre_oficio FROM coficio');
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// RUTAS_AQUI

const puerto = process.env.PORT || process.env.PUERTO || 4000;
app.listen(puerto, () => console.log('Servidor en el puerto ' + puerto));