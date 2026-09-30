/* ==========================================================================
   POS INCO V10.1 - Frontend Orchestrator & Native SQLite IPC Connector
   ========================================================================== */

// Variables globales que no están en Index.html
let cart = [];
let pressTimer = null;
let isLongPress = false;
let currentItem = null;
let editingIndex = null;
let currentFocus = -1;
const LONG_PRESS_TIME = 800;
let currentBotonSubmenu = null;
window.pedidoEdicionActual = null;

// --- FIX ELECTRON FOCUS LOSS BUG ---
window.customAlert = function(msg) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center modal-overlay';
    modal.innerHTML = `
        <div class="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 text-center border-t-8 border-blue-600 animate-fade-in-up">
            <div class="mb-4 text-blue-500 text-5xl">
                <i class="fas fa-info-circle"></i>
            </div>
            <h3 class="text-xl font-black text-slate-800 mb-2 uppercase tracking-wide">Notificación</h3>
            <p class="text-slate-600 font-medium mb-8">${msg}</p>
            <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl w-full transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-blue-300 outline-none" id="btn-custom-alert-ok">Aceptar</button>
        </div>
    `;
    document.body.appendChild(modal);
    const btn = document.getElementById('btn-custom-alert-ok');
    const cleanup = () => {
        modal.remove();
        document.body.focus();
    };
    btn.onclick = cleanup;
    const onKey = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            cleanup();
        }
    };
    modal.addEventListener('keydown', onKey);
    setTimeout(() => { btn.focus(); }, 100);
};

window.customConfirm = function(msg) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center modal-overlay';
        modal.innerHTML = `
            <div class="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 text-center border-t-8 border-orange-500 animate-fade-in-up">
                <div class="mb-4 text-orange-500 text-5xl">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="text-xl font-black text-slate-800 mb-2 uppercase tracking-wide">Confirmación</h3>
                <p class="text-slate-600 font-medium mb-8">${msg}</p>
                <div class="flex gap-4">
                    <button class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 px-6 rounded-xl w-full transition-all focus:ring-4 focus:ring-slate-300 outline-none" id="btn-custom-confirm-cancel">Cancelar</button>
                    <button class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl w-full transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-orange-300 outline-none" id="btn-custom-confirm-ok">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const btnOk = document.getElementById('btn-custom-confirm-ok');
        const btnCancel = document.getElementById('btn-custom-confirm-cancel');
        
        const cleanup = () => {
            modal.remove();
            document.body.focus();
        };
        
        btnOk.onclick = () => { cleanup(); resolve(true); };
        btnCancel.onclick = () => { cleanup(); resolve(false); };
        
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cleanup();
                resolve(false);
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (document.activeElement === btnCancel) {
                    cleanup();
                    resolve(false);
                } else {
                    cleanup();
                    resolve(true);
                }
            }
        };
        modal.addEventListener('keydown', onKey);
        setTimeout(() => { btnCancel.focus(); }, 100);
    });
};

window.alert = window.customAlert;

const confirmNativo = window.confirm.bind(window);
window.confirm = function(msg) {
    const resultado = confirmNativo(msg);
    window.posAPI?.refocusWindow?.();
    return resultado;
};
// -----------------------------------------

document.addEventListener('modalsReady', async () => {
  // Inicialización de SQLite y Configuración (Marca Blanca)
  await cargarConfiguracionInicial();
  await initUsers();
  await cargarBotonesGrid();
  await cargarTicketsAparcados();
  if (typeof window.cargarCategoriasDatalist === 'function') {
      await window.cargarCategoriasDatalist();
  }
  if (typeof window.cargarImpresoras === 'function') {
      await window.cargarImpresoras();
  }
  if (typeof window.cargarTop20 === 'function') {
      if (typeof window.cargarTopCategorias === 'function') await window.cargarTopCategorias();
      await window.cargarTop20();
  }
  
  // Event listeners globales
  setupEventListeners();
});

window.cargarCategoriasDatalist = async function() {
    if (!window.posAPI || !window.posAPI.obtenerCategoriasUnicas) return;
    try {
        const categorias = await window.posAPI.obtenerCategoriasUnicas();
        const dl = document.getElementById('category-list');
        if (dl) {
            dl.innerHTML = categorias.map(c => `<option value="${escaparHtml(c)}">`).join('');
        }
    } catch(err) {
        console.error("Error al cargar categorias:", err);
    }
};

/* -------------------------------------------------------------------------- */
/* 1. ONBOARDING & MARCA BLANCA                                              */
/* -------------------------------------------------------------------------- */
async function cargarConfiguracionInicial() {
  if (!window.posAPI) {
    console.warn("Entorno navegador detectado (sin Electron IPC)");
    return;
  }

  try {
    const config = await window.posAPI.getConfig();
    window.MONEDA = config.simbolo_moneda || '$';
    window.POS_CONFIG = config;
    if (window.posAPI.setTerminal) await window.posAPI.setTerminal(config.terminal_id || 'CAJA_1');
    const statusInd = document.getElementById('status-indicator');

    if (statusInd) {
      statusInd.innerHTML = '<i class="fas fa-globe text-green-500"></i> MODO DEMO WEB ACTIVO';
      statusInd.className = "text-[10px] font-bold text-green-600 flex items-center gap-1";
    }

    if (config.onboarding_completado !== '1' || !['TERMICA', 'TINTA'].includes(config.tipo_impresora)) {
      abrirModalOnboarding();
    } else {
      aplicarMarcaBlanca(config);
      aplicarEstilosImpresion(config.ticket_size || '80mm');
      if (typeof window.applyNavVisibility === 'function') window.applyNavVisibility();
    }
  } catch (err) {
    console.error("Error al obtener configuración:", err);
  }
}

window.applyNavVisibility = function() {
    const hideTecnico = window.POS_CONFIG && window.POS_CONFIG.hide_tecnico_zone === '1';
    const tabTecnico = document.getElementById('tab-tecnico');
    const tabOrdenes = document.getElementById('tab-historial-tecnico');
    
    if (tabTecnico) {
        if (hideTecnico) tabTecnico.classList.add('hidden');
        else tabTecnico.classList.remove('hidden');
    }
    
    if (tabOrdenes) {
        if (hideTecnico) tabOrdenes.classList.add('hidden');
        else tabOrdenes.classList.remove('hidden');
    }
};

window.cargarConfigGlobal = async function() {
  if (!window.posAPI) return window.POS_CONFIG || {};
  const config = await window.posAPI.getConfig();
  window.POS_CONFIG = config;
  if (window.posAPI.setTerminal) await window.posAPI.setTerminal(config.terminal_id || 'CAJA_1');
  if (typeof window.applyNavVisibility === 'function') window.applyNavVisibility();
  window.dispatchEvent(new CustomEvent('pos-config-updated', { detail: config }));
  return config;
};

window.stockNegativoPermitido = function() {
  return window.POS_CONFIG?.permitir_stock_negativo === '1';
};

function actualizarCamposTipoImpresora(prefijo) {
  const tipo = document.getElementById(`${prefijo}-tipo-impresora`)?.value;
  const termica = document.getElementById(`${prefijo}-opciones-termica`);
  const tinta = document.getElementById(`${prefijo}-opciones-tinta`);
  if (termica) termica.classList.toggle('hidden', tipo !== 'TERMICA');
  if (tinta) tinta.classList.toggle('hidden', tipo !== 'TINTA');
}

window.actualizarCamposTipoImpresora = actualizarCamposTipoImpresora;

function aplicarMarcaBlanca(config) {
  const nombreElem = document.querySelector('header h1');
  if (nombreElem && config.nombre_negocio) {
    nombreElem.innerHTML = `${config.nombre_negocio} <span class="text-blue-600 font-bold">${config.tipo_negocio || ''}</span>`;
  }

  // Actualizar logo de impresión y barra lateral si existe
  const printLogo = document.querySelector('#ticket-print-area .print-logo img');
  const sidebarLogo = document.getElementById('ui-sidebar-logo');
  const qPrintLogo = document.getElementById('q-print-logo-img');
  
  if (config.logotipo) {
    if (printLogo) {
      printLogo.src = config.logotipo;
      printLogo.style.display = 'block';
    }
    if (sidebarLogo) {
      sidebarLogo.src = config.logotipo;
      sidebarLogo.classList.remove('hidden');
    }
    if (qPrintLogo) {
      qPrintLogo.src = config.logotipo;
      qPrintLogo.style.display = 'block';
    }
  }

  const sidebarMsgEl = document.getElementById('ui-sidebar-message');
  if (sidebarMsgEl && config.mensaje_sidebar) {
      sidebarMsgEl.innerText = config.mensaje_sidebar;
  }

  // Nombres de negocio
  const businessIds = ['print-business-name', 'q-print-business-name', 'tech-print-business', 'z-print-business'];
  businessIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && config.nombre_negocio) {
      el.innerText = config.nombre_negocio.toUpperCase();
    }
  });
  
  // Slogans
  const sloganIds = ['print-slogan', 'q-print-slogan'];
  sloganIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && config.slogan) {
      el.innerText = config.slogan;
    }
  });

  // WhatsApps
  const whatsappIds = ['print-whatsapp', 'q-print-whatsapp'];
  whatsappIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && config.whatsapp) {
      el.innerText = config.whatsapp;
    }
  });

  const printFooter = document.getElementById('print-footer-msg');
  if (printFooter && config.mensaje_final) {
    printFooter.innerText = config.mensaje_final;
  }
}

function aplicarEstilosImpresion(size) {
    let pageW = '80mm';
    let areaW = '100%';
    let fontSize = '12px';
    let safePadding = '2mm';

    if (size === 'termica') {
        // Térmica Automática (Hereda el tamaño del driver)
        pageW = 'auto';
        areaW = '100%';
        fontSize = '11px'; 
        safePadding = '2mm';
    } else if (size === '58mm' || size === '54mm') {
        pageW = size === '54mm' ? '54mm' : '58mm';
        areaW = size === '54mm' ? '46mm' : '48mm';
        fontSize = '10px'; 
        safePadding = '2mm';
    } else if (size === '80mm') {
        pageW = '80mm';
        areaW = '72mm';
        fontSize = '12px'; 
        safePadding = '3mm';
    } else if (size === 'media-carta') {
        pageW = '139.7mm';
        fontSize = '12px';
        safePadding = '4mm';
    } else if (size === 'media-a4') {
        pageW = '148mm';
        fontSize = '12px';
        safePadding = '4mm';
    } else if (size === 'carta') {
        pageW = '215.9mm';
        fontSize = '14px';
        safePadding = '6mm';
    } else if (size === 'a4') {
        pageW = '210mm';
        fontSize = '14px';
        safePadding = '6mm';
    }

    const css = `
        @media print {
            @page {
                margin: 0;
                size: ${pageW} auto !important;
            }
            .print-area {
                width: ${areaW} !important;
                font-size: ${fontSize} !important;
                margin: 0 auto !important; /* Centrado para área segura */
                padding: 4mm !important; /* Área de impresión segura para que no se corte el texto */
                box-sizing: border-box !important;
            }
        }
    `;

    let styleEl = document.getElementById('dynamic-print-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = css;
}

async function abrirModalOnboarding() {
  const modal = document.getElementById('modal-onboarding');
  if (!modal) return;
  
  try {
    const config = await window.posAPI.getConfig();
    
    if (document.getElementById('onboard-nombre')) document.getElementById('onboard-nombre').value = config.nombre_negocio || '';
    if (document.getElementById('onboard-tipo')) document.getElementById('onboard-tipo').value = config.tipo_negocio || '';
    if (document.getElementById('onboard-slogan')) document.getElementById('onboard-slogan').value = config.slogan || '';
    if (document.getElementById('onboard-sidebar-msg')) document.getElementById('onboard-sidebar-msg').value = config.mensaje_sidebar || '';
    if (document.getElementById('onboard-logo')) document.getElementById('onboard-logo').value = config.logotipo || '';
    if (document.getElementById('onboard-whatsapp')) document.getElementById('onboard-whatsapp').value = config.whatsapp || '';
    if (document.getElementById('onboard-footer')) document.getElementById('onboard-footer').value = config.mensaje_final || '';
    if (document.getElementById('onboard-moneda')) document.getElementById('onboard-moneda').value = config.simbolo_moneda || '$';
    
    const btnClose = document.getElementById('btn-close-onboarding');
    if (config.onboarding_completado === '1') {
        modal.classList.remove('no-close-outside');
        if (btnClose) btnClose.classList.remove('hidden');
    } else {
        modal.classList.add('no-close-outside');
        if (btnClose) btnClose.classList.add('hidden');
    }
  } catch(e) {
    console.error("Error cargando config para onboarding:", e);
  }

  modal.classList.remove('hidden');
}

async function seleccionarLogoOnboarding() {
  const ruta = await window.posAPI.seleccionarImagen();
  if (ruta) {
    // Si la ruta contiene espacios o caracteres especiales en Electron a veces hay que usar file://
    // Para simplificar y mantener compatibilidad con src de la etiqueta img, formateamos como URI
    document.getElementById('onboard-logo').value = `file:///${ruta.replace(/\\/g, '/')}`;
  }
}

async function guardarOnboarding() {
  const nombre = document.getElementById('onboard-nombre').value.trim() || 'MI NEGOCIO POS';
  const tipo = document.getElementById('onboard-tipo').value;
  const logo = document.getElementById('onboard-logo').value.trim();
  const slogan = document.getElementById('onboard-slogan').value.trim();
  const sidebarMsg = document.getElementById('onboard-sidebar-msg') ? document.getElementById('onboard-sidebar-msg').value.trim() : '';
  const whatsapp = document.getElementById('onboard-whatsapp').value.trim();
  const footer = document.getElementById('onboard-footer').value.trim();
  const moneda = document.getElementById('onboard-moneda') ? document.getElementById('onboard-moneda').value : '$';

  await window.posAPI.saveConfig('nombre_negocio', nombre);
  await window.posAPI.saveConfig('tipo_negocio', tipo);
  await window.posAPI.saveConfig('logotipo', logo);
  await window.posAPI.saveConfig('slogan', slogan);
  await window.posAPI.saveConfig('mensaje_sidebar', sidebarMsg);
  await window.posAPI.saveConfig('whatsapp', whatsapp);
  await window.posAPI.saveConfig('mensaje_final', footer);
  await window.posAPI.saveConfig('simbolo_moneda', moneda);
  const configActual = await window.posAPI.getConfig();
  if (!['TERMICA', 'TINTA'].includes(configActual.tipo_impresora)) {
    await window.posAPI.saveConfig('tipo_impresora', 'TERMICA');
  }
  await window.posAPI.saveConfig('onboarding_completado', '1');

  const modal = document.getElementById('modal-onboarding');
  if (modal) modal.classList.add('hidden');

  await cargarConfiguracionInicial();
  await cargarBotonesGrid();
}

/* -------------------------------------------------------------------------- */
/* 2. UNIFICACIÓN DE BOTONES Y EVENTOS DEL HTML ORIGINAL                     */
/* -------------------------------------------------------------------------- */

/**
 * Función global addCart que vincula los eventos onclick del HTML original
 */
function addCart(nombre, precio, cant = 1, cat = 'GENERAL', forceNew = false, codigo = 'GEN') {
  const precioUnit = parseFloat(precio) || 0;
  const cantidad = parseInt(cant) || 1;

  addCartItem({
    codigo: codigo || 'GEN',
    descripcion: nombre,
    cantidad: cantidad,
    precio_unitario: precioUnit,
    subtotal: cantidad * precioUnit,
    categoria: cat || 'GENERAL'
  });
}

/**
 * Control del temporizador de Long Press para Zona de Ráfaga
 */
function startTimer(nombre, categoria, precioBase = 1.00, codigo = 'IMP-BN', btnId = null) {
  isLongPress = false;
  currentItem = { label: nombre, categoria, precio_base: parseFloat(precioBase) || 1.00, codigo_prod: codigo };
  
  pressTimer = setTimeout(async () => {
    isLongPress = true;

    if (btnId) {
      const botones = await window.posAPI.obtenerBotonesGrid();
      const btn = botones.find(b => b.id === btnId);
      if (btn && btn.tiene_submenu) {
        abrirSubmenuOBotonModal(btnId);
        return;
      }
    }

    if (nombre.toUpperCase().includes('ESCANEO')) {
      if (typeof openManualInput === 'function') {
        openManualInput('escaneo', nombre.toUpperCase(), precioBase);
      }
      return;
    }

    const input = document.getElementById('input-qty-rapida');
    if (input) {
      input.value = '1';
      const modal = document.getElementById('modal-cantidad-rapida');
      if (modal) modal.classList.remove('hidden');
      setTimeout(() => { input.focus(); input.select(); }, 100);
    }
  }, LONG_PRESS_TIME);
}

