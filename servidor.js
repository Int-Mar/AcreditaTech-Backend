require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conexion = require('./conexion');

const app = express();
app.set('trust proxy', 1); // así req.ip es la IP real
app.use(cors({ origin: process.env.URL_PAGINA_WEB }));

// Cuerpo JSON de máximo 20 KB (las fotos van por multer, no por aquí)
app.use(express.json({ limit: '20kb' }));

// En Express 5, si la petición no trae cuerpo, req.body es undefined
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor de AcreditaTech funcionando' });
});

app.get('/prueba-bd', async (req, res) => {
  try {
    const resultado = await conexion.query('SELECT nombre_oficio FROM coficio');
    res.json(resultado.rows);
  } catch (error) {
    // El detalle solo va a la consola del servidor
    console.error('Error en /prueba-bd:', error.message);
    res.status(500).json({ mensaje: 'Error de base de datos' });
  }
});

// RUTAS_AQUI
app.use('/api/acceso', require('./rutas/acceso_rutas'));
app.use('/api/perfil', require('./rutas/perfil_rutas'));
app.use('/api/evaluaciones', require('./rutas/evaluaciones_rutas'));
app.use('/api/salud', require('./rutas/salud_rutas'));
app.use('/api/guias', require('./rutas/guias_rutas'));
app.use('/api/avance', require('./rutas/avance_rutas'));
app.use('/api/constancia', require('./rutas/constancia_rutas'));
app.use('/api/administracion', require('./rutas/administracion_rutas'));

// Ruta que no existe
app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// Manejador global de errores (siempre al final, con 4 parámetros)
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ mensaje: 'La petición es demasiado grande' });
  }
  console.error('Error no controlado:', error.message);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

const puerto = process.env.PORT || process.env.PUERTO || 4000;
app.listen(puerto, () => console.log('Servidor en el puerto ' + puerto));