// Limita cuántas veces una misma IP puede llamar a una ruta.
// Los contadores viven en memoria: si el servidor se reinicia, empiezan de cero.
function crearLimitador({ ventanaMs, maximo, mensaje }) {
  const registros = new Map(); // ip -> { inicio, cuenta }

  // Limpieza periódica para que el Map no crezca sin fin
  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, registro] of registros) {
      if (ahora - registro.inicio > ventanaMs) registros.delete(ip);
    }
  }, ventanaMs).unref();

  return function limitar(req, res, next) {
    const ahora = Date.now();
    let registro = registros.get(req.ip);

    if (!registro || ahora - registro.inicio > ventanaMs) {
      registro = { inicio: ahora, cuenta: 0 };
      registros.set(req.ip, registro);
    }

    registro.cuenta += 1;

    if (registro.cuenta > maximo) {
      const segundos = Math.ceil((registro.inicio + ventanaMs - ahora) / 1000);
      res.set('Retry-After', String(segundos));
      return res.status(429).json({ mensaje });
    }
    next();
  };
}

// Login: máximo 10 intentos cada 15 minutos por IP
const limitarLogin = crearLimitador({
  ventanaMs: 15 * 60 * 1000,
  maximo: 10,
  mensaje: 'Demasiados intentos. Intenta de nuevo en unos minutos',
});

module.exports = { crearLimitador, limitarLogin };