function endTimer(nombre, categoria, precioBase = 1.00, codigo = 'IMP-BN') {
  clearTimeout(pressTimer);
  if (!isLongPress) {
    const precio = parseFloat(precioBase) || 1.00;
    addCart(nombre, precio, 1, categoria, false, codigo);
  }
}

function escaparHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function argumentoInline(value) {
  return JSON.stringify(String(value ?? ''))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/'/g, '\\u0027')
    .replace(/"/g, '&quot;');
}

/**
 * Cargar grid de botones desde la Base de Datos SQLite (Consulta al abrir el programa)
 */
async function cargarBotonesGrid() {
  if (!window.posAPI || !window.posAPI.obtenerBotonesGrid) {
    console.warn("API de botones de SQLite no disponible.");
    return;
  }

  try {
    // Consulta a SQLite: Botones activos configurados
    const botones = await window.posAPI.obtenerBotonesGrid(true);
    const containerRafaga = document.getElementById('grid-rafaga');
    const containerFrecuentes = document.getElementById('grid-servicios-frecuentes');
    if (containerRafaga) containerRafaga.innerHTML = '';
    if (containerFrecuentes) containerFrecuentes.innerHTML = '';
    if (!botones || botones.length === 0) return;

    const rafagaBtns = botones.filter(b => b.bloque === 'RAFAGA');
    let frecuentesBtns = botones.filter(b => b.bloque === 'FRECUENTES');

    // Ordenar para agrupar lógicamente: mantener el 'orden' general, 
    // pero si comparten el mismo orden (ej. personalizados), agrupar subs vs simples
    frecuentesBtns.sort((a, b) => {
      if (a.orden !== b.orden) return a.orden - b.orden;
      if (a.tiene_submenu !== b.tiene_submenu) return b.tiene_submenu ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

    const hideRafagaZone = window.POS_CONFIG && window.POS_CONFIG.hide_rafaga_zone === '1';
    const titleRafaga = document.getElementById('rafaga-title');

    if (hideRafagaZone) {
      frecuentesBtns = frecuentesBtns.filter(b => b.categoria === 'PERSONALIZADO');
    }

    if (hideRafagaZone) {
      if (containerRafaga) containerRafaga.style.display = 'none';
      if (titleRafaga) titleRafaga.style.display = 'none';
    } else {
      if (containerRafaga) containerRafaga.style.display = '';
      if (titleRafaga) titleRafaga.style.display = '';
      
      if (containerRafaga && rafagaBtns.length > 0) {
      let htmlRafaga = '';
      for (let i = 0; i < rafagaBtns.length; i += 2) {
        const b1 = rafagaBtns[i];
        const b2 = rafagaBtns[i + 1];

        htmlRafaga += `<div class="flex min-h-[7rem] rounded-2xl overflow-hidden shadow-lg border-2 border-border">`;

        // Botón 1 del Par
        const bg1 = b1.color && b1.color.toUpperCase() !== '#FFFFFF' ? `style="background-color:${b1.color};color:#ffffff;"` : 'class="bg-surface hover:bg-surface-alt"';
        const text1 = b1.color && b1.color.toUpperCase() !== '#FFFFFF' ? 'text-white' : 'text-main font-bold';
        const icon1 = b1.icono ? `<i class="${b1.icono} text-3xl mb-1"></i>` : `<i class="fas fa-bolt text-3xl mb-1 text-warning"></i>`;
        
        htmlRafaga += `
            <button onmousedown="startTimer(${argumentoInline(b1.label)}, ${argumentoInline(b1.label)}, ${b1.precio_base}, ${argumentoInline(b1.codigo_prod)}, ${argumentoInline(b1.id)})" 
              onmouseup="endTimer(${argumentoInline(b1.label)}, ${argumentoInline(b1.label)}, ${b1.precio_base}, ${argumentoInline(b1.codigo_prod)})" 
                  class="btn-fast w-1/2 flex flex-col items-center justify-center border-r border-border" ${bg1}>
              ${icon1}
              <span class="text-[10px] font-bold ${text1} leading-tight text-center px-1">${escaparHtml(b1.label)}</span>
              <span class="text-[9px] font-black text-primary">${window.MONEDA}${parseFloat(b1.precio_base).toFixed(2)}</span>
          </button>
        `;

        // Botón 2 del Par (Si existe)
        if (b2) {
          const bg2 = b2.color && b2.color.toUpperCase() !== '#FFFFFF' ? `style="background-color:${b2.color};color:#ffffff;"` : 'class="bg-surface hover:bg-surface-alt"';
          const text2 = b2.color && b2.color.toUpperCase() !== '#FFFFFF' ? 'text-white' : 'text-main font-bold';
          const icon2 = b2.icono ? `<i class="${b2.icono} text-3xl mb-1"></i>` : `<i class="fas fa-layer-group text-3xl mb-1 text-primary"></i>`;

          htmlRafaga += `
                <button onmousedown="startTimer(${argumentoInline(b2.label)}, ${argumentoInline(b2.label)}, ${b2.precio_base}, ${argumentoInline(b2.codigo_prod)}, ${argumentoInline(b2.id)})" 
                  onmouseup="endTimer(${argumentoInline(b2.label)}, ${argumentoInline(b2.label)}, ${b2.precio_base}, ${argumentoInline(b2.codigo_prod)})" 
                    class="btn-fast w-1/2 flex flex-col items-center justify-center" ${bg2}>
                ${icon2}
                <span class="text-[10px] font-bold ${text2} leading-tight text-center px-1">${escaparHtml(b2.label)}</span>
                <span class="text-[9px] font-black text-primary">${window.MONEDA}${parseFloat(b2.precio_base).toFixed(2)}</span>
            </button>
          `;
        }

        htmlRafaga += `</div>`;
      }
      containerRafaga.innerHTML = htmlRafaga;
    }
  }

    // 2. Renderizar Servicios Frecuentes Dinámicos
    if (containerFrecuentes && frecuentesBtns.length > 0) {
      containerFrecuentes.innerHTML = frecuentesBtns.map(b => {
        const esDark = b.color && b.color.toUpperCase() !== '#FFFFFF';
        const bgAttr = esDark ? `style="background-color:${b.color};color:#ffffff;"` : 'class="bg-surface hover:bg-surface-alt"';
        const textClass = esDark ? 'text-white font-black' : 'text-main font-bold';
        const iconHtml = b.icono ? `<i class="${b.icono} ${esDark ? 'text-white' : 'text-primary'} mt-1 text-lg"></i>` : '';

        // Manejo de eventos especiales y submenús
        let onclickAction = '';
        const comp = b.comportamiento || 'NORMAL';
        
        if (b.id === 'frec-ajuste') {
          onclickAction = `openManualInput('price_only', 'AJUSTE DOCUMENTO')`;
        } else if (comp === 'MANUAL_FULL') {
          onclickAction = `openManualInput('full', ${argumentoInline(b.label)})`;
        } else if (comp === 'MANUAL_PRICE' || comp === 'MANUAL_PRECIO') {
          onclickAction = `openManualInput('price_only', ${argumentoInline(b.label)})`;
        } else if (comp === 'MODAL_GESTION') {
          onclickAction = `openGestionModal(${argumentoInline(b.label)})`;
        } else if (comp === 'MODAL_DESCARGAS') {
          onclickAction = `abrirModalDescargas(${argumentoInline(b.id)}, ${argumentoInline(b.label)})`;
        } else if (comp === 'MODAL_PAPELES') {
          onclickAction = `abrirModalPapeles(${argumentoInline(b.id)}, ${argumentoInline(b.label)})`;
        } else if (b.tiene_submenu || (b.submenus && b.submenus.length > 0)) {
          onclickAction = `abrirSubmenuOBotonModal(${argumentoInline(b.id)})`;
        } else {
          // NORMAL
          const cat = b.categoria || b.label;
          onclickAction = `addCart(${argumentoInline(b.label)}, ${b.precio_base}, 1, ${argumentoInline(cat)}, false, ${argumentoInline(b.codigo_prod || '')})`;
        }

        const isLongPressBtn = comp === 'HYBRID_LONG_PRESS';
        const timerProps = isLongPressBtn 
          ? `onmousedown="startTimer(${argumentoInline(b.label)}, ${argumentoInline(b.categoria || b.label)}, ${b.precio_base}, ${argumentoInline(b.codigo_prod)}, ${argumentoInline(b.id)})" onmouseup="endTimer(${argumentoInline(b.label)}, ${argumentoInline(b.categoria || b.label)}, ${b.precio_base}, ${argumentoInline(b.codigo_prod)})"`
          : `onclick="${onclickAction}"`;

        return `
          <button ${timerProps} ${bgAttr}
                  class="btn-fast h-20 rounded-xl shadow-md border-b-4 border-primary text-xs flex flex-col items-center justify-center p-2 transition-all active:scale-95">
              <span class="${textClass}">${escaparHtml(b.label)}</span>
              ${iconHtml}
              ${b.precio_base > 0 ? `<span class="text-primary text-[10px] font-extrabold mt-0.5">${window.MONEDA}${parseFloat(b.precio_base).toFixed(2)}</span>` : ''}
          </button>
        `;
      }).join('');
    }

  } catch (err) {
    console.error("Error cargando botones del grid:", err);
  }
}

function handleContextMenu(e, btnId) {
  e.preventDefault();
  clearTimeout(pressTimer);
  abrirSubmenuOBotonModal(btnId);
}

function cancelLongPress() {
  clearTimeout(pressTimer);
}

async function ejecutarClicNormalBoton(btnId) {
  const botones = await window.posAPI.obtenerBotonesGrid();
  const btn = botones.find(b => b.id === btnId);
  if (!btn) return;

  addCartItem({
    codigo: btn.codigo_prod || 'SER-RAPIDO',
    descripcion: btn.label,
    cantidad: 1,
    precio_unitario: parseFloat(btn.precio_base),
    subtotal: parseFloat(btn.precio_base),
    categoria: btn.label || 'SERVICIOS'
  });
}

async function abrirSubmenuOBotonModal(btnId) {
  const botones = await window.posAPI.obtenerBotonesGrid();
  const btn = botones.find(b => b.id === btnId);
  if (!btn) return;

  if (btn.tiene_submenu && btn.submenus && btn.submenus.length > 0) {
    currentBotonSubmenu = btn;
    const container = document.getElementById('modal-submenu-container');
    const title = document.getElementById('modal-submenu-title');
    if (title) title.innerText = `Opciones: ${btn.label}`;
    if (container) {
      let catPadre = (btn.categoria && btn.categoria !== 'PERSONALIZADO') ? btn.categoria : btn.label;
      const subsToMap = (btn.comportamiento === 'HYBRID_LONG_PRESS') ? btn.submenus.slice(1) : btn.submenus;
      const validSubmenus = subsToMap.filter(sub => sub.label && sub.label.trim() !== '');
      let submenusHTML = validSubmenus.map(sub => `
        <button onclick="seleccionarSubmenuItem(${argumentoInline(sub.label)}, ${sub.precio}, ${argumentoInline(sub.codigo_prod || btn.codigo_prod)}, ${argumentoInline(catPadre)})"
          class="w-full bg-surface-alt hover:bg-primary-light border-2 border-border hover:border-primary p-3 rounded-xl flex justify-between items-center transition-all mb-2">
          <span class="font-bold text-main text-xs">${escaparHtml(sub.label)}</span>
          <span class="font-black text-primary text-sm">${window.MONEDA}${parseFloat(sub.precio).toFixed(2)}</span>
        </button>
      `).join('');
      
      submenusHTML += `
        <button onclick="cerrarTodosModales(); openManualInput('full', ${argumentoInline(btn.categoria || btn.label)})"
          class="w-full bg-secondary hover:bg-secondary-hover text-white p-3 rounded-xl flex justify-center items-center transition-all mt-2 shadow-lg active:scale-95">
          <span class="font-bold text-xs uppercase flex items-center gap-2"><i class="fas fa-keyboard"></i> Llenado Manual</span>
        </button>
      `;
      container.innerHTML = submenusHTML;
    }
    const qtyInput = document.getElementById('submenu-qty-input');
    if (qtyInput) {
      qtyInput.value = '1';
    }
    const modal = document.getElementById('modal-submenu-grid');
    if (modal) {
      modal.classList.remove('hidden');
      if (qtyInput) {
        setTimeout(() => { qtyInput.focus(); qtyInput.select(); }, 100);
      }
    }
  } else {
    abrirModalCantidadBoton(btn);
  }
}

function seleccionarSubmenuItem(label, precio, codigo, categoriaPadre) {
  const qtyInput = document.getElementById('submenu-qty-input');
  const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
  const p = parseFloat(precio) || 0;
  
  const desc = categoriaPadre ? `${categoriaPadre}: ${label}` : label;
  
  addCartItem({
    codigo: codigo || 'GEN',
    descripcion: desc,
    cantidad: qty,
    precio_unitario: p,
    subtotal: p * qty,
    categoria: categoriaPadre || 'GENERAL'
  });
  
  cerrarTodosModales();
}

function abrirModalCantidadBoton(btn) {
  currentItem = btn;
  const input = document.getElementById('input-qty-rapida');
  if (input) {
    input.value = '1';
    const modal = document.getElementById('modal-cantidad-rapida');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { input.focus(); input.select(); }, 100);
  }
}

async function confirmarCantidadRapida() {
  const input = document.getElementById('input-qty-rapida');
  const cant = parseInt(input.value) || 1;

  if (currentItem) {
    let cat = currentItem.categoria;
    if (!cat || cat === 'PERSONALIZADO') cat = currentItem.label || 'SERVICIOS';
    await addCartItem({
      codigo: currentItem.codigo_prod || 'SER-RAPIDO',
      descripcion: currentItem.label || currentItem.descripcion,
      cantidad: cant,
      precio_unitario: parseFloat(currentItem.precio_base || currentItem.precio_venta || 0),
      subtotal: cant * parseFloat(currentItem.precio_base || currentItem.precio_venta || 0),
      categoria: cat
    });
  }
  cerrarTodosModales();
}

/* -------------------------------------------------------------------------- */
/* 3. BUSCADOR GLOBAL Y REGLA DE STOCK NEGATIVO                              */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 3. EVENT LISTENERS GLOBALES, ESCAPE, BACKDROP Y DELEGACIÓN DE EVENTOS    */
/* -------------------------------------------------------------------------- */
function setupEventListeners() {
  const searchInput = document.getElementById('main-search');
  if (typeof window.setupGlobalSearch === 'function') window.setupGlobalSearch();

  window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-quotation', 'printing-sales', 'printing-report', 'printing-tech', 'printing-ink');
      const style = document.getElementById('print-page-style');
      if (style) style.remove();
  });

  // Cargar atajos desde configuración
  window.appShortcuts = {
      cobrar: 'F12',
      corte_z: 'F10',
      buscar: 'F3'
  };

  window.cargarAtajosGlobales = async function() {
      if (!window.posAPI) return;
      const config = await window.posAPI.getConfig();
      window.appShortcuts = {
          cobrar: config.shortcut_cobrar || 'F12',
          corte_z: config.shortcut_corte_z || 'F10',
          buscar: config.shortcut_buscar || 'F3',
          dynamic: {}
      };
      for(let i=1; i<=12; i++) {
          const fKey = `F${i}`;
          if (config[`shortcut_dynamic_${fKey}`]) {
              window.appShortcuts.dynamic[fKey] = config[`shortcut_dynamic_${fKey}`];
          }
      }
  };

  // Cargar inicialmente
  if (typeof window.cargarAtajosGlobales === 'function') window.cargarAtajosGlobales();

  window.triggerGridButton = async function(btnId) {
      if (!window.posAPI) return;
      const botones = await window.posAPI.obtenerBotonesGrid(true);
      const b = botones.find(x => x.id === btnId);
      if (!b) return;
      
      const comp = b.comportamiento || 'NORMAL';
      if (b.id === 'frec-ajuste') {
          if (typeof openManualInput === 'function') openManualInput('price_only', 'AJUSTE DOCUMENTO');
      } else if (comp === 'MANUAL_FULL') {
          if (typeof openManualInput === 'function') openManualInput('full', b.label);
      } else if (comp === 'MANUAL_PRICE' || comp === 'MANUAL_PRECIO') {
          if (typeof openManualInput === 'function') openManualInput('price_only', b.label);
      } else if (comp === 'MODAL_GESTION') {
          if (typeof openGestionModal === 'function') openGestionModal(b.label);
      } else if (comp === 'MODAL_DESCARGAS') {
          if (typeof abrirModalDescargas === 'function') abrirModalDescargas(b.id, b.label);
      } else if (comp === 'MODAL_PAPELES') {
          if (typeof abrirModalPapeles === 'function') abrirModalPapeles(b.id, b.label);
      } else if (b.tiene_submenu || (b.submenus && b.submenus.length > 0)) {
          if (typeof abrirSubmenuOBotonModal === 'function') abrirSubmenuOBotonModal(b.id);
      } else {
          let cat = b.categoria;
          if (!cat || cat === 'PERSONALIZADO') cat = b.label;
          if (typeof addCart === 'function') addCart(b.label, b.precio_base, 1, cat, false, b.codigo_prod || '');
      }
  };

  // 1. Tecla ESC global para cerrar modales y desenfocar buscador
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const blockingModalOpen = document.querySelector('.modal-overlay.no-close-outside:not(.hidden)');
      if (!blockingModalOpen) {
        cerrarTodosModales();
        if (searchInput) {
          searchInput.value = '';
          const suggestionsBox = document.getElementById('global-suggestions');
          if (suggestionsBox) suggestionsBox.classList.add('hidden');
          searchInput.blur();
        }
      }
    }
    
    if (e.key === window.appShortcuts.corte_z) {
      e.preventDefault();
      abrirCorteZModal();
      return;
    }

    if (e.key === window.appShortcuts.cobrar) {
      e.preventDefault();
      abrirModalCobro();
      return;
    }

    if (e.key === window.appShortcuts.buscar) {
      e.preventDefault();
      if (searchInput) searchInput.focus();
      return;
    }

    // Dynamic F-keys shortcuts
    if (e.key.match(/^F\d+$/) && window.appShortcuts.dynamic && window.appShortcuts.dynamic[e.key]) {
        e.preventDefault();
        window.triggerGridButton(window.appShortcuts.dynamic[e.key]);
    }

    // Navegación rápida por teclado numérico si el sistema está en "reposo"
    const activeTagName = document.activeElement ? document.activeElement.tagName : '';
    const isInputFocused = activeTagName === 'INPUT' || activeTagName === 'TEXTAREA' || activeTagName === 'SELECT';
    const isModalOpen = document.querySelector('.modal-overlay:not(.hidden)') !== null;

    if (!isInputFocused && !isModalOpen) {
      if (e.key === '1') { e.preventDefault(); switchTab('ventas'); return; }
      if (e.key === '2') { e.preventDefault(); switchTab('tecnico'); return; }
      if (e.key === '3') { e.preventDefault(); abrirHistorialTecnico(); return; }
      if (e.key === '4') { e.preventDefault(); switchTab('inv-sala'); return; }
      if (e.key === '5') { e.preventDefault(); switchTab('inv-bodega'); return; }
      if (e.key === '6') { e.preventDefault(); abrirHistorialTickets(); return; }
      if (e.key === '7') { e.preventDefault(); abrirHistorialPedidos(); return; }
      if (e.key === '8') { e.preventDefault(); switchTab('etiquetas'); return; }
    }
  });

  // 2. Clic en el backdrop (.modal-overlay) para cerrar modales al hacer clic afuera
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('modal-overlay')) {
      if (!e.target.classList.contains('no-close-outside')) {
        cerrarTodosModales();
      }
    }
  });

  // 3. (Eliminada delegación global de botones para evitar duplicidad, ahora se maneja dinámicamente en el render)
}

