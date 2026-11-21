const path = require("path");

const LOGO_BLANCO = path.join(__dirname, "..", "recursos", "logo-blanco.png");
const LOGO_AZUL = path.join(__dirname, "..", "recursos", "logo-azul.png");

const AZUL = "#1b4b73";
const AZUL_OSC = "#10293d";
const AZUL_CLA = "#a9c6dd";
const NARANJA = "#f7931e";
const GRIS = "#5d6163";
const GRIS_CLA = "#e3e8ec";

const ANCHO_PANEL = 270;

function dibujarSello(doc, cx, cy, picos, radioExt, radioInt) {
  const puntos = [];
  for (let i = 0; i < picos * 2; i++) {
    const radio = i % 2 === 0 ? radioExt : radioInt;
    const angulo = (Math.PI * i) / picos - Math.PI / 2;
    puntos.push([cx + radio * Math.cos(angulo), cy + radio * Math.sin(angulo)]);
  }
  doc.polygon(...puntos);
}

function dibujarTarjeta(doc, etiqueta, valor, x, y, ancho) {
  doc.roundedRect(x, y, ancho, 62, 4).fill("#f4f7fa");
  doc.rect(x, y, ancho, 3).fill(NARANJA);
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(GRIS)
    .text(etiqueta.toUpperCase(), x + 12, y + 14, {
      width: ancho - 24,
      characterSpacing: 1.2,
      lineBreak: false,
    });

  let tamano = 14;
  doc.font("Helvetica-Bold").fontSize(tamano);
  while (doc.widthOfString(valor) > ancho - 24 && tamano > 8) {
    tamano -= 0.5;
    doc.fontSize(tamano);
  }
  doc.fillColor(AZUL_OSC).text(valor, x + 12, y + 34, {
    width: ancho - 24,
    lineBreak: false,
  });
}

