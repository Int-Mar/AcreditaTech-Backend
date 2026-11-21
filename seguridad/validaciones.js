// seguridad/validaciones.js
// Reglas de validación de AcreditaTech.
// TODOS los controladores deben usar este archivo: así cada regla se cambia
// en un solo lugar y no se repite en cada controlador.

const esTexto = (v) => typeof v === 'string';

// Nombre: solo letras (con acentos, ñ y ü) y espacios, de 5 a 25 caracteres
const REGLA_NOMBRE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]{5,25}$/;
const esNombre = (v) => esTexto(v) && REGLA_NOMBRE.test(v.trim());

// Correo: solo @gmail.com, máximo 50 caracteres.
// Antes del @ solo se aceptan letras, números y los símbolos . _ % + -
const REGLA_CORREO = /^[A-Za-z0-9._%+\-]+@gmail\.com$/i;
const esCorreoGmail = (v) =>
  esTexto(v) && v.trim().length <= 50 && REGLA_CORREO.test(v.trim());

// Teléfono: 10 dígitos que empiezan con 55
const esTelefono55 = (v) => esTexto(v) && /^55\d{8}$/.test(v);

// Contraseña: de 8 a 20 caracteres ASCII visibles (sin espacios), con al menos
// una minúscula, una mayúscula, un número y un símbolo
const REGLA_CONTRASENA =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\x21-\x7E]{8,20}$/;
const esContrasena = (v) => esTexto(v) && REGLA_CONTRASENA.test(v);

// CURP: 4 letras, fecha (AAMMDD), sexo (H/M/X), 2 letras de estado,
// 3 consonantes internas, 1 homoclave (letra o número) y 1 dígito verificador
const REGLA_CURP =
  /^[A-Z]{4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;
const esCurp = (v) => esTexto(v) && REGLA_CURP.test(v.trim().toUpperCase());

// Id numérico positivo que cabe en un INTEGER de PostgreSQL.
// Acepta 5 o "5"; rechaza "5abc", "1e3", "0x10", [5], true, -1 y 0.
const MAX_ID = 2147483647;
const esIdValido = (v) => {
  if (typeof v === 'number') return Number.isInteger(v) && v > 0 && v <= MAX_ID;
  return esTexto(v) && /^[1-9]\d{0,9}$/.test(v) && Number(v) <= MAX_ID;
};

// Imagen real: revisa los primeros bytes del archivo (su "firma"), no solo lo
// que dice el navegador en el mimetype, que cualquiera puede falsificar
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function esImagenReal(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (mimetype === 'image/jpeg') {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer.length > 8 && FIRMA_PNG.every((byte, i) => buffer[i] === byte);
  }
  return false;
}

module.exports = {
  esTexto, esNombre, esCorreoGmail, esTelefono55,
  esContrasena, esCurp, esIdValido, esImagenReal,
};