/* -------------------------------------------------------------------------- */
/* 4. CARRITO DE COMPRAS Y EDICIÓN INLINE                                    */
/* -------------------------------------------------------------------------- */
async function aplicarEscalaPrecioAItem(item) {
  if (window.posAPI && window.posAPI.calcularPrecioEscala && item.codigo) {
    try {
      const res = await window.posAPI.calcularPrecioEscala(item.codigo, item.cantidad, item.precio_unitario);
      if (res && res.escala_aplicada) {
        item.precio_unitario = parseFloat(res.precio_unitario);
      }
    } catch (err) {
      console.warn("Error al evaluar escala de precio:", err);
    }
  }
  item.subtotal = item.cantidad * item.precio_unitario;
}

async function addCartItem(item) {
  const existingIdx = cart.findIndex(i => i.codigo === item.codigo && i.descripcion === item.descripcion);
  let targetItem;
  if (existingIdx !== -1) {
    cart[existingIdx].cantidad += item.cantidad;
    targetItem = cart[existingIdx];
  } else {
    targetItem = { ...item };
    cart.push(targetItem);
  }
  if (!item.conservar_precio) await aplicarEscalaPrecioAItem(targetItem);
  else targetItem.subtotal = targetItem.cantidad * targetItem.precio_unitario;
  renderCartUI();
}

function renderCartUI() {
  const container = document.getElementById('cart-items');
  const totalPriceElem = document.getElementById('total-price');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-xs font-bold text-center mt-10 uppercase">Carrito Vacío</p>';
    if (totalPriceElem) totalPriceElem.innerText = 'Q 0.00';
    return;
  }

  let total = 0;
  container.innerHTML = cart.map((rawItem, idx) => {
    // Normalizar datos por si vienen del script legacy
    const item = {
      descripcion: rawItem.descripcion || rawItem.desc || rawItem.nombre || 'Desconocido',
      cantidad: parseFloat(rawItem.cantidad || rawItem.qty || 1),
      precio_unitario: parseFloat(typeof rawItem.precio_unitario !== 'undefined' ? rawItem.precio_unitario : (rawItem.price || rawItem.precio || 0)),
      categoria: rawItem.categoria || 'GENERAL'
    };
    item.subtotal = parseFloat(typeof rawItem.subtotal !== 'undefined' ? rawItem.subtotal : (item.cantidad * item.precio_unitario));
    
    // Actualizamos el objeto real en el carrito para que futuras operaciones (como aparcar) guarden el formato correcto
    cart[idx] = { ...rawItem, ...item };

    total += item.subtotal;
    return `
      <div class="bg-surface p-3 rounded-xl border border-border shadow-sm flex justify-between items-center mb-2">
        <div class="flex-1 mr-2">
          <p class="font-black text-main text-xs leading-tight">${item.descripcion}</p>
          <div class="flex gap-2 items-center mt-1">
            <span onclick="abrirEditarCantidad(${idx})" class="qty-editable text-[11px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity">
              Cant: ${item.cantidad}
            </span>
            <span onclick="abrirEditarPrecio(${idx})" class="qty-editable text-[11px] font-bold text-muted bg-surface-alt border border-border px-2 py-0.5 rounded cursor-pointer hover:bg-border transition-colors">
              @ ${window.MONEDA}${item.precio_unitario.toFixed(2)}
            </span>
          </div>
        </div>
        <div class="text-right">
          <p class="font-black text-primary text-sm">${window.MONEDA}${item.subtotal.toFixed(2)}</p>
          <button onclick="eliminarItemCarrito(${idx})" class="text-danger hover:text-danger-hover text-xs font-bold mt-1">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (totalPriceElem) totalPriceElem.innerText = `Q ${total.toFixed(2)}`;
}

function abrirEditarCantidad(idx) {
  editingIndex = idx;
  const input = document.getElementById('input-qty');
  if (input) {
    input.value = cart[idx].cantidad;
    const modal = document.getElementById('modal-cantidad');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { input.focus(); input.select(); }, 100);
  }
}

async function confirmarEdicionCantidad() {
  if (editingIndex !== null && cart[editingIndex]) {
    const input = document.getElementById('input-qty');
    const newQty = parseInt(input.value) || 1;
    cart[editingIndex].cantidad = newQty;
    await aplicarEscalaPrecioAItem(cart[editingIndex]);
    renderCartUI();
  }
  cerrarTodosModales();
}

function abrirEditarPrecio(idx) {
  editingIndex = idx;
  const input = document.getElementById('input-price');
  if (input) {
    input.value = cart[idx].precio_unitario;
    const modal = document.getElementById('modal-precio');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { input.focus(); input.select(); }, 100);
  }
}

function confirmarEdicionPrecio() {
  if (editingIndex !== null && cart[editingIndex]) {
    const input = document.getElementById('input-price');
    const newPrice = parseFloat(input.value) || 0;
    cart[editingIndex].precio_unitario = newPrice;
    cart[editingIndex].subtotal = cart[editingIndex].cantidad * newPrice;
    renderCartUI();
  }
  cerrarTodosModales();
}

function eliminarItemCarrito(idx) {
  cart.splice(idx, 1);
  renderCartUI();
}

function obtenerSubtotalSinDescuento() {
  return cart
    .filter(item => item.categoria !== 'DESCUENTO' && item.codigo !== 'DESCUENTO')
    .reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
}

function applyDiscount() {
  const subtotal = obtenerSubtotalSinDescuento();
  if (subtotal <= 0) return alert('Agrega productos al carrito antes de aplicar un descuento.');

  const existente = cart.find(item => item.categoria === 'DESCUENTO' || item.codigo === 'DESCUENTO');
  document.getElementById('input-descuento-monto').value = existente ? Math.abs(Number(existente.subtotal || 0)).toFixed(2) : '';
  document.getElementById('input-descuento-motivo').value = existente?.motivo_descuento || '';
  document.getElementById('modal-descuento').classList.remove('hidden');
  actualizarPreviewDescuento();
  setTimeout(() => document.getElementById('input-descuento-monto')?.focus(), 100);
}

function actualizarPreviewDescuento() {
  const subtotal = obtenerSubtotalSinDescuento();
  const monto = Math.max(0, Number(document.getElementById('input-descuento-monto')?.value || 0));
  document.getElementById('descuento-subtotal').innerText = `${window.MONEDA}${subtotal.toFixed(2)}`;
  document.getElementById('descuento-preview-monto').innerText = `-${window.MONEDA}${monto.toFixed(2)}`;
  document.getElementById('descuento-nuevo-total').innerText = `${window.MONEDA}${Math.max(0, subtotal - monto).toFixed(2)}`;
}

function confirmarDescuento() {
  const subtotal = obtenerSubtotalSinDescuento();
  const monto = Number(document.getElementById('input-descuento-monto')?.value || 0);
  const motivo = document.getElementById('input-descuento-motivo')?.value.trim();
  if (!Number.isFinite(monto) || monto <= 0) return alert('Ingresa un monto de descuento mayor que cero.');
  if (monto > subtotal) return alert('El descuento no puede superar el subtotal de productos.');
  if (!motivo) return alert('La justificación del descuento es obligatoria.');

  cart = cart.filter(item => item.categoria !== 'DESCUENTO' && item.codigo !== 'DESCUENTO');
  cart.push({
    codigo: 'DESCUENTO',
    descripcion: 'DESCUENTO',
    categoria: 'DESCUENTO',
    cantidad: 1,
    precio_unitario: -monto,
    subtotal: -monto,
    motivo_descuento: motivo,
    conservar_precio: true
  });
  renderCartUI();
  cerrarModalDescuento();
}

function quitarDescuento() {
  cart = cart.filter(item => item.categoria !== 'DESCUENTO' && item.codigo !== 'DESCUENTO');
  renderCartUI();
  cerrarModalDescuento();
}

function cerrarModalDescuento() {
  document.getElementById('modal-descuento')?.classList.add('hidden');
}

function vaciarCarrito() {
  cart = [];
  window.pedidoEdicionActual = null;
  const clienteElem = document.getElementById('bill-cliente');
  const nitElem = document.getElementById('bill-nit');
  if (clienteElem) clienteElem.value = '';
  if (nitElem) nitElem.value = '';
  const activeLabel = document.getElementById('active-ticket-label');
  if (activeLabel) activeLabel.innerText = '';
  renderCartUI();
}

function limpiarDatosDocumento() {
  vaciarCarrito();
  const campos = [
    ['bill-cliente', ''],
    ['bill-nit', ''],
    ['pedido-cliente-nombre', ''],
    ['pedido-cliente-telefono', ''],
    ['input-efectivo-recibido', '']
  ];
  campos.forEach(([id, valor]) => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.value = valor;
  });

  ['toggle-cotizacion', 'toggle-pedido'].forEach(id => {
    const toggle = document.getElementById(id);
    if (toggle) toggle.checked = false;
  });
  const metodoPago = document.getElementById('payment-method');
  if (metodoPago) metodoPago.value = 'EFECTIVO';
  if (typeof toggleModosVenta === 'function') toggleModosVenta('venta');

  const footerInfo = document.getElementById('ticket-footer-info');
  if (footerInfo) footerInfo.innerHTML = '';
  window.datosPedidoTemp = null;
  window.datosVentaTemp = null;
}

function cargarDocumentoEnCarrito(items, options = {}) {
  if (cart.length > 0 && !confirm('El carrito actual será reemplazado. ¿Deseas continuar?')) {
    return false;
  }
  cart = (items || []).map(item => ({
    codigo: item.codigo ?? item.Codigo_Producto ?? '',
    descripcion: item.descripcion ?? item.Descripcion ?? item.nombre ?? 'Item sin nombre',
    categoria: item.categoria ?? item.Categoria ?? 'GENERAL',
    cantidad: Number(item.cantidad ?? item.Cantidad ?? 1),
    precio_unitario: Number(item.precio_unitario ?? item.Precio_Unitario ?? item.precio ?? 0),
    subtotal: Number(item.subtotal ?? item.Subtotal ?? 0),
    motivo_descuento: item.motivo_descuento ?? item.Motivo_Descuento ?? '',
    conservar_precio: true
  }));

  const clienteElem = document.getElementById('bill-cliente');
  const nitElem = document.getElementById('bill-nit');
  if (clienteElem) clienteElem.value = options.cliente || 'CF';
  if (nitElem) nitElem.value = options.nit || 'CF';

  const cotizacionToggle = document.getElementById('toggle-cotizacion');
  const pedidoToggle = document.getElementById('toggle-pedido');
  if (cotizacionToggle) cotizacionToggle.checked = false;
  if (pedidoToggle) pedidoToggle.checked = Boolean(options.pedidoEdicion);
  window.pedidoEdicionActual = options.pedidoEdicion || null;
  if (typeof toggleModosVenta === 'function') toggleModosVenta(options.pedidoEdicion ? 'pedido' : 'venta');

  const activeLabel = document.getElementById('active-ticket-label');
  if (activeLabel) activeLabel.innerText = options.etiqueta || '';
  renderCartUI();
  return true;
}

/* -------------------------------------------------------------------------- */
/* 5. REGISTRO DE VENTA E IMPRESIÓN DE TICKET                                 */
/* -------------------------------------------------------------------------- */
async function procesarCobroVenta() {
  if (cart.length === 0) {
    alert("El carrito está vacío.");
    return;
  }

  if (window.__cobroEnProgreso) return; // Evita doble registro si se presiona Enter/Cobrar dos veces seguidas
  window.__cobroEnProgreso = true;

  const clienteElem = document.getElementById('bill-cliente');
  const nitElem = document.getElementById('bill-nit');
  const paymentElem = document.getElementById('payment-method');
  const toggleCotizacion = document.getElementById('toggle-cotizacion');

  const cliente = (clienteElem && clienteElem.value.trim()) || 'CF';
  const nit = (nitElem && nitElem.value.trim()) || 'CF';
  const metodo_pago = (paymentElem && paymentElem.value) || 'EFECTIVO';
  const isCotizacion = (toggleCotizacion && toggleCotizacion.checked) ? true : false;
  const isPedido = (document.getElementById('toggle-pedido') && document.getElementById('toggle-pedido').checked) ? true : false;
  
  const tipo_documento = isCotizacion ? 'COTIZACION' : (isPedido ? 'PEDIDO' : 'VENTA');
  const total = cart.reduce((acc, i) => acc + i.subtotal, 0);
  const itemDescuento = cart.find(item => item.categoria === 'DESCUENTO' || item.codigo === 'DESCUENTO');
  const descuento = itemDescuento ? Math.abs(Number(itemDescuento.subtotal || 0)) : 0;
  const motivo_descuento = itemDescuento?.motivo_descuento || '';

  if (descuento > obtenerSubtotalSinDescuento()) {
    alert('El descuento supera el subtotal actual. Corrígelo antes de cobrar.');
    applyDiscount();
    window.__cobroEnProgreso = false;
    return;
  }

  if (!isCotizacion && !isPedido && metodo_pago === 'CREDITO' && cliente.toUpperCase() === 'CF') {
    alert('Identifica al cliente antes de registrar una cuenta por cobrar.');
    window.__cobroEnProgreso = false;
    return;
  }

  try {
    if (isPedido) {
      const datosPed = window.datosPedidoTemp || {};
      const anticipo = parseFloat(datosPed.anticipo) || 0;
      const saldo = total - anticipo;
      
      const pedidoPayload = {
        cliente: datosPed.nombre || cliente,
        telefono: datosPed.telefono || 'SN',
        total: total,
        anticipo: anticipo,
        saldo: saldo,
        descuento,
        motivo_descuento,
        metodo_pago: metodo_pago,
        detalles: cart
      };

      const pedidoEdicion = window.pedidoEdicionActual;
      const res = pedidoEdicion
        ? await window.posAPI.actualizarPedido({
            ...pedidoPayload,
            id_pedido: pedidoEdicion.id_pedido,
            cliente: datosPed.nombre || pedidoEdicion.cliente,
            telefono: datosPed.telefono || pedidoEdicion.telefono
          })
        : await window.posAPI.crearPedido(pedidoPayload);
      if (res.success) {
        if (pedidoEdicion) {
          alert(`Pedido #${pedidoEdicion.id_pedido} actualizado. Nuevo saldo: ${window.MONEDA}${Number(res.saldo).toFixed(2)}.`);
        } else {
          // Imprimir ticket de pedido ESC/POS
          const shouldPrint = (localStorage.getItem('imprimir_ticket') !== 'false');
          if (shouldPrint) {
              window.imprimirTicketDocumento({ 
                  ticketId: res.id_pedido, 
                  ticketType: 'PEDIDO' 
              }).catch(err => console.error("Error imprimiendo pedido:", err));
          }
        }
      } else {
        alert("Error al guardar pedido:\n" + JSON.stringify(res, null, 2));
        return;
      }
    } else {
      const ventaPayload = {
        tipo_documento,
        cliente,
        nit,
        total,
        descuento,
        motivo_descuento,
        metodo_pago,
        detalles: cart
      };

      const res = await window.posAPI.registrarVenta(ventaPayload);
      if (!res.success) {
        alert("Error al registrar la venta:\n" + (res.error || JSON.stringify(res, null, 2)));
        return;
      }

      // La venta ya quedó guardada en la BD; la impresión corre en segundo plano y nunca bloquea la limpieza del carrito.
      if (tipo_documento === 'COTIZACION') {
        window.imprimirTicketDocumento({ ticketId: res.id_venta });
      } else {
        const checkbox = document.getElementById('cobro-imprimir-ticket');
        const shouldPrint = checkbox ? checkbox.checked : (localStorage.getItem('imprimir_ticket') !== 'false');
        if (shouldPrint) {
          const extraData = window.datosVentaTemp || {};
          window.imprimirTicketDocumento({
            ticketId: res.id_venta,
            recibido: extraData.recibido,
            cambio: extraData.cambio
          });
        }
        if (typeof window.cargarTop20 === 'function') window.cargarTop20();
      }
    } // end else (no es pedido)

    limpiarDatosDocumento();

  } catch (err) {
    console.error("Error procesando cobro:", err);
    alert("Ocurrió un error al procesar el documento.");
  } finally {
    window.__cobroEnProgreso = false;
  }
}