function dibujarConstancia(doc, datos) {
  const { trabajador, constancia, emision, vencimiento } = datos;
  const meses = datos.meses || 12;
  const W = doc.page.width;
  const H = doc.page.height;

  doc.rect(0, 0, W, H).fill("#ffffff");
  doc.save();
  doc.opacity(0.05).image(LOGO_AZUL, ANCHO_PANEL + 150, 150, { width: 380 });
  doc.restore();

  const degradado = doc.linearGradient(0, 0, ANCHO_PANEL, H);
  degradado.stop(0, AZUL).stop(1, AZUL_OSC);
  doc.rect(0, 0, ANCHO_PANEL, H).fill(degradado);

  doc.save();
  doc.opacity(0.07).fillColor("#ffffff");
  doc.circle(40, 560, 130).fill();
  doc.circle(250, 250, 70).fill();
  doc.restore();

  doc.rect(ANCHO_PANEL, 0, 7, H).fill(NARANJA);

  doc.image(LOGO_BLANCO, 38, 42, { fit: [110, 80] });
  doc
    .font("Helvetica-Bold")
    .fontSize(23)
    .fillColor("#ffffff")
    .text("AcreditaTech", 38, 140, { lineBreak: false });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(AZUL_CLA)
    .text(
      "Preparación para trabajadores\nde oficio · Ciudad de México",
      38,
      170,
      {
        width: ANCHO_PANEL - 60,
        lineGap: 2,
      },
    );
  doc.rect(38, 218, 34, 3).fill(NARANJA);

  const datosPanel = [
    ["Folio", constancia.codigo, 17],
    ["Fecha de emisión", emision, 13],
    ["Vigente hasta", vencimiento, 13],
  ];
  let y = 330;
  for (const [etiqueta, valor, tam] of datosPanel) {
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(AZUL_CLA)
      .text(etiqueta.toUpperCase(), 38, y, {
        characterSpacing: 1.5,
        lineBreak: false,
      });
    doc
      .font(etiqueta === "Folio" ? "Courier-Bold" : "Helvetica-Bold")
      .fontSize(tam)
      .fillColor("#ffffff")
      .text(valor, 38, y + 13, { lineBreak: false });
    y += 58;
  }

  const X = ANCHO_PANEL + 52;
  const ANCHO = W - X - 50;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(NARANJA)
    .text("DOCUMENTO INFORMATIVO", X, 48, {
      characterSpacing: 3,
      lineBreak: false,
    });

  doc
    .font("Times-Bold")
    .fontSize(40)
    .fillColor(AZUL_OSC)
    .text("Pre-Constancia", X, 66, { lineBreak: false });
  doc
    .font("Times-Italic")
    .fontSize(20)
    .fillColor(AZUL)
    .text("de Preparación", X, 112, { lineBreak: false });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(GRIS)
    .text("Se otorga a", X, 168, { lineBreak: false });

  let tamNombre = 32;
  doc.font("Times-Bold").fontSize(tamNombre);
  while (doc.widthOfString(trabajador.nombre) > ANCHO && tamNombre > 14) {
    tamNombre -= 1;
    doc.fontSize(tamNombre);
  }
  doc.fillColor(AZUL).text(trabajador.nombre, X, 186, {
    width: ANCHO,
    lineBreak: false,
  });
  doc.rect(X, 232, ANCHO, 1.5).fill(GRIS_CLA);
  doc.rect(X, 232, 70, 1.5).fill(NARANJA);

  if (trabajador.curp) {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(GRIS)
      .text("CURP", X, 245, { characterSpacing: 1.5, lineBreak: false });
    doc
      .font("Courier-Bold")
      .fontSize(11)
      .fillColor(AZUL_OSC)
      .text(trabajador.curp, X + 38, 242, { lineBreak: false });
  }

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(GRIS)
    .text(
      "por haber aprobado la evaluación técnica y la evaluación de salud y " +
        "seguridad, concluyendo su preparación en el oficio de:",
      X,
      270,
      { width: ANCHO - 120, lineGap: 3 },
    );

  const sep = 14;
  const anchoT = (ANCHO - sep * 2) / 3;
  dibujarTarjeta(doc, "Oficio", trabajador.nombre_oficio, X, 326, anchoT);
  dibujarTarjeta(
    doc,
    "Alcaldía",
    trabajador.nombre_alcaldia,
    X + anchoT + sep,
    326,
    anchoT,
  );
  dibujarTarjeta(
    doc,
    "Estado",
    "Preparación Completada",
    X + (anchoT + sep) * 2,
    326,
    anchoT,
  );

  const sx = W - 112;
  const sy = 470;
  dibujarSello(doc, sx, sy, 28, 56, 51);
  doc.fill(NARANJA);
  doc.circle(sx, sy, 43).lineWidth(1.5).strokeColor("#ffffff").stroke();
  doc.circle(sx, sy, 41).fill(AZUL_OSC);
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(NARANJA)
    .text("VIGENCIA", sx - 40, sy - 24, {
      width: 80,
      align: "center",
      characterSpacing: 1.5,
      lineBreak: false,
    });
  doc
    .font("Times-Bold")
    .fontSize(30)
    .fillColor("#ffffff")
    .text(String(meses), sx - 40, sy - 15, {
      width: 80,
      align: "center",
      lineBreak: false,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(NARANJA)
    .text("MESES", sx - 40, sy + 20, {
      width: 80,
      align: "center",
      characterSpacing: 1.5,
      lineBreak: false,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(AZUL)
    .text("FIRMA DIGITAL (HMAC-SHA256)", X, 425, {
      characterSpacing: 1.2,
      lineBreak: false,
    });
  const firma = constancia.firma_digital || "";
  doc
    .font("Courier")
    .fontSize(8)
    .fillColor(GRIS)
    .text(firma.slice(0, 32) + "\n" + firma.slice(32), X, 440, {
      lineGap: 2,
    });

  doc.rect(X, 515, ANCHO - 130, 0.7).fill(GRIS_CLA);
  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor(GRIS)
    .text(
      "Este documento es informativo: acredita la preparación completada en AcreditaTech " +
        "y no sustituye una certificación oficial.",
      X,
      525,
      { width: ANCHO - 130, lineGap: 2 },
    );
}

module.exports = { dibujarConstancia };
