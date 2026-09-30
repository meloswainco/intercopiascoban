/*
 * Utilidades de fecha del renderer.
 *
 * Contraparte de services/fechas.js: la base de datos siempre entrega hora local
 * del equipo en formato SQL naive ('YYYY-MM-DD HH:MM:SS'). Este módulo es el
 * único punto donde se convierte texto de la BD a Date y a texto para pantalla.
 *
 * El idioma/formato de salida se toma del sistema operativo (marca blanca):
 * no se fija 'es-GT' ni 'es-ES'. Puede sobrescribirse con la clave de
 * configuración `locale`.
 */
(function () {
  const pad = (valor, largo = 2) => String(valor).padStart(largo, '0');

  function localePreferido() {
    return window.POS_CONFIG?.locale || undefined;
  }

  function parseFechaSql(valor) {
    if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
    if (typeof valor === 'number' && Number.isFinite(valor)) return new Date(valor);

    const texto = String(valor ?? '').trim();
    if (!texto) return null;

    // Registros heredados en ISO con zona explícita ('...Z' o '...±HH:MM').
    const sufijo = texto.slice(10);
    if (/[zZ]$/.test(texto) || /[+-]\d{2}:?\d{2}$/.test(sufijo)) {
      const iso = new Date(texto);
      return Number.isNaN(iso.getTime()) ? null : iso;
    }

    const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (partes) {
      return new Date(
        Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]),
        Number(partes[4] || 0), Number(partes[5] || 0), Number(partes[6] || 0)
      );
    }

    const fallback = new Date(texto);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  function fechaLocalISO(valor = new Date()) {
    const d = parseFechaSql(valor);
    if (!d) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function horaLocalISO(valor = new Date()) {
    const d = parseFechaSql(valor);
    if (!d) return '';
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function formatearFechaHora(valor, placeholder = '--') {
    const d = parseFechaSql(valor);
    return d ? d.toLocaleString(localePreferido()) : placeholder;
  }

  function formatearFecha(valor, placeholder = '--') {
    const d = parseFechaSql(valor);
    return d ? d.toLocaleDateString(localePreferido()) : placeholder;
  }

  function formatearHora(valor, placeholder = '--') {
    const d = parseFechaSql(valor);
    return d ? d.toLocaleTimeString(localePreferido(), { hour: '2-digit', minute: '2-digit' }) : placeholder;
  }

  function formatearFechaLarga(valor, placeholder = '--') {
    const d = parseFechaSql(valor);
    if (!d) return placeholder;
    return d.toLocaleDateString(localePreferido(), {
      weekday: 'long', year: 'numeric', month: 'long', day: '2-digit'
    });
  }

  function sumarDias(valor, dias) {
    const base = parseFechaSql(valor) || new Date();
    const resultado = new Date(base.getTime());
    resultado.setDate(resultado.getDate() + Number(dias || 0));
    return resultado;
  }

  Object.assign(window, {
    parseFechaSql,
    fechaLocalISO,
    horaLocalISO,
    formatearFechaHora,
    formatearFecha,
    formatearHora,
    formatearFechaLarga,
    sumarDiasFecha: sumarDias
  });
})();