// Exposición explícita en window para handlers onclick de HTML
window.addCart = addCart;
window.addCartItem = addCartItem;
window.renderCartUI = renderCartUI;
window.renderCart = renderCartUI;
window.startTimer = startTimer;
window.endTimer = endTimer;

window.procesarCobroVenta = procesarCobroVenta;
window.processVenta = procesarCobroVenta;
window.vaciarCarrito = vaciarCarrito;
window.clearCart = vaciarCarrito;
window.applyDiscount = applyDiscount;
window.actualizarPreviewDescuento = actualizarPreviewDescuento;
window.confirmarDescuento = confirmarDescuento;
window.quitarDescuento = quitarDescuento;
window.cerrarModalDescuento = cerrarModalDescuento;
window.cargarDocumentoEnCarrito = cargarDocumentoEnCarrito;
window.confirmarEdicionCantidad = confirmarEdicionCantidad;
window.confirmQty = confirmarEdicionCantidad;
window.confirmarEdicionPrecio = confirmarEdicionPrecio;
window.confirmPrice = confirmarEdicionPrecio;
window.confirmarCantidadRapida = confirmarCantidadRapida;
window.abrirCorteZModal = abrirCorteZModal;
window.generateZReport = abrirCorteZModal;
window.cerrarTodosModales = cerrarTodosModales;
window.closeAllModals = cerrarTodosModales;
window.abrirModalOnboarding = abrirModalOnboarding;
window.guardarOnboarding = guardarOnboarding;
window.solicitarAnularYClonarTicket = solicitarAnularYClonarTicket;
window.abrirHistorialTickets = abrirHistorialTickets;
window.reimprimirTicket = reimprimirTicket;

/* -------------------------------------------------------------------------- */
/* 7. CORTE Z & REPORTES DE CAJA                                              */
/* -------------------------------------------------------------------------- */
let corteZEnProceso = false;

async function abrirCorteZModal() {
  if (corteZEnProceso) return;
  corteZEnProceso = true;
  const modalCorteZ = document.getElementById('modal-corte-z');
  const indicadorCarga = document.getElementById('corte-z-loading');
  if (modalCorteZ) {
    modalCorteZ.classList.remove('hidden');
    modalCorteZ.classList.add('no-close-outside');
  }
  if (indicadorCarga) indicadorCarga.classList.remove('hidden');

  try {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const data = await window.posAPI.generarCorteZ();
    const formatearFechaHora = window.formatearFechaHora;
    
    
    // PREPARAR DATOS PARA EL TICKET IMPRESO (Z)
    document.getElementById('z-print-date').innerText = window.formatearFechaHora(new Date());
    document.getElementById('z-print-range').innerText = `Turno: ${formatearFechaHora(data.desde)} a ${formatearFechaHora(data.hasta)}`;
    document.getElementById('z-count').innerText = data.total_ventas;
    
    // El reporte de impresión también debe mostrar el total SQL de la sesión.
    document.getElementById('z-total').innerText = Number(data.gran_total || 0).toFixed(2);
    document.getElementById('z-cash-total').innerText = Number(data.efectivo_esperado || 0).toFixed(2);
    document.getElementById('z-noncash-total').innerText = Number(data.total_no_efectivo || 0).toFixed(2);
    
    const zGastosTotal = document.getElementById('z-gastos-total');
    if (zGastosTotal) zGastosTotal.innerText = Number(data.total_gastos || 0).toFixed(2);

    document.getElementById('z-third-party-total').innerText = Number(data.total_terceros || 0).toFixed(2);
    const currentUser = localStorage.getItem('currentUser') || "DESCONOCIDO";
    document.getElementById('z-print-user').innerText = 'Usuario: ' + currentUser;
    document.getElementById('z-print-business').innerText = window.POS_CONFIG?.businessName || "INCO";
    
    const printContainer = document.getElementById('z-details-container');
    const categoriasImpresas = data.por_categoria.length > 0
      ? data.por_categoria.map(c => `<div class="report-row"><span>${c.Categoria || c.categoria}</span><span>Q ${parseFloat(c.total || 0).toFixed(2)}</span></div>`).join('')
      : `<div class="report-row"><span style="font-size:10px; color:#666;">Sin ventas registradas</span></div>`;
    const cobrosImpresos = Number(data.total_cobros_cuentas || 0) > 0
      ? `<div class="report-row"><span>COBROS CUENTAS POR COBRAR</span><span>Q ${Number(data.total_cobros_cuentas).toFixed(2)}</span></div>`
      : '';
    printContainer.innerHTML = categoriasImpresas + cobrosImpresos;

    const printGastosContainer = document.getElementById('z-gastos-container');
    const printGastosTitle = document.getElementById('z-gastos-title');
    if (printGastosContainer && printGastosTitle) {
      if (data.lista_gastos && data.lista_gastos.length > 0) {
        printGastosTitle.style.display = 'block';
        printGastosContainer.innerHTML = data.lista_gastos.map(g => `<div class="report-row"><span style="font-size:9px;">${g.Descripcion}</span><span>Q ${parseFloat(g.Monto || 0).toFixed(2)}</span></div>`).join('');
      } else {
        printGastosTitle.style.display = 'none';
        printGastosContainer.innerHTML = '';
      }
    }

    const container = document.getElementById('corte-z-content');
    if (!container) return;
    currentZSessionId = data.id_sesion;
    currentZTotal = Number(data.gran_total || 0);
    const esAdministrador = window.currentUserIsAdmin !== false;

    if (!esAdministrador) {
      document.getElementById('z-count').innerText = '***';
      document.getElementById('z-total').innerText = '***';
      document.getElementById('z-cash-total').innerText = '***';
      document.getElementById('z-noncash-total').innerText = '***';
      printContainer.innerHTML = `<div class="report-row"><span>PAGOS DE TERCEROS</span><span>Q ${Number(data.total_terceros || 0).toFixed(2)}</span></div>`;
      container.innerHTML = `
        <div class="space-y-3 text-xs">
          <div class="flex justify-between border-b border-border pb-2"><span class="font-bold text-muted uppercase">Turno desde:</span><span class="font-black text-main">${formatearFechaHora(data.desde)}</span></div>
          <div class="flex justify-between border-b border-border pb-2"><span class="font-bold text-muted uppercase">Turno hasta:</span><span class="font-black text-main">${formatearFechaHora(data.hasta)}</span></div>
          <div class="flex justify-between bg-surface p-3 rounded-xl border border-warning"><span class="font-black text-warning uppercase text-sm">Pagos de terceros:</span><span class="font-black text-warning text-lg">Q ${Number(data.total_terceros || 0).toFixed(2)}</span></div>
          <p class="text-[10px] font-bold text-muted uppercase text-center">Corte a ciegas para colaborador</p>
        </div>`;
      const modalCiego = document.getElementById('modal-corte-z');
      if (modalCiego) modalCiego.classList.remove('hidden');
      return;
    }


    let html = `
      <div class="space-y-3 text-xs">
        <div class="flex justify-between border-b border-border pb-2">
          <span class="font-bold text-muted uppercase">Turno desde:</span>
          <span class="font-black text-main">${formatearFechaHora(data.desde)}</span>
        </div>
        <div class="flex justify-between border-b border-border pb-2">
          <span class="font-bold text-muted uppercase">Turno hasta:</span>
          <span class="font-black text-main">${formatearFechaHora(data.hasta)}</span>
        </div>
        <div class="flex justify-between border-b border-border pb-2">
          <span class="font-bold text-muted uppercase">Fecha:</span>
          <span class="font-black text-main">${data.fecha}</span>
        </div>
        <div class="flex justify-between border-b border-border pb-2">
          <span class="font-bold text-muted uppercase">Ventas Totales:</span>
          <span class="font-black text-main">${data.total_ventas} transacciones</span>
        </div>
        <div class="flex justify-between bg-primary-light p-2 rounded-xl border border-primary">
          <span class="font-black text-primary uppercase text-xs">Gran Total del Día:</span>
          <span class="font-black text-primary text-base">Q ${data.gran_total.toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-surface p-2 rounded-xl border border-danger">
          <span class="font-black text-danger uppercase text-xs">Gastos Registrados (Resta):</span>
          <span class="font-black text-danger text-base">Q ${Number(data.total_gastos || 0).toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-surface p-2 rounded-xl border border-border">
          <span class="font-black text-main uppercase text-xs">Cobros de cuentas:</span>
          <span class="font-black text-main text-base">Q ${Number(data.total_cobros_cuentas || 0).toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-surface p-2 rounded-xl border border-success">
          <span class="font-black text-success uppercase text-xs">Efectivo esperado en caja:</span>
          <span class="font-black text-success text-base">Q ${Number(data.efectivo_esperado || 0).toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-surface-alt p-2 rounded-xl border border-border">
          <span class="font-black text-main uppercase text-xs">Pagos no efectivos:</span>
          <span class="font-black text-main text-base">Q ${Number(data.total_no_efectivo || 0).toFixed(2)}</span>
        </div>

        <h4 class="font-black text-main uppercase mt-4 text-[11px]">Por Método de Pago</h4>
        <div class="bg-surface-alt p-3 rounded-xl border border-border space-y-1">
          ${data.por_metodo.map(m => `
            <div class="flex justify-between">
              <span class="font-bold text-muted">${m.metodo_pago}:</span>
              <span class="font-black text-main">Q ${parseFloat(m.total).toFixed(2)} (${m.cantidad})</span>
            </div>
          `).join('')}
        </div>

        ${data.cobros_cuentas && data.cobros_cuentas.length ? `
          <h4 class="font-black text-main uppercase mt-4 text-[11px]">Cobros de cuentas por método</h4>
          <div class="bg-surface-alt p-3 rounded-xl border border-border space-y-1">
            ${data.cobros_cuentas.map(cobro => `
              <div class="flex justify-between">
                <span class="font-bold text-muted">${cobro.metodo_pago}:</span>
                <span class="font-black text-main">Q ${Number(cobro.total).toFixed(2)} (${cobro.cantidad})</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <h4 class="font-black text-main uppercase mt-4 text-[11px]">Por Categorías</h4>
        <div class="bg-surface-alt p-3 rounded-xl border border-border space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          ${data.por_categoria.map(c => `
            <div class="flex justify-between">
              <span class="font-bold text-muted">${c.Categoria || c.categoria}:</span>
              <span class="font-black text-main">Q ${parseFloat(c.total).toFixed(2)} (${c.cantidad} uds)</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    container.innerHTML = html;
    const modalContent = container.parentElement;
    const footer = modalContent.querySelector('.flex.justify-end');
    if (footer) {
        footer.innerHTML = `
            <button onclick="cerrarTodosModales()" class="bg-surface border-2 border-border text-main hover:bg-surface-alt px-6 py-2.5 rounded-xl font-bold text-sm uppercase transition-colors">Cerrar Preview</button>
            <button onclick="imprimirZ()" class="bg-surface hover:bg-surface-alt border border-border text-main px-6 py-2.5 rounded-xl font-bold text-sm uppercase shadow-md transition-all"><i class="fas fa-print text-primary mr-1"></i> Imprimir</button>
            <button onclick="cerrarTurnoZ()" class="bg-danger hover:bg-danger-hover text-white px-6 py-2.5 rounded-xl font-bold text-sm uppercase shadow-md transition-all ml-2">Cerrar Turno</button>
        `;
    }
    
    const modalZ = document.getElementById('modal-corte-z');
    if (modalZ) modalZ.classList.remove('hidden');


    const modal = document.getElementById('modal-corte-z');
    if (modal) modal.classList.remove('hidden');
  } catch (err) {
    alert("Error al generar Corte Z: " + err.message);
  } finally {
    if (indicadorCarga) indicadorCarga.classList.add('hidden');
    if (modalCorteZ) modalCorteZ.classList.remove('no-close-outside');
    corteZEnProceso = false;
  }
}

/* -------------------------------------------------------------------------- */
/* 8. ANULACIÓN Y CLONACIÓN DE TICKETS                                        */
/* -------------------------------------------------------------------------- */
async function solicitarAnularYClonarTicket() {
  const idVenta = await window.customPrompt("Anular Ticket", "Ingresa el ID del Ticket que deseas anular y corregir:");
  if (!idVenta) return;
  requestAdminPassword(async () => {
    try {
      const res = await window.posAPI.anularYClonarTicket(parseInt(idVenta));
      if (!res.success) {
        alert(res.message || 'No se pudo anular el ticket.');
        return;
      }
      for (const item of res.itemsClonados) await addCartItem(item);
      if (typeof window.cargarTop20 === 'function') await window.cargarTop20();
      alert(res.mensaje);
    } catch (err) {
      alert("Error al anular ticket: " + err.message);
    }
  });
}

let fechasHistorial = [];
let currentFechaIndex = 0;

async function abrirHistorialTickets() {
  const container = document.getElementById('historial-tickets-list');
  if (!container) return;
  switchTab('historial-tickets');
  container.innerHTML = '<p class="text-center text-slate-400 font-bold text-sm p-8">Cargando fechas...</p>';
  
  fechasHistorial = await window.posAPI.obtenerFechasHistorialTickets();
  if (!fechasHistorial || !fechasHistorial.length) {
    container.innerHTML = '<p class="text-center text-slate-400 font-bold text-sm p-8">No hay tickets registrados.</p>';
    return;
  }
  
  currentFechaIndex = 0;
  await renderizarTicketsPorFecha(fechasHistorial[currentFechaIndex]);
}

async function navegarHistorial(direccion) {
  const newIndex = currentFechaIndex + direccion;
  if (newIndex >= 0 && newIndex < fechasHistorial.length) {
    currentFechaIndex = newIndex;
    await renderizarTicketsPorFecha(fechasHistorial[currentFechaIndex]);
  }
}

async function renderizarTicketsPorFecha(fecha) {
  const container = document.getElementById('historial-tickets-list');
  container.innerHTML = '<p class="text-center text-muted font-bold text-sm p-8">Cargando tickets del día...</p>';
  
  const tickets = await window.posAPI.obtenerHistorialTickets(fecha);
  const totalDia = tickets.reduce((acc, b) => acc + (b.estado === 'COMPLETADO' ? Number(b.total || 0) : 0), 0);
  
  const canGoBack = currentFechaIndex < (fechasHistorial.length - 1);
  const canGoForward = currentFechaIndex > 0;
  
  let html = `
    <div class="flex flex-wrap items-center justify-between bg-surface p-4 rounded-xl mb-4 border border-border gap-4">
      <button onclick="navegarHistorial(1)" class="px-4 py-2 bg-surface-alt border border-border rounded-lg text-main hover:bg-border font-bold transition-colors disabled:opacity-50" ${!canGoBack ? 'disabled' : ''}>
        <i class="fas fa-chevron-left mr-2"></i> Anterior
      </button>
      
      <div class="text-center flex-1 min-w-[200px]">
        <h3 class="font-black text-main text-xl"><i class="fas fa-calendar-alt text-primary mr-2"></i>${fecha}</h3>
        <p class="text-sm font-bold text-muted">${tickets.length} tickets &bull; Total Día: ${window.MONEDA}${totalDia.toFixed(2)}</p>
      </div>
      
      <button onclick="navegarHistorial(-1)" class="px-4 py-2 bg-surface-alt border border-border rounded-lg text-main hover:bg-border font-bold transition-colors disabled:opacity-50" ${!canGoForward ? 'disabled' : ''}>
        Siguiente <i class="fas fa-chevron-right ml-2"></i>
      </button>
    </div>
  `;
  
  if (tickets.length === 0) {
     html += '<p class="text-center text-muted font-bold text-sm p-8">No hay tickets para esta fecha.</p>';
  } else {
    html += '<div class="space-y-3">';
    html += tickets.map(ticket => {
      const anulable = ticket.estado === 'COMPLETADO';
      const clienteStr = ticket.cliente ? ticket.cliente.toUpperCase() : 'CF';
      
      return `<div class="border border-border rounded-xl p-3 bg-surface flex flex-wrap items-center gap-3 justify-between hover:shadow-sm transition-shadow">
        <div class="flex items-center gap-3 flex-1 min-w-[200px]">
          <span class="font-black text-primary text-base">#${ticket.id}</span>
          <span class="text-[10px] font-black uppercase px-2 py-1 rounded ${anulable ? 'bg-surface border border-success text-success' : 'bg-surface border border-danger text-danger'}">${ticket.estado}</span>
          <span class="text-xs font-bold text-muted truncate max-w-[150px]" title="${clienteStr}"><i class="fas fa-user text-muted mr-1"></i>${clienteStr}</span>
        </div>
        
        <div class="flex items-center justify-center shrink-0">
          <span class="text-xs font-black bg-surface-alt text-main px-3 py-1.5 rounded-lg border border-border tracking-wide shadow-sm"><i class="fas fa-clock mr-1 text-primary"></i>${ticket.hora}</span>
        </div>
        
        <div class="flex items-center gap-3 justify-end flex-1 min-w-[250px]">
          <span class="text-[10px] font-bold text-muted uppercase">${ticket.metodo_pago || 'EFECTIVO'}</span>
          <span class="font-black text-main text-base">${window.MONEDA}${Number(ticket.total || 0).toFixed(2)}</span>
          ${Number(ticket.descuento || 0) > 0 ? `<span class="text-[10px] font-bold text-danger">Desc. ${window.MONEDA}${Number(ticket.descuento).toFixed(2)}</span>` : ''}
          <button onclick="reimprimirTicket(${ticket.id})" class="text-success hover:text-success-hover text-[10px] font-black uppercase transition-colors"><i class="fas fa-print mr-1"></i>Reimprimir</button>
          <button onclick="verDetalleTicket(${ticket.id})" class="text-primary hover:text-primary-hover text-[10px] font-black uppercase transition-colors"><i class="fas fa-eye mr-1"></i>Ver</button>
          ${anulable ? `<button onclick="anularTicketDesdeHistorial(${ticket.id})" class="bg-surface hover:bg-danger text-danger hover:text-white px-2 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors border border-danger"><i class="fas fa-undo mr-1"></i>Anular</button>` : ''}
        </div>
        <div id="detalle-ticket-${ticket.id}" class="hidden mt-3 w-full pt-3 border-t border-border text-xs text-main"></div>
      </div>`;
    }).join('');
    html += '</div>';
  }
  
  container.innerHTML = html;
}

async function verDetalleTicket(idTicket) {
  const detail = document.getElementById(`detalle-ticket-${idTicket}`);
  if (!detail) return;
  if (!detail.classList.contains('hidden')) {
    detail.classList.add('hidden');
    return;
  }
  const items = await window.posAPI.obtenerDetalleTicket(idTicket);
  detail.innerHTML = items.map(item => `<div class="flex justify-between py-1"><span>${item.cantidad}x ${item.descripcion}</span><span class="font-bold">${window.MONEDA}${Number(item.subtotal || 0).toFixed(2)}</span></div>`).join('') || '<span class="text-slate-400">Sin detalle.</span>';
  detail.classList.remove('hidden');
}

async function reimprimirTicket(idTicket) {
  await window.imprimirTicketDocumento({ ticketId: idTicket, reimpresion: true });
}

async function anularTicketDesdeHistorial(idTicket) {
  requestAdminPassword(async () => {
    const confirmacion = await window.customConfirm(`¿Anular el ticket #${idTicket}? Sus líneas regresarán al carrito y los productos de Sala volverán al stock.`);
    if (!confirmacion) return;
    const resultado = await window.posAPI.anularYClonarTicket(idTicket);
    if (!resultado.success) {
      alert(resultado.message || 'No se pudo anular el ticket.');
      return;
    }
    for (const item of resultado.itemsClonados) await addCartItem(item);
    if (typeof window.cargarTop20 === 'function') await window.cargarTop20();
    alert(resultado.mensaje);
    await abrirHistorialTickets();
  });
}

/* -------------------------------------------------------------------------- */
/* 9. UTILIDADES Y GESTIÓN DE MODALES                                        */
/* -------------------------------------------------------------------------- */

window.checkEnter = function(e, type) {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (type === 'qty' && typeof window.confirmQty === 'function') window.confirmQty();
        if (type === 'price' && typeof window.confirmPrice === 'function') window.confirmPrice();
        if (type === 'manual' && typeof window.confirmManualInput === 'function') window.confirmManualInput();
    }
};

window.customPrompt = function(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-prompt-modal');
        const titleEl = document.getElementById('custom-prompt-title');
        const msgEl = document.getElementById('custom-prompt-message');
        const input = document.getElementById('custom-prompt-input');
        const btnCancel = document.getElementById('custom-prompt-cancel');
        const btnOk = document.getElementById('custom-prompt-ok');

        titleEl.innerText = title;
        msgEl.innerText = message;
        input.value = '';
        modal.classList.remove('hidden');
        input.focus();

        const cleanup = () => {
            modal.classList.add('hidden');
            btnCancel.removeEventListener('click', onCancel);
            btnOk.removeEventListener('click', onOk);
            input.removeEventListener('keydown', onKey);
        };

        const onCancel = () => { cleanup(); resolve(null); };
        const onOk = () => { cleanup(); resolve(input.value); };
        const onKey = (e) => {
            if (e.key === 'Enter') onOk();
            if (e.key === 'Escape') onCancel();
        };

        btnCancel.addEventListener('click', onCancel);
        btnOk.addEventListener('click', onOk);
        input.addEventListener('keydown', onKey);
    });
};

