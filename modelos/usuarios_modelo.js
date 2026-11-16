// usuarios_modelo.js
// Todas las consultas a la base de datos relacionadas con usuarios.

const conexion = require('../conexion');

// Busca un usuario por correo (para saber si ya existe)
async function buscarPorCorreo(correo) {
  const resultado = await conexion.query(
    'SELECT id_usuario FROM musuario WHERE correo = $1',
    [correo]
  );
  return resultado.rows[0];
}

// Busca un usuario por teléfono
async function buscarPorTelefono(telefono) {
  const resultado = await conexion.query(
    'SELECT id_usuario FROM musuario WHERE telefono = $1',
    [telefono]
  );
  return resultado.rows[0];
}

// Busca un usuario por CURP
async function buscarPorCurp(curp) {
  const resultado = await conexion.query(
    'SELECT id_usuario FROM musuario WHERE curp = $1',
    [curp]
  );
  return resultado.rows[0];
}

// Crea un usuario nuevo y regresa su id
async function crearUsuario(datos) {
  const resultado = await conexion.query(
    `INSERT INTO musuario
       (id_tipo_usuario, id_alcaldia, id_oficio,
        nombre, correo, contrasena, telefono, curp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_usuario`,
    [
      1,
      datos.id_alcaldia,
      datos.id_oficio,
      datos.nombre,
      datos.correo,
      datos.contrasena,
      datos.telefono,
      datos.curp
    ]
  );
  return resultado.rows[0];
}

// Busca un usuario por correo y regresa TODO lo necesario para el login
async function buscarParaLogin(correo) {
  const resultado = await conexion.query(
    `SELECT id_usuario, id_tipo_usuario, contrasena
     FROM musuario
     WHERE correo = $1`,
    [correo]
  );
  return resultado.rows[0]; // undefined si no existe
}

// Regresa todas las alcaldías
async function obtenerAlcaldias() {
  const resultado = await conexion.query(
    'SELECT id_alcaldia, nombre_alcaldia FROM calcaldia ORDER BY id_alcaldia'
  );
  return resultado.rows;
}

// Regresa todos los oficios
async function obtenerOficios() {
  const resultado = await conexion.query(
    'SELECT id_oficio, nombre_oficio FROM coficio ORDER BY id_oficio'
  );
  return resultado.rows;
}

module.exports = {
  buscarPorCorreo,
  buscarPorTelefono,
  buscarPorCurp,
  crearUsuario,
  buscarParaLogin,
  obtenerAlcaldias,
  obtenerOficios
};