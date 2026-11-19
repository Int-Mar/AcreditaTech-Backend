require('dotenv').config();
const bcrypt = require('bcryptjs');
const conexion = require('./conexion');
const reglas = require('./reglas');

async function crearAdministrador() {
  const correo = 'admin5@gmail.com';
  const contrasena = 'Admin12345';
  const telefono = '5500000005';
  const curp = 'ADMIN0000000000005';

  const cifrada = await bcrypt.hash(contrasena, 10);

  await conexion.query(
    `INSERT INTO musuario
       (id_tipo_usuario, id_alcaldia, id_oficio, nombre, correo,
        contrasena, telefono, curp)
     VALUES ($1, 1, 1, 'Administrador', $2, $3, $4, $5)
     ON CONFLICT DO NOTHING`,
    [reglas.ROL_ADMINISTRADOR, correo, cifrada, telefono, curp]
  );

  console.log('Administrador creado. Correo: ' + correo + ' | Contraseña: ' + contrasena);

  await conexion.end();
}

crearAdministrador().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});