function cerrarTodosModales() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  const modalFondo = document.getElementById('modal-fondo-pos');
  if (modalFondo) modalFondo.style.display = 'none';
  editingIndex = null;
  currentItem = null;
}

window.abrirModalDescargas = async function(btnId, catName) {
    const container = document.getElementById('descargas-container');
    document.getElementById('modal-descargas').dataset.category = catName || 'DESCARGAS';

    const botones = await window.posAPI.obtenerBotonesGrid();
    const btn = botones.find(b => b.id === btnId);
    if (!btn || !btn.tiene_submenu || !btn.submenus) return;

    container.innerHTML = btn.submenus.map((item, index) => {
        return `
            <button onclick="agregarDescargaItem(${argumentoInline(item.label)}, ${item.precio}, ${argumentoInline(item.codigo_prod || btn.codigo_prod || 'DESCARGA')})" class="w-full bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 py-2 px-3 rounded-xl flex items-center justify-between transition-all group text-left cursor-pointer">
              <span class="font-bold text-slate-700 text-xs uppercase group-hover:text-purple-700 transition-colors">${escaparHtml(item.label)}</span>
                <div class="flex flex-col items-end">
                    <span class="text-[9px] font-bold text-slate-400 group-hover:text-purple-400 transition-colors">PRECIO Q</span>
                    <span class="font-black text-blue-600 text-sm group-hover:text-purple-700 transition-colors">${parseFloat(item.precio || 0).toFixed(2)}</span>
                </div>
            </button>
        `;
    }).join('');

    document.getElementById('modal-descargas').classList.remove('hidden');
};

window.agregarDescargaItem = function(label, precio, codigo) {
    const qtyInput = document.getElementById('descargas-qty-global');
    const cantidad = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;

    addCartItem({
        codigo: codigo,
        descripcion: `Descarga: ${label}`,
        cantidad: cantidad,
        precio_unitario: precio,
        subtotal: cantidad * precio,
        categoria: document.getElementById('modal-descargas').dataset.category || 'DESCARGAS'
    });

    if(qtyInput) qtyInput.value = 1;
    cerrarTodosModales();
};

window.abrirModalPapeles = async function(btnId, catName) {
    const container = document.getElementById('papeles-container');
    document.getElementById('modal-papeles').dataset.category = catName || 'PAPEL ESPECIAL';
    document.getElementById('papeles-qty-global').value = 1;

    const botones = await window.posAPI.obtenerBotonesGrid();
    const btn = botones.find(b => b.id === btnId);
    if (!btn || !btn.tiene_submenu || !btn.submenus) return;

    container.innerHTML = btn.submenus.map(item => {
        return `
            <button onclick="agregarPapelItem(${argumentoInline(item.label)}, ${item.precio}, ${argumentoInline(item.codigo_prod || btn.codigo_prod || 'PAPEL-GEN')})" class="w-full bg-white text-slate-700 font-bold py-2 rounded-xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 flex justify-between items-center px-4 transition-all group text-left cursor-pointer">
                <span class="flex-1 text-xs uppercase group-hover:text-purple-700 transition-colors py-1">
                    ${escaparHtml(item.label)}
                </span>
                <div class="flex items-center gap-1">
                    <span class="text-xs font-black text-slate-400 group-hover:text-purple-500">${window.MONEDA || '$'}</span>
                    <span class="w-16 text-sm font-black text-right text-slate-700 group-hover:text-purple-700">${parseFloat(item.precio || 0).toFixed(2)}</span>
                </div>
            </button>
        `;
    }).join('');

    document.getElementById('modal-papeles').classList.remove('hidden');
};

window.agregarPapelItem = function(label, precio, codigo) {
    const qtyInput = document.getElementById('papeles-qty-global');
    const cantidad = parseInt(qtyInput.value) || 1;

    addCartItem({
        codigo: codigo,
        descripcion: `Papel Especial: ${label}`,
        cantidad: cantidad,
        precio_unitario: precio,
        subtotal: cantidad * precio,
        categoria: document.getElementById('modal-papeles').dataset.category || 'PAPEL ESPECIAL'
    });

    cerrarTodosModales();
};


/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 10. MÓDULOS DE INVENTARIO (TABULATOR) - INDEPENDIENTES                     */
/* -------------------------------------------------------------------------- */

let tableSala = null;
let tableBodega = null;
let tableKardex = null;

window.abrirModalKardex = async function() {
    document.getElementById('modal-kardex').classList.remove('hidden');
    
    if (!tableKardex) {
        tableKardex = new Tabulator("#kardex-table", {
            layout: "fitColumns",
            responsiveLayout: "collapse",
            pagination: "local",
            paginationSize: 20,
            placeholder: "No hay movimientos registrados",
            columns: [
                { title: "ID", field: "ID_Movimiento", width: 70, headerSort: false },
                { title: "Fecha", field: "Fecha", width: 150, formatter: (cell) => {
                    return window.formatearFechaHora(cell.getValue());
                }},
                { title: "Cód. Producto", field: "Codigo_Producto", width: 130 },
                { title: "Tipo", field: "Tipo_Movimiento", width: 100, formatter: (cell) => {
                    const val = cell.getValue();
                    if (val === 'ENTRADA') return `<span class="text-green-600 font-bold"><i class="fas fa-arrow-down mr-1"></i>ENTRADA</span>`;
                    if (val === 'SALIDA') return `<span class="text-red-600 font-bold"><i class="fas fa-arrow-up mr-1"></i>SALIDA</span>`;
                    return `<span class="text-blue-600 font-bold">${val}</span>`;
                }},
                { title: "Cant.", field: "Cantidad", width: 80, hozAlign: "center", font: "bold" },
                { title: "Contexto", field: "Contexto", width: 100 },
                { title: "Encargado", field: "Encargado", width: 120 },
                { title: "Observación", field: "Observacion" }
            ],
        });
    }

    const res = await window.posAPI.obtenerKardex();
    if (res.success) {
        tableKardex.setData(res.data);
    } else {
        window.customAlert('Error al cargar kardex: ' + res.error);
    }
}

window.cerrarModalKardex = function() {
    document.getElementById('modal-kardex').classList.add('hidden');
}

window.switchTab = function(t) {
    const tabs = ['ventas', 'tecnico', 'inv-sala', 'inv-bodega', 'etiquetas', 'historial-tecnico', 'historial-tickets', 'historial-pedidos'];
  cerrarTodosModales();
  if (typeof window.cerrarModalFondoPOS === 'function') window.cerrarModalFondoPOS();
  window.currentTab = t;
    
    // Ocultar todas las secciones principales
    const v = document.getElementById('content-ventas'); if(v) v.classList.add('hidden');
    const tec = document.getElementById('content-tecnico'); if(tec) tec.classList.add('hidden');
    const invSala = document.getElementById('content-inv-sala'); if(invSala) invSala.classList.add('hidden');
    const invBodega = document.getElementById('content-inv-bodega'); if(invBodega) invBodega.classList.add('hidden');
    const etiquetas = document.getElementById('content-etiquetas'); if(etiquetas) etiquetas.classList.add('hidden');
    const histTec = document.getElementById('content-historial-tecnico'); if(histTec) histTec.classList.add('hidden');
    const histTick = document.getElementById('content-historial-tickets'); if(histTick) histTick.classList.add('hidden');
    const histPed = document.getElementById('content-historial-pedidos'); if(histPed) histPed.classList.add('hidden');

    // Desactivar todos los botones
    tabs.forEach(tab => {
        const btn = document.getElementById('tab-' + tab);
        if (btn) btn.className = 'px-6 py-3 font-black text-xs tracking-widest text-muted hover:bg-surface-alt uppercase transition-colors border-r border-border';
    });

    // Activar botón seleccionado
    const activeBtn = document.getElementById('tab-' + t);
    if (activeBtn) activeBtn.className = 'px-6 py-3 font-black text-xs tracking-widest tab-active uppercase transition-colors border-r border-border';

    // Mostrar contenido según la pestaña
    if (t === 'ventas') {
        if(v) v.classList.remove('hidden');
    } else if (t === 'tecnico') {
        if(tec) tec.classList.remove('hidden');
    } else if (t === 'inv-sala') {
        if(invSala) invSala.classList.remove('hidden');
        initTableSala();
    } else if (t === 'inv-bodega') {
        if(invBodega) invBodega.classList.remove('hidden');
        initTableBodega();
    } else if (t === 'etiquetas') {
        if(etiquetas) etiquetas.classList.remove('hidden');
    } else if (t === 'historial-tecnico') {
        if(histTec) histTec.classList.remove('hidden');
    } else if (t === 'historial-tickets') {
        if(histTick) histTick.classList.remove('hidden');
    } else if (t === 'historial-pedidos') {
        if(histPed) histPed.classList.remove('hidden');
    }

    const ticketBar = document.getElementById('tickets-aparcados-bar');
    const parkButton = document.getElementById('btn-park-ticket');
    const clearButton = document.getElementById('btn-clear-cart');
    const mostrarControlesVenta = t === 'ventas';
    if (ticketBar) ticketBar.classList.toggle('hidden', !mostrarControlesVenta);
    if (parkButton) parkButton.classList.toggle('hidden', !mostrarControlesVenta);
    if (clearButton) clearButton.classList.toggle('hidden', !mostrarControlesVenta);
};

