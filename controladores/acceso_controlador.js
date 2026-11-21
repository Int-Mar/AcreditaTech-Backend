// acceso_controlador.js
// Reglas del negocio: validar datos, cifrar, generar token, decidir qué responder.

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const modelo = require('../modelos/usuarios_modelo');
const {
  esTexto, esNombre, esCorreoGmail, esTelefono55,
  esContrasena, esCurp, esIdValido,
} = require('../seguridad/validaciones');

// ── Catálogos ──────────────────────────────────────────────────────────────
// GET /api/acceso/catalogos
async function obtenerCatalogos(req, res) {
  try {
    const alcaldias = await modelo.obtenerAlcaldias();
    const oficios   = await modelo.obtenerOficios();
    res.json({ alcaldias, oficios });
  } catch (error) {
    console.error('Error en catalogos:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener catálogos' });
  }
}

// ── Registro ───────────────────────────────────────────────────────────────
// POST /api/acceso/registro
async function registrar(req, res) {
  const cuerpo = req.body || {};
  const { contrasena, telefono, id_alcaldia, id_oficio, acepta_terminos } = cuerpo;

  // 1. Los campos de texto deben llegar como texto. Si llegaba un número, un
  //    arreglo o un objeto, .trim() fallaba y respondía 500; ahora responde 400.
  if (![cuerpo.nombre, cuerpo.correo, contrasena, telefono, cuerpo.curp].every(esTexto)) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
  }
  if (!esIdValido(id_alcaldia) || !esIdValido(id_oficio)) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
  }
  if (acepta_terminos !== true) {
    return res.status(400).json({ mensaje: 'Debes aceptar los términos' });
  }

  // 2. Limpiar y normalizar ANTES de validar y de buscar duplicados
  const nombre = cuerpo.nombre.trim();
  const correo = cuerpo.correo.trim().toLowerCase();
  const curp   = cuerpo.curp.trim().toUpperCase();

  // 3. Validar el formato (las reglas viven en seguridad/validaciones.js)
  if (!esNombre(nombre)) {
    return res.status(400).json({
      mensaje: 'Nombre inválido: solo letras, entre 5 y 25 caracteres'
    });
  }
  if (!esTelefono55(telefono)) {
    return res.status(400).json({
      mensaje: 'Teléfono inválido: 10 dígitos comenzando con 55'
    });
  }
  if (!esCorreoGmail(correo)) {
    return res.status(400).json({
      mensaje: 'Correo inválido: debe ser @gmail.com de máximo 50 caracteres'
    });
  }
  if (!esContrasena(contrasena)) {
    return res.status(400).json({
      mensaje: 'Contraseña inválida: 8 a 20 caracteres con mayúscula, minúscula, número y símbolo'
    });
  }
  if (!esCurp(curp)) {
    return res.status(400).json({
      mensaje: 'CURP inválida: revisa que tenga el formato correcto (18 caracteres)'
    });
  }

  try {
    // 4. La alcaldía y el oficio deben existir
    const alcaldiaExiste = await modelo.existeAlcaldia(Number(id_alcaldia));
    const oficioExiste   = await modelo.existeOficio(Number(id_oficio));
    if (!alcaldiaExiste || !oficioExiste) {
      return res.status(400).json({ mensaje: 'Alcaldía u oficio no válido' });
    }

    // 5. Revisar duplicados (ya con el correo en minúsculas y la CURP en mayúsculas)
    if (await modelo.buscarPorCorreo(correo)) {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }
    if (await modelo.buscarPorTelefono(telefono)) {
      return res.status(409).json({ mensaje: 'El teléfono ya está registrado' });
    }
    if (await modelo.buscarPorCurp(curp)) {
      return res.status(409).json({ mensaje: 'La CURP ya está registrada' });
    }

    // 6. Cifrar la contraseña y guardar en la base de datos
    const contrasenaCifrada = await bcrypt.hash(contrasena, 10);

    const nuevo = await modelo.crearUsuario({
      id_alcaldia:  Number(id_alcaldia),
      id_oficio:    Number(id_oficio),
      nombre,
      correo,
      contrasena:   contrasenaCifrada,
      telefono,
      curp
    });

    res.status(201).json({
      mensaje: '¡Registro exitoso!',
      id_usuario: nuevo.id_usuario
    });

  } catch (error) {
    // 23505 = violación de UNIQUE en PostgreSQL (dos registros al mismo tiempo)
    if (error.code === '23505') {
      return res.status(409).json({ mensaje: 'El correo, teléfono o CURP ya está registrado' });
    }
    console.error('Error al registrar:', error.message);
    res.status(500).json({ mensaje: 'Error interno al registrar' });
  }
}

// ── Login ──────────────────────────────────────────────────────────────────
// POST /api/acceso/iniciar-sesion
async function iniciarSesion(req, res) {
  const { correo: correoCrudo, contrasena } = req.body || {};

  // 1. Validar que llegaron los dos campos y que son texto
  if (!esTexto(correoCrudo) || !esTexto(contrasena) ||
      !correoCrudo.trim() || !contrasena) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
  }

  // 2. Normalizar el correo y poner un tope de longitud (no se procesan textos enormes)
  const correo = correoCrudo.trim().toLowerCase();
  if (correo.length > 50 || contrasena.length > 72) {
    return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
  }

  try {
    // 3. Buscar el usuario en la base de datos
    const usuario = await modelo.buscarParaLogin(correo);

    // 4. Si no existe el correo, responder igual que si la contraseña fuera mala
    //    (nunca decimos cuál de los dos falló, por seguridad)
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    // 5. Comparar la contraseña que llegó con la cifrada que está en la BD
    const contrasenaCorrecta = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!contrasenaCorrecta) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    // 6. Generar el token JWT (dura 8 horas, firmado con la clave del .env)
    const token = jwt.sign(
      {
        id_usuario:      usuario.id_usuario,
        id_tipo_usuario: usuario.id_tipo_usuario
      },
      process.env.CLAVE_TOKEN,
      { expiresIn: '8h' }
    );

    // 7. Responder con el token
    res.json({
      mensaje: 'Sesión iniciada',
      token,
      id_tipo_usuario: usuario.id_tipo_usuario
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).json({ mensaje: 'Error interno al iniciar sesión' });
  }
}

module.exports = { obtenerCatalogos, registrar, iniciarSesion };