/* --- TABLA SALA DE VENTAS --- */
async function initTableSala() {
    const data = await window.posAPI.obtenerTodoInventario('SALA');
  const countLabel = document.getElementById('inv-sala-count');
  if (countLabel) countLabel.innerText = `(${data.length} registrados)`;

    if (!tableSala) {
        tableSala = new Tabulator('#inventario-table-sala', {
            data: data,
            layout: 'fitColumns',
            responsiveLayout: 'collapse',
            pagination: 'local',
            paginationSize: 15,
            paginationSizeSelector: [15, 30, 50, 100, 200],
            index: 'Codigo',
            columns: [
                {title: 'CÓDIGO', field: 'Codigo', width: 120, headerSort: false},
                {title: 'DESCRIPCIÓN', field: 'Descripcion', minWidth: 200},
                {title: 'CATEGORÍA', field: 'Categoria'},
                {title: 'COSTO', field: 'Costo_Adquisicion', formatter: 'money', formatterParams:{symbol:'Q', precision:2}, hozAlign: 'right', width: 100},
                {title: 'PRECIO VENTA', field: 'Precio_Venta', formatter: 'money', formatterParams:{symbol:'Q', precision:2}, hozAlign: 'right', width: 130},
                {title: 'STOCK SALA', field: 'Stock', hozAlign: 'center', width: 120, formatter: (cell) => {
                    const val = Number(cell.getValue());
                  if (window.stockNegativoPermitido?.()) return `<span class="font-bold text-slate-600">${val}</span>`;
                    if (val <= 0) return `<span class="px-2 py-1 bg-red-100 text-red-800 rounded font-bold">AGOTADO</span>`;
                    if (val < 12) return `<span class="px-2 py-1 bg-orange-100 text-orange-800 rounded font-bold">${val}</span>`;
                    if (val < 23) return `<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-bold">${val}</span>`;
                    return `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">${val}</span>`;
                }},
                {title: 'ACCIONES', formatter: actionFormatterSala, hozAlign: 'center', headerSort: false, width: 150, cellClick: function(e, cell) {
                    const btn = e.target.closest('button');
                    if (btn) {
                        if (btn.title === 'Editar') window.editSala(cell.getRow().getData().Codigo);
                        else if (btn.title === 'Dar de Entrada Manual') window.movimientoSala(cell.getRow().getData().Codigo, 'ENTRADA');
                        else if (btn.title === 'Ajuste' || btn.title === 'Ajuste / Merma') window.movimientoSala(cell.getRow().getData().Codigo, 'SALIDA');
                    }
                }}
            ],
        });
        
        const searchInput = document.getElementById('inv-sala-search');
        if(searchInput) {
            searchInput.addEventListener('input', function(e) {
            const query = this.value;
            tableSala.setFilter(data => window.coincideBusquedaPorPalabras(
              query, data.Codigo, data.Descripcion, data.Categoria
            ));
            });
        }
    } else {
        tableSala.replaceData(data);
    }
}

function actionFormatterSala(cell, formatterParams, onRendered) {
    return `<button class="text-blue-500 hover:text-blue-700 mr-3" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="text-green-600 hover:text-green-800 mr-3" title="Dar de Entrada Manual"><i class="fas fa-box-open mr-1"></i>Entrada</button>
            <button class="text-red-500 hover:text-red-700" title="Ajuste / Merma"><i class="fas fa-dolly mr-1"></i>Ajuste</button>`;
}

window.verificarCodigoGlobal = async function(contexto) {
    const inputId = contexto === 'SALA' ? 'inv-sala-codigo' : 'inv-bodega-codigo';
    const codigo = document.getElementById(inputId).value.trim();
    
    if (!codigo) return;
    
    try {
        const res = await window.posAPI.buscarProductoGlobal(codigo);
        
        if (contexto === 'SALA') {
            if (res.sala) {
                const yaEditando = Boolean(window.currentEditOriginalCodeSala);
                if (!yaEditando) {
                    const form = document.getElementById('form-container-sala');
                    form.classList.add('bg-amber-50');
                    setTimeout(() => form.classList.remove('bg-amber-50'), 1200);
                    window.customAlert(`Se encontró el mismo código en Sala. Se recomienda editar el producto del inventario actual y no duplicar registros.`);
                }
                return;
            }
            if (res.bodega) {
                document.getElementById('inv-sala-desc').value = res.bodega.Descripcion;
                document.getElementById('inv-sala-cat').value = res.bodega.Categoria;
                document.getElementById('inv-sala-costo').value = res.bodega.Costo_Adquisicion;
                document.getElementById('inv-sala-precio').value = res.bodega.Precio_Venta;
                const form = document.getElementById('form-container-sala');
                form.classList.add('bg-green-50');
                setTimeout(() => form.classList.remove('bg-green-50'), 1000);
                return;
            }
        } else if (contexto === 'BODEGA') {
            if (res.bodega) {
                const yaEditando = Boolean(window.currentEditOriginalCodeBodega);
                if (!yaEditando) {
                    const form = document.getElementById('form-container-bodega');
                    form.classList.add('bg-amber-50');
                    setTimeout(() => form.classList.remove('bg-amber-50'), 1200);
                    window.customAlert(`Se encontró el mismo código en Bodega. Se recomienda editar el producto del inventario actual y no duplicar registros.`);
                }
                return;
            }
            if (res.sala) {
                document.getElementById('inv-bodega-desc').value = res.sala.Descripcion;
                document.getElementById('inv-bodega-cat').value = res.sala.Categoria;
                document.getElementById('inv-bodega-costo').value = res.sala.Costo_Adquisicion;
                document.getElementById('inv-bodega-precio').value = res.sala.Precio_Venta;
                const form = document.getElementById('form-container-bodega');
                form.classList.add('bg-green-50');
                setTimeout(() => form.classList.remove('bg-green-50'), 1000);
            }
        }
    } catch (err) {
        console.error("Error al verificar código global:", err);
    }
};

async function ofrecerSincronizacionInventario(payload) {
  try {
  const codigoOriginal = String(payload.codigo_original || '').trim().toUpperCase();
  const codigoNuevo = String(payload.codigo || '').trim().toUpperCase();
  if (!codigoOriginal || !codigoNuevo || codigoOriginal === codigoNuevo || !window.posAPI?.buscarProductoGlobal) return;

  const encontrado = await window.posAPI.buscarProductoGlobal(codigoOriginal);
    const otroContexto = payload.contexto === 'SALA' ? 'BODEGA' : 'SALA';
    const otroProducto = otroContexto === 'SALA' ? encontrado.sala : encontrado.bodega;
    if (!otroProducto) return;

    const actualizar = await window.customConfirm(
      `El código ${codigoOriginal} cambiará a ${codigoNuevo}. También existe en ${otroContexto}. ¿Deseas actualizar allí el código? El stock de ${otroContexto} se conservará sin cambios.`
    );
    if (!actualizar) return;

    const resultado = await window.posAPI.actualizarCodigoInventario({
      contexto: otroContexto,
      codigo_original: otroProducto.Codigo,
      codigo_nuevo: codigoNuevo
    });
    if (!resultado.success) {
      alert(`El producto se guardó en ${payload.contexto}, pero no se pudo actualizar en ${otroContexto}: ${resultado.error}`);
    } else if (otroContexto === 'SALA') {
      await initTableSala();
    } else {
      await initTableBodega();
    }
  } catch (error) {
    console.error('Error al ofrecer sincronización de inventario:', error);
  }
}

window.editarCodigoBarra = function(contexto) {
  const prefijo = contexto === 'SALA' ? 'sala' : 'bodega';
  const suffix = contexto === 'SALA' ? 'Sala' : 'Bodega';
  const originalCode = window[`currentEditOriginalCode${suffix}`];
  const input = document.getElementById(`inv-${prefijo}-codigo`);
  const button = document.getElementById(`btn-editar-codigo-${prefijo}`);
  if (!input || !originalCode) {
    window.customAlert('Primero selecciona un producto desde la tabla para editar su código.');
    return;
  }

  const stateKey = `editingBarcode${suffix}`;
  if (!window[stateKey]) {
    window[stateKey] = true;
    input.readOnly = false;
    input.focus();
    input.select();
    setInventoryFieldsDisabled(contexto, true);
    if (button) {
      button.innerHTML = '<i class="fas fa-check mr-1"></i> Guardar código';
      button.classList.add('bg-green-100', 'text-green-700');
    }
    return;
  }

  const nuevoCodigo = input.value.trim().toUpperCase();
  if (!nuevoCodigo) {
    alert('El código de barras no puede quedar vacío.');
    return;
  }

  const guardarFn = contexto === 'SALA' ? window.saveInventarioSala : window.saveInventarioBodega;
  if (typeof guardarFn === 'function') guardarFn();
};

function setInventoryFieldsDisabled(contexto, disabled) {
  const prefijo = contexto === 'SALA' ? 'sala' : 'bodega';
  ['desc', 'cat', 'costo', 'precio', 'stock', 'pres'].forEach(campo => {
    const input = document.getElementById(`inv-${prefijo}-${campo}`);
    if (input) input.disabled = disabled;
  });
}

function resetBarcodeEditState(contexto) {
  const prefijo = contexto === 'SALA' ? 'sala' : 'bodega';
  const suffix = contexto === 'SALA' ? 'Sala' : 'Bodega';
  const input = document.getElementById(`inv-${prefijo}-codigo`);
  const button = document.getElementById(`btn-editar-codigo-${prefijo}`);
  window[`editingBarcode${suffix}`] = false;
  if (input) input.readOnly = true;
  setInventoryFieldsDisabled(contexto, false);
  if (button) {
    button.innerHTML = 'Editar código de barras';
    button.classList.remove('bg-green-100', 'text-green-700');
  }
}

window.editSala = function(codigo) { 
    const role = document.getElementById('ui-current-role') ? document.getElementById('ui-current-role').innerText : '';
    if (role !== 'Administrador' && typeof window.requestAdminPassword === 'function') {
        window.customAlert(`El código "${codigo}" ya existe en Sala. Se requiere contraseña de administrador para modificar un producto existente.`);
        window.requestAdminPassword(() => {
            window._ejecutarEditSala(codigo, true);
            const formContainer = document.getElementById('form-container-sala');
            if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, () => {
            if (typeof window.cancelEditSala === 'function') window.cancelEditSala();
        });
    } else {
        window._ejecutarEditSala(codigo, false);
        const formContainer = document.getElementById('form-container-sala');
        if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window._ejecutarEditSala = function(codigo, forceAdmin = false) {
    const row = tableSala.getRow(codigo).getData();
    document.getElementById('inv-sala-codigo').value = row.Codigo;
    document.getElementById('inv-sala-desc').value = row.Descripcion;
    document.getElementById('inv-sala-cat').value = row.Categoria;
    document.getElementById('inv-sala-costo').value = row.Costo_Adquisicion;
    document.getElementById('inv-sala-precio').value = row.Precio_Venta;
    document.getElementById('inv-sala-stock').value = row.Stock ?? 0;
    
    // Configurar modo edición
    const role = document.getElementById('ui-current-role') ? document.getElementById('ui-current-role').innerText : 'Cajero';
    
    // Si es Administrador, permitir editar todo. Si no, bloquear campos críticos.
    if (forceAdmin || role === 'Administrador') {
        document.getElementById('inv-sala-codigo').readOnly = true;
        document.getElementById('inv-sala-desc').readOnly = false;
        document.getElementById('inv-sala-cat').readOnly = false;
        document.getElementById('inv-sala-costo').readOnly = false;
        document.getElementById('inv-sala-precio').readOnly = false;
        document.getElementById('btn-save-sala').classList.remove('hidden');
    } else {
        document.getElementById('inv-sala-codigo').readOnly = true;
        document.getElementById('inv-sala-desc').readOnly = true;
        document.getElementById('inv-sala-cat').readOnly = true;
        document.getElementById('inv-sala-costo').readOnly = true;
        document.getElementById('inv-sala-precio').readOnly = true;
        document.getElementById('btn-save-sala').classList.add('hidden');
    }
    document.getElementById('inv-sala-stock-container').classList.add('hidden');
    document.getElementById('btn-delete-sala').classList.remove('hidden');
    
    document.getElementById('edit-indicator-sala-code').innerText = row.Codigo;
    document.getElementById('edit-indicator-sala').classList.remove('hidden');
    document.getElementById('form-container-sala').classList.add('border-2', 'border-primary');
    document.getElementById('form-title-sala').innerText = 'Editar Producto en Sala';
    document.getElementById('btn-save-sala').innerHTML = '<i class="fas fa-sync"></i> Actualizar Producto';
    
    // Guardar el código original para saber si fue editado
    window.currentEditOriginalCodeSala = row.Codigo;
    resetBarcodeEditState('SALA');
};

window.cancelEditSala = function() {
    document.getElementById('inv-sala-codigo').value = '';
    document.getElementById('inv-sala-desc').value = '';
    document.getElementById('inv-sala-cat').value = '';
    document.getElementById('inv-sala-costo').value = '';
    document.getElementById('inv-sala-precio').value = '';
    document.getElementById('inv-sala-stock').value = '';
    
    document.getElementById('inv-sala-codigo').readOnly = false;
    document.getElementById('inv-sala-desc').readOnly = false;
    document.getElementById('inv-sala-cat').readOnly = false;
    document.getElementById('inv-sala-costo').readOnly = false;
    document.getElementById('inv-sala-precio').readOnly = false;
    setInventoryFieldsDisabled('SALA', false);
    document.getElementById('inv-sala-stock-container').classList.remove('hidden');
    document.getElementById('btn-delete-sala').classList.add('hidden');
    document.getElementById('btn-save-sala').classList.remove('hidden');
    
    document.getElementById('edit-indicator-sala').classList.add('hidden');
    document.getElementById('form-container-sala').classList.remove('border-2', 'border-primary');
    document.getElementById('form-title-sala').innerText = 'Agregar / Editar Producto en Sala';
    document.getElementById('btn-save-sala').innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
    
    window.currentEditOriginalCodeSala = null;
    resetBarcodeEditState('SALA');
    document.getElementById('inv-sala-codigo').readOnly = false;
};

window.saveInventarioSala = async function() {
    const payload = {
        contexto: 'SALA',
        codigo: document.getElementById('inv-sala-codigo').value.trim(),
        descripcion: document.getElementById('inv-sala-desc').value.trim(),
        categoria: document.getElementById('inv-sala-cat').value.trim(),
        costo: parseFloat(document.getElementById('inv-sala-costo').value) || 0,
        precio_venta: parseFloat(document.getElementById('inv-sala-precio').value) || 0,
        stock_inicial: parseInt(document.getElementById('inv-sala-stock').value) || 0
    };

    if (window.currentEditOriginalCodeSala) {
        payload.codigo_original = window.currentEditOriginalCodeSala;
        payload.encargado = localStorage.getItem('currentUser') || 'SISTEMA';
        
        const role = document.getElementById('ui-current-role') ? document.getElementById('ui-current-role').innerText : 'Cajero';
        if (role === 'Administrador') {
            if (!confirm("¿Estás seguro de querer modificar la información base de este producto? Asegúrate de que no haya errores de tipeo.")) {
                return;
            }
        }
    }

    if (!payload.codigo || !payload.descripcion) {
        alert('Código y Descripción son obligatorios.');
        return;
    }

    const res = await window.posAPI.guardarProducto(payload);
    if (res.success) {
      await ofrecerSincronizacionInventario(payload);
        window.cancelEditSala();
        initTableSala();
        if (typeof window.cargarCategoriasDatalist === 'function') window.cargarCategoriasDatalist();
    } else {
        alert('Error al guardar: ' + res.error);
    }
};

window.movimientoSala = async function(codigo, tipo) {
    const role = localStorage.getItem('currentRole') || 'Colaborador';
    if (role !== 'Administrador' && typeof requestAdminPassword === 'function') {
        requestAdminPassword(() => { window._ejecutarMovimientoSala(codigo, tipo); });
        return;
    }
    window._ejecutarMovimientoSala(codigo, tipo);
};

window._ejecutarMovimientoSala = async function(codigo, tipo) {
    const row = tableSala.getRow(codigo);
    const nombre = row ? row.getData().Descripcion : codigo;
    const cant = await window.customPrompt("Movimiento de Inventario", `Ingrese la cantidad de ${tipo} a la SALA para:\n${nombre}`);
    if(cant === null) return;
    const cantidadNum = parseInt(cant);
    if(isNaN(cantidadNum) || cantidadNum <= 0) {
        alert("Cantidad inválida");
        return;
    }
    const obs = await window.customPrompt("Observación", `Observación o justificación (opcional):`);
    
    const currentUser = localStorage.getItem('currentUser') || 'SISTEMA';
    const res = await window.posAPI.registrarMovimiento({
        codigo, cantidad: cantidadNum, contexto: 'SALA', tipo_movimiento: tipo, observacion: obs, encargado: currentUser
    });

    if(res.success) {
        initTableSala();
    } else {
        alert('Error: ' + res.error);
    }
};

/* --- TABLA BODEGA --- */
async function initTableBodega() {
    const data = await window.posAPI.obtenerTodoInventario('BODEGA');
  const countLabel = document.getElementById('inv-bodega-count');
  if (countLabel) countLabel.innerText = `(${data.length} registrados)`;

    if (!tableBodega) {
        tableBodega = new Tabulator('#inventario-table-bodega', {
            data: data,
            layout: 'fitColumns',
            responsiveLayout: 'collapse',
            pagination: 'local',
            paginationSize: 15,
            paginationSizeSelector: [15, 30, 50, 100, 200],
            index: 'Codigo',
            columns: [
                {title: 'CÓDIGO', field: 'Codigo', width: 120, headerSort: false},
                {title: 'DESCRIPCIÓN', field: 'Descripcion', minWidth: 200},
                {title: 'PRESENTACIÓN', field: 'Presentacion'},
                {title: 'COSTO ADQ.', field: 'Costo_Adquisicion', formatter: 'money', formatterParams:{symbol:'Q', precision:2}, hozAlign: 'right', width: 100},
                {title: 'PRECIO VENTA', field: 'Precio_Venta', formatter: 'money', formatterParams:{symbol:'Q', precision:2}, hozAlign: 'right', width: 130},
                {title: 'STOCK BODEGA', field: 'Stock', hozAlign: 'center', width: 130, formatter: (cell) => {
                    const val = Number(cell.getValue());
                  if (window.stockNegativoPermitido?.()) return `<span class="font-bold text-slate-600">${val}</span>`;
                    if (val <= 0) return `<span class="px-2 py-1 bg-red-100 text-red-800 rounded font-bold">AGOTADO</span>`;
                    if (val < 12) return `<span class="px-2 py-1 bg-orange-100 text-orange-800 rounded font-bold">${val}</span>`;
                    if (val < 23) return `<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-bold">${val}</span>`;
                    return `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">${val}</span>`;
                }},
                {title: 'ACCIONES', formatter: actionFormatterBodega, hozAlign: 'center', headerSort: false, width: 150, cellClick: function(e, cell) {
                    const btn = e.target.closest('button');
                    if (btn) {
                        if (btn.title === 'Editar') window.editBodega(cell.getRow().getData().Codigo);
                        else if (btn.title === 'Dar de Entrada Manual') window.movimientoBodega(cell.getRow().getData().Codigo, 'ENTRADA');
                        else if (btn.title === 'Ajuste / Merma / Salida' || btn.title === 'Salida/Ajuste') window.movimientoBodega(cell.getRow().getData().Codigo, 'SALIDA');
                    }
                }}
            ],
        });
        
        const searchInput = document.getElementById('inv-bodega-search');
        if(searchInput) {
            searchInput.addEventListener('input', function(e) {
            const query = this.value;
            tableBodega.setFilter(data => window.coincideBusquedaPorPalabras(
              query, data.Codigo, data.Descripcion, data.Categoria, data.Presentacion
            ));
            });
        }
    } else {
        tableBodega.replaceData(data);
    }
}

function actionFormatterBodega(cell, formatterParams, onRendered) {
    return `<button class="text-blue-500 hover:text-blue-700 mr-3" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="text-green-600 hover:text-green-800 mr-3" title="Dar de Entrada Manual"><i class="fas fa-box-open mr-1"></i>Entrada</button>
            <button class="text-red-500 hover:text-red-700" title="Ajuste / Merma / Salida"><i class="fas fa-dolly mr-1"></i>Salida/Ajuste</button>`;
}

window.editBodega = function(codigo) { 
    const role = document.getElementById('ui-current-role') ? document.getElementById('ui-current-role').innerText : '';
    if (role !== 'Administrador' && typeof window.requestAdminPassword === 'function') {
        window.customAlert(`El código "${codigo}" ya existe en Bodega. Se requiere contraseña de administrador para modificar un producto existente.`);
        window.requestAdminPassword(() => {
            window._ejecutarEditBodega(codigo, true);
            const formContainer = document.getElementById('form-container-bodega');
            if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, () => {
            if (typeof window.cancelEditBodega === 'function') window.cancelEditBodega();
        });
    } else {
        window._ejecutarEditBodega(codigo, false);
        const formContainer = document.getElementById('form-container-bodega');
        if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window._ejecutarEditBodega = function(codigo, forceAdmin = false) {
    const row = tableBodega.getRow(codigo).getData();
    document.getElementById('inv-bodega-codigo').value = row.Codigo;
    document.getElementById('inv-bodega-desc').value = row.Descripcion;
    document.getElementById('inv-bodega-pres').value = row.Presentacion;
    document.getElementById('inv-bodega-cat').value = row.Categoria;
    document.getElementById('inv-bodega-costo').value = row.Costo_Adquisicion;
    document.getElementById('inv-bodega-precio').value = row.Precio_Venta;
    document.getElementById('inv-bodega-stock').value = row.Stock ?? 0;
    
    // Configurar modo edición
    const role = document.getElementById('ui-current-role') ? document.getElementById('ui-current-role').innerText : 'Cajero';
    
    // Si es Administrador, permitir editar todo. Si no, bloquear campos críticos.
    if (forceAdmin || role === 'Administrador') {
        document.getElementById('inv-bodega-codigo').readOnly = true;
        document.getElementById('inv-bodega-desc').readOnly = false;
        document.getElementById('inv-bodega-cat').readOnly = false;
        document.getElementById('inv-bodega-pres').readOnly = false;
        document.getElementById('inv-bodega-costo').readOnly = false;
        document.getElementById('inv-bodega-precio').readOnly = false;
        document.getElementById('btn-save-bodega').classList.remove('hidden');
    } else {
        document.getElementById('inv-bodega-codigo').readOnly = true;
        document.getElementById('inv-bodega-desc').readOnly = true;
        document.getElementById('inv-bodega-cat').readOnly = true;
        document.getElementById('inv-bodega-pres').readOnly = true;
        document.getElementById('inv-bodega-costo').readOnly = true;
        document.getElementById('inv-bodega-precio').readOnly = true;
        document.getElementById('btn-save-bodega').classList.add('hidden');
    }
    document.getElementById('inv-bodega-stock-container').classList.add('hidden');
    document.getElementById('btn-delete-bodega').classList.remove('hidden');
    
    document.getElementById('edit-indicator-bodega-code').innerText = row.Codigo;
    document.getElementById('edit-indicator-bodega').classList.remove('hidden');
    document.getElementById('form-container-bodega').classList.add('border-2', 'border-primary');
    document.getElementById('form-title-bodega').innerText = 'Editar Producto en Bodega';
    document.getElementById('btn-save-bodega').innerHTML = '<i class="fas fa-sync"></i> Actualizar Producto';
    
    window.currentEditOriginalCodeBodega = row.Codigo;
    resetBarcodeEditState('BODEGA');
};

window.cancelEditBodega = function() {
    document.getElementById('inv-bodega-codigo').value = '';
    document.getElementById('inv-bodega-desc').value = '';
    document.getElementById('inv-bodega-pres').value = 'UNIDAD';
    document.getElementById('inv-bodega-cat').value = '';
    document.getElementById('inv-bodega-costo').value = '';
    document.getElementById('inv-bodega-precio').value = '';
    document.getElementById('inv-bodega-stock').value = '';
    
    document.getElementById('inv-bodega-codigo').readOnly = false;
    document.getElementById('inv-bodega-desc').readOnly = false;
    document.getElementById('inv-bodega-cat').readOnly = false;
    document.getElementById('inv-bodega-pres').readOnly = false;
    document.getElementById('inv-bodega-costo').readOnly = false;
    document.getElementById('inv-bodega-precio').readOnly = false;
    setInventoryFieldsDisabled('BODEGA', false);
    document.getElementById('inv-bodega-stock-container').classList.remove('hidden');
    document.getElementById('btn-delete-bodega').classList.add('hidden');
    
    document.getElementById('edit-indicator-bodega').classList.add('hidden');
    document.getElementById('form-container-bodega').classList.remove('border-2', 'border-primary');
    document.getElementById('form-title-bodega').innerText = 'Agregar / Editar Producto en Bodega';
    document.getElementById('btn-save-bodega').innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
    
    window.currentEditOriginalCodeBodega = null;
    resetBarcodeEditState('BODEGA');
    document.getElementById('inv-bodega-codigo').readOnly = false;
};

window.saveInventarioBodega = async function() {
    const payload = {
        contexto: 'BODEGA',
        codigo: document.getElementById('inv-bodega-codigo').value.trim(),
        descripcion: document.getElementById('inv-bodega-desc').value.trim(),
        categoria: document.getElementById('inv-bodega-cat').value.trim(),
        presentacion: document.getElementById('inv-bodega-pres').value,
        costo: parseFloat(document.getElementById('inv-bodega-costo').value) || 0,
        precio_venta: parseFloat(document.getElementById('inv-bodega-precio').value) || 0,
        stock_inicial: parseInt(document.getElementById('inv-bodega-stock').value) || 0
    };

    if (window.currentEditOriginalCodeBodega) {
        payload.codigo_original = window.currentEditOriginalCodeBodega;
        payload.encargado = localStorage.getItem('currentUser') || 'SISTEMA';
        
        const role = document.getElementById('ui-current-role') ? document.getElementById('ui-current-role').innerText : 'Cajero';
        if (role === 'Administrador') {
            if (!confirm("¿Estás seguro de querer modificar la información base de este producto? Asegúrate de que no haya errores de tipeo.")) {
                return;
            }
        }
    }

    if (!payload.codigo || !payload.descripcion) {
        alert('Código y Descripción son obligatorios.');
        return;
    }

    const res = await window.posAPI.guardarProducto(payload);
    if (res.success) {
      await ofrecerSincronizacionInventario(payload);
        window.cancelEditBodega();
        initTableBodega();
        if (typeof window.cargarCategoriasDatalist === 'function') window.cargarCategoriasDatalist();
    } else {
        alert('Error al guardar: ' + res.error);
    }
};

window.movimientoBodega = async function(codigo, tipo) {
    const role = localStorage.getItem('currentRole') || 'Colaborador';
    if (role !== 'Administrador' && typeof requestAdminPassword === 'function') {
        requestAdminPassword(() => { window._ejecutarMovimientoBodega(codigo, tipo); });
        return;
    }
    window._ejecutarMovimientoBodega(codigo, tipo);
};

window._ejecutarMovimientoBodega = async function(codigo, tipo) {
    const row = tableBodega.getRow(codigo);
    const nombre = row ? row.getData().Descripcion : codigo;
    const cant = await window.customPrompt("Movimiento de Inventario", `Ingrese la cantidad de ${tipo} de la BODEGA para:\n${nombre}`);
    if(cant === null) return;
    const cantidadNum = parseInt(cant);
    if(isNaN(cantidadNum) || cantidadNum <= 0) {
        alert("Cantidad inválida");
        return;
    }
    const obs = await window.customPrompt("Observación", `Observación o justificación (opcional):`);
    
    const currentUser = localStorage.getItem('currentUser') || 'SISTEMA';
    const res = await window.posAPI.registrarMovimiento({
        codigo, cantidad: cantidadNum, contexto: 'BODEGA', tipo_movimiento: tipo, observacion: obs, encargado: currentUser
    });

    if(res.success) {
        initTableBodega();
    } else {
        alert('Error: ' + res.error);
    }
};

window.deleteProducto = async function(contexto) {
    if (typeof requestAdminPassword === 'function') {
        requestAdminPassword(async () => {
            const inputId = contexto === 'SALA' ? 'inv-sala-codigo' : 'inv-bodega-codigo';
            const codigo = document.getElementById(inputId).value.trim();
            
            if (await window.customConfirm(`¿Está seguro que desea eliminar permanentemente el producto ${codigo} de la ${contexto}? Esta acción no se puede deshacer.`)) {
                const res = await window.posAPI.eliminarProducto({ codigo, contexto });
                if (res.success) {
                    alert(`Producto eliminado correctamente de la ${contexto}.`);
                    if (contexto === 'SALA') {
                        window.cancelEditSala();
                        initTableSala();
                    } else {
                        window.cancelEditBodega();
                        initTableBodega();
                    }
                } else {
                    alert('Error al eliminar: ' + res.error);
                }
            }
        });
    } else {
        alert('Error: La función de seguridad de administrador no está disponible.');
    }
};

let currentZSessionId = null;
let currentZTotal = 0;

async function cerrarTurnoZ() {
    if (!currentZSessionId) return;
    const confirm = await window.customConfirm("¿Estás seguro de que quieres CERRAR CAJA definitivamente para este turno?");
    if (confirm) {
        let efectivoReal = document.getElementById('z-efectivo-ingresado')?.value;
        efectivoReal = efectivoReal ? Number(efectivoReal) : 0;
        
        const esAdministrador = window.currentUserIsAdmin !== false;
        
        await imprimirZ(); // Imprimimos primero
        try {
            const resultadoCierre = await window.posAPI.cerrarTurno(currentZSessionId, {
                efectivo_ingresado: efectivoReal,
                es_administrador: esAdministrador
            });
            if (!resultadoCierre?.success) throw new Error(resultadoCierre?.error || 'No se pudo cerrar el turno.');
            closeAllModals();
            window.customAlert("Turno cerrado con éxito. El próximo ticket iniciará un nuevo turno en Q0.00.");
            if (typeof initUsers === 'function') {
                document.getElementById('ui-current-username').innerText = "ESPERANDO USUARIO...";
                document.getElementById('ui-current-role').innerText = "";
                initUsers();
            }
        } catch (e) {
            console.error("Error al cerrar turno", e);
        }
    }
}

function calcularDineroEnCaja(efectivoEsperado) {
  const inputEl = document.getElementById('z-efectivo-ingresado');
  const rawValue = inputEl && inputEl.value !== '' ? Number(inputEl.value) : 0;
  const esperado = Number(efectivoEsperado || 0);
  const cuadreExacto = !rawValue;
  const contado = cuadreExacto ? esperado : rawValue;
  const diferencia = Number((contado - esperado).toFixed(2));
  return { contado, diferencia, cuadreExacto };
}

window.imprimirZ = async function() {
  let zData;
  try {
    zData = await window.posAPI.generarCorteZ();
  } catch (err) {
    window.customAlert('No se pudo obtener el Corte Z: ' + err.message);
    return { success: false, error: err.message };
  }
  const esCiego = window.currentUserIsAdmin === false;
  const { contado, diferencia } = calcularDineroEnCaja(zData.efectivo_esperado);
  const inputContado = document.getElementById('z-efectivo-ingresado')?.value;
  zData.usuario = localStorage.getItem('currentUser') || "DESCONOCIDO";
  zData.es_ciego = esCiego;
  // En corte a ciegas nunca se imprime el esperado ni se infiere de él.
  zData.efectivo_ingresado = esCiego ? Number(inputContado || 0) : contado;
  zData.diferencia_caja = esCiego ? 0 : diferencia;
  return window.imprimirCorteZDocumento(zData);
};

window.cerrarTurnoZ = cerrarTurnoZ;

window.cargarImpresoras = async function() {
    if (!window.posAPI || !window.posAPI.getPrinters) return;
    const select = document.getElementById('onboard-printer');
    if (!select) return;
    try {
        const printers = await window.posAPI.getPrinters();
        const currentSelection = select.value;
        select.innerHTML = '<option value="">Seleccionar Impresora (Predeterminada del Sistema / Con Dialogo)</option>';
        printers.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name + (p.isDefault ? ' (Predeterminada)' : '');
            select.appendChild(opt);
        });
        
        const config = await window.posAPI.getConfig();
        if (config.impresora_seleccionada) {
            select.value = config.impresora_seleccionada;
        } else if (currentSelection) {
            select.value = currentSelection;
        }
    } catch (e) {
        console.error("Error al cargar impresoras:", e);
    }
};

let top20HoldTimer = null;
let currentTopCategory = null;

window.cargarTopCategorias = async function() {
    if (!window.posAPI || !window.posAPI.obtenerTopCategorias) return;
    const container = document.getElementById('top-categorias-container');
    if (!container) return;

    try {
        const categorias = await window.posAPI.obtenerTopCategorias();
        if (!categorias || categorias.length === 0) return;

        container.innerHTML = '';
        
        // Botón "Todas"
        const btnTodas = document.createElement('button');
        btnTodas.className = `whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${currentTopCategory === null ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-border hover:bg-surface-alt'}`;
        btnTodas.textContent = 'TODAS';
        btnTodas.onclick = () => {
            currentTopCategory = null;
            window.cargarTopCategorias();
            window.cargarTop20(null);
        };
        container.appendChild(btnTodas);

        // Botones de cada categoría
        categorias.forEach(cat => {
            const btn = document.createElement('button');
            const isActive = currentTopCategory === cat;
            btn.className = `whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${isActive ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-border hover:bg-surface-alt'}`;
            btn.textContent = cat;
            btn.onclick = () => {
                currentTopCategory = cat;
                window.cargarTopCategorias();
                window.cargarTop20(cat);
            };
            container.appendChild(btn);
        });
    } catch (e) {
        console.error("Error cargando Top Categorias:", e);
    }
};

window.cargarTop20 = async function(categoria = null) {
    if (!window.posAPI || !window.posAPI.obtenerTop20) return;
    const container = document.getElementById('top20-container');
    if (!container) return;

    try {
        const top20 = await window.posAPI.obtenerTop20(categoria);
      const stockLibre = window.stockNegativoPermitido?.() === true;
        container.innerHTML = '';
        if (top20.length === 0) {
            container.innerHTML = '<p class="text-[10px] text-slate-400 font-bold uppercase italic p-2">Aún no hay suficientes ventas.</p>';
            return;
        }

        top20.forEach(prod => {
            const stockNum = Number(prod.Stock) || 0;
            let bgClass = "bg-surface hover:bg-surface-alt border-border";
            let stockColor = "text-muted";

            if (!stockLibre && stockNum <= 0) {
                bgClass = "bg-surface border-danger";
                stockColor = "text-danger font-bold";
            } else if (!stockLibre && stockNum < 12) {
                bgClass = "bg-surface border-warning";
                stockColor = "text-warning font-bold";
            } else if (!stockLibre && stockNum < 23) {
                bgClass = "bg-surface border-warning";
            }

            const btn = document.createElement('button');
            btn.className = `flex flex-col items-start justify-between p-2 rounded-xl border transition-all shadow-sm active:scale-95 text-left relative overflow-hidden ${bgClass}`;
            btn.style.width = '100%';
            btn.style.minHeight = '75px';

            const labelDesc = document.createElement('p');
            labelDesc.className = "text-[11px] font-black text-main leading-tight line-clamp-2 w-full uppercase relative z-10";
            labelDesc.innerText = prod.Descripcion;

            const bottomRow = document.createElement('div');
            bottomRow.className = "flex justify-between items-center w-full mt-1 relative z-10";

            const labelPrice = document.createElement('p');
            labelPrice.className = "text-[11px] font-bold text-blue-700 uppercase";
            labelPrice.innerText = `${window.MONEDA}${parseFloat(prod.Precio_Venta).toFixed(2)}`;

            const labelStock = document.createElement('p');
            labelStock.className = `text-[10px] font-medium uppercase ${stockColor}`;
            labelStock.innerText = `STOCK: ${stockNum}`;

            bottomRow.appendChild(labelPrice);
            bottomRow.appendChild(labelStock);

            btn.appendChild(labelDesc);
            btn.appendChild(bottomRow);

            if (!stockLibre && stockNum <= 0) {
                const overlay = document.createElement('div');
                overlay.className = "absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] pointer-events-none z-20";
                overlay.innerHTML = '<span class="text-red-600 font-black text-xl rotate-12 opacity-80 uppercase border-2 border-red-500 rounded p-1 tracking-widest">AGOTADO</span>';
                btn.appendChild(overlay);
            }

            // Hold logic
            btn.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; // Only left click
                top20HoldTimer = setTimeout(() => {
                    top20HoldTimer = null;
                    if (typeof window.mostrarModalCantidad === 'function') {
                        window.mostrarModalCantidad(prod);
                    }
                }, 500); // 500ms hold
            });

            btn.addEventListener('mouseup', () => {
                if (top20HoldTimer) {
                    clearTimeout(top20HoldTimer);
                    top20HoldTimer = null;
                    if (typeof addCart === 'function') {
                        addCart(prod.Descripcion, parseFloat(prod.Precio_Venta), 1, prod.Categoria, false, prod.Codigo);
                    }
                }
            });

            btn.addEventListener('mouseleave', () => {
                if (top20HoldTimer) {
                    clearTimeout(top20HoldTimer);
                    top20HoldTimer = null;
                }
            });
            
            // For touch devices
            btn.addEventListener('touchstart', (e) => {
                top20HoldTimer = setTimeout(() => {
                    top20HoldTimer = null;
                    if (typeof window.mostrarModalCantidad === 'function') {
                        window.mostrarModalCantidad(prod);
                    }
                }, 500);
            }, {passive: true});
            
            btn.addEventListener('touchend', (e) => {
                if (top20HoldTimer) {
                    clearTimeout(top20HoldTimer);
                    top20HoldTimer = null;
                    e.preventDefault(); // Prevent duplicate mouseup events
                    if (typeof addCart === 'function') {
                        addCart(prod.Descripcion, parseFloat(prod.Precio_Venta), 1, prod.Categoria, false, prod.Codigo);
                    }
                }
            });

            container.appendChild(btn);
        });
    } catch (e) {
        console.error("Error cargando Top 20:", e);
    }
};

window.exportarExcelUI = async function(contexto) {
    const role = localStorage.getItem('currentRole') || 'Colaborador';
    if (role !== 'Administrador' && typeof requestAdminPassword === 'function') {
        requestAdminPassword(() => { window._ejecutarExportarExcelUI(contexto); });
        return;
    }
    window._ejecutarExportarExcelUI(contexto);
};

window._ejecutarExportarExcelUI = async function(contexto) {
    try {
        const res = await window.posAPI.exportarInventarioExcel(contexto);
        if (res.success) {
            alert(`Inventario exportado correctamente a:\n${res.filePath}`);
        } else if (res.error !== "Exportación cancelada.") {
            alert(`Error al exportar: ${res.error}`);
        }
    } catch (e) {
        console.error(e);
        alert('Ocurrió un error inesperado al exportar.');
    }
};

window.importarExcelUI = async function(contexto) {
    const role = localStorage.getItem('currentRole') || 'Colaborador';
    if (role !== 'Administrador' && typeof requestAdminPassword === 'function') {
        requestAdminPassword(() => { window._ejecutarImportarExcelUI(contexto); });
        return;
    }
    window._ejecutarImportarExcelUI(contexto);
};

window._ejecutarImportarExcelUI = async function(contexto) {
    if (!window.customConfirm) {
        window.customConfirm = (msg) => Promise.resolve(confirm(msg));
    }

    // Electron no soporta prompt() nativo, usamos confirm()
    const isReemplazar = confirm(`Vas a importar un archivo Excel a la base de datos de ${contexto}.\n\nSi un código ya existe:\n[Aceptar] = REEMPLAZAR (Inventario General)\n[Cancelar] = SUMAR (Ingreso de Factura)`);
    
    let modo = isReemplazar ? 'REEMPLAZAR' : 'SUMAR';

    const accionMsg = modo === 'SUMAR' ? 'SUMARÁ' : 'REEMPLAZARÁ';
    const finalConfirm = await window.customConfirm(`¿Estás seguro? El inventario en Excel ${accionMsg} la información actual en ${contexto}.`);
    if (!finalConfirm) return;

    try {
        const res = await window.posAPI.importarInventarioExcel({ contexto, modo });
        if (res.success) {
            alert(`¡Importación exitosa! Se procesaron ${res.count} productos.`);
            if (contexto === 'SALA' && typeof initTableSala === 'function') {
                initTableSala();
            } else if (contexto === 'BODEGA' && typeof initTableBodega === 'function') {
                initTableBodega();
            }
        } else if (res.error !== "Importación cancelada.") {
            alert(`Error durante la importación:\n${res.error}`);
        }
    } catch (e) {
        console.error(e);
        alert('Ocurrió un error inesperado al importar.');
    }
};

/* -------------------------------------------------------------------------- */
/* MÓDULO DE GASTOS DIARIOS                                                   */
/* -------------------------------------------------------------------------- */

window.abrirModalGastos = async function() {
    const container = document.getElementById('gastos-container');
    container.innerHTML = '';
    
    try {
        const gastosGuardados = await window.posAPI.obtenerGastosSesion();
        
        if (gastosGuardados && gastosGuardados.length > 0) {
            gastosGuardados.forEach(g => {
                agregarFilaGasto(g.descripcion, g.monto);
            });
        }
        
        // Ensure there's always at least 3 rows or at least 1 empty row to start typing
        const minRows = Math.max(3, gastosGuardados.length + 1);
        const toAdd = minRows - gastosGuardados.length;
        
        for (let i = 0; i < toAdd; i++) {
            agregarFilaGasto();
        }
    } catch (e) {
        console.error("Error al cargar gastos de la sesión:", e);
        for (let i = 0; i < 3; i++) agregarFilaGasto();
    }
    
    updateGastosTotal();
    
    const modal = document.getElementById('modal-gastos');
    modal.classList.remove('hidden');
    
    // Focus the first input if available
    setTimeout(() => {
        const firstInput = container.querySelector('.gasto-desc');
        if (firstInput) firstInput.focus();
    }, 100);
};

window.agregarFilaGasto = function(descVal = '', montoVal = '') {
    const container = document.getElementById('gastos-container');
    
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    
    // Escaping to prevent HTML injection just in case
    const safeDesc = descVal.replace(/"/g, '&quot;');
    const safeMonto = montoVal !== '' ? Number(montoVal).toFixed(2) : '';

    div.innerHTML = `
        <div class="flex-1">
            <input type="text" placeholder="Descripción del gasto (ej. Agua, Limpieza)" value="${safeDesc}" class="w-full p-3 border border-border rounded-xl font-bold outline-none focus:border-danger bg-app text-main uppercase text-xs gasto-desc">
        </div>
        <div class="w-32">
            <input type="number" step="0.01" min="0" placeholder="0.00" value="${safeMonto}" class="w-full p-3 border border-border rounded-xl font-black text-main outline-none focus:border-danger bg-app text-right text-xs gasto-monto" oninput="updateGastosTotal()">
        </div>
        <button onclick="eliminarFilaGasto(this)" title="Quitar este gasto" class="p-3 text-muted hover:text-danger transition-colors">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(div);
};

window.eliminarFilaGasto = async function(boton) {
    const fila = boton.closest('.flex');
    if (!fila) return;

    const desc = fila.querySelector('.gasto-desc')?.value.trim() || '';
    const montoStr = fila.querySelector('.gasto-monto')?.value.trim() || '';

    // Una fila en blanco no tiene nada que confirmar.
    if (desc || montoStr) {
        const monto = parseFloat(montoStr);
        const detalle = desc
            ? `"${escaparHtml(desc)}"${!isNaN(monto) && monto > 0 ? ` por ${window.MONEDA}${monto.toFixed(2)}` : ''}`
            : `el monto de ${window.MONEDA}${(isNaN(monto) ? 0 : monto).toFixed(2)}`;

        const confirmado = await window.customConfirm(
            `¿Seguro que deseas borrar el gasto ${detalle}? Se quitará del listado y no se descontará de tu Corte Z.`
        );
        if (!confirmado) return;
    }

    fila.remove();
    updateGastosTotal();
};

window.updateGastosTotal = function() {
    const montos = document.querySelectorAll('.gasto-monto');
    let total = 0;
    montos.forEach(m => {
        const val = parseFloat(m.value);
        if (!isNaN(val) && val > 0) total += val;
    });
    document.getElementById('gastos-total-preview').innerText = 'Q' + total.toFixed(2);
};

window.guardarGastos = async function() {
    const container = document.getElementById('gastos-container');
    const filas = container.children;
    const gastosArr = [];
    
    for (let i = 0; i < filas.length; i++) {
        const desc = filas[i].querySelector('.gasto-desc').value.trim();
        const montoStr = filas[i].querySelector('.gasto-monto').value.trim();
        const monto = parseFloat(montoStr);
        
        if (desc !== '' || montoStr !== '') {
            if (desc === '') {
                alert('Falta la descripción en uno de los gastos.');
                return;
            }
            if (isNaN(monto) || monto <= 0) {
                alert('El monto ingresado no es válido: ' + desc);
                return;
            }
            gastosArr.push({ descripcion: desc, monto: monto });
        }
    }
    
    let confirmarMsg = `¿Estás seguro de registrar ${gastosArr.length} gasto(s) por un total de ${document.getElementById('gastos-total-preview').innerText}?`;
    if (gastosArr.length === 0) {
        confirmarMsg = 'No has ingresado ningún gasto válido. Si continúas, se borrarán los gastos de esta sesión. ¿Deseas continuar?';
    }
    
    const confirmar = confirm(confirmarMsg);
    if (!confirmar) return;
    
    try {
        const res = await window.posAPI.registrarGastos(gastosArr);
        if (res.success) {
            alert('Gastos registrados correctamente. Estos se reflejarán en tu Corte Z y Dashboard.');
            document.getElementById('modal-gastos').classList.add('hidden');
        } else {
            alert('Error al registrar gastos: ' + res.error);
        }
    } catch (e) {
        console.error(e);
        alert('Error inesperado al registrar gastos.');
    }
};;

// --- AUTOCOMPLETE CLIENTES ---
document.addEventListener('modalsReady', () => {
    const inputCliente = document.getElementById('bill-cliente');
    const inputNit = document.getElementById('bill-nit');
    const container = document.getElementById('client-suggestions');
    if(!inputCliente || !inputNit || !container) return;

    let debounceTimer = null;

    const handleInput = (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value.trim();
        if(val.length < 2) {
            container.classList.add('hidden');
            return;
        }
        debounceTimer = setTimeout(async () => {
            const results = await window.posAPI.buscarCliente(val);
            if(results && results.length > 0) {
                container.innerHTML = results.map(r => 
                    `<div class="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors border-b last:border-b-0" onclick="seleccionarCliente('${r.NIT}', '${r.Nombre.replace(/'/g, "\\'")}')">
                        <span class="font-bold text-xs uppercase text-slate-700">${r.Nombre}</span>
                        <span class="text-[10px] text-blue-600 font-black">${r.NIT}</span>
                    </div>`
                ).join('');
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }, 200);
    };

    inputCliente.addEventListener('input', handleInput);
    inputNit.addEventListener('input', handleInput);

    window.seleccionarCliente = (nit, nombre) => {
        inputNit.value = nit;
        inputCliente.value = nombre;
        container.classList.add('hidden');
    };

    document.addEventListener('click', (e) => {
        if(!inputCliente.contains(e.target) && !inputNit.contains(e.target) && !container.contains(e.target)){
            container.classList.add('hidden');
        }
    });
});




window.toggleModosVenta = function toggleModosVenta(modo) {
                            const chkCot = document.getElementById('toggle-cotizacion');
                            const chkPed = document.getElementById('toggle-pedido');
                            const btn = document.getElementById('btn-cobrar-principal');
                            const bannerPed = document.getElementById('banner-modo-pedido');

                            if (modo === 'cotizacion' && chkCot.checked) chkPed.checked = false;
                            if (modo === 'pedido' && chkPed.checked) chkCot.checked = false;

                            const isCotizacion = chkCot.checked;
                            const isPedido = chkPed.checked;

                            // Limpiar clases
                            btn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-orange-500', 'hover:bg-orange-600', 'bg-purple-600', 'hover:bg-purple-700');

                            if (isCotizacion) {
                                btn.innerText = 'COTIZAR (F12)';
                                btn.classList.add('bg-orange-500', 'hover:bg-orange-600');
                                bannerPed.classList.add('hidden');
                            } else if (isPedido) {
                                btn.innerText = 'GENERAR PEDIDO (F12)';
                                btn.classList.add('bg-purple-600', 'hover:bg-purple-700');
                                bannerPed.classList.remove('hidden');
                            } else {
                                btn.innerText = 'COBRAR (F12)';
                                btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                                bannerPed.classList.add('hidden');
                            }
                        };
