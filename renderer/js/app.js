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
// -----------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
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
    const statusInd = document.getElementById('status-indicator');

    if (statusInd) {
      statusInd.innerHTML = '<i class="fas fa-database text-green-500"></i> SQLITE LOCAL CONECTADO';
      statusInd.className = "text-[10px] font-bold text-green-600 flex items-center gap-1";
    }

    if (config.onboarding_completado !== '1') {
      abrirModalOnboarding();
    } else {
      aplicarMarcaBlanca(config);
      aplicarEstilosImpresion(config.ticket_size || '80mm');
      
      // Populate the onboarding settings modal with saved values in case it's opened again
      document.getElementById('onboard-nombre').value = config.nombre_negocio || '';
      document.getElementById('onboard-tipo').value = config.tipo_negocio || '';
      document.getElementById('onboard-logo').value = config.logotipo || '';
      document.getElementById('onboard-slogan').value = config.slogan || '';
      document.getElementById('onboard-whatsapp').value = config.whatsapp || '';
      document.getElementById('onboard-footer').value = config.mensaje_final || '';
      const sizeSelect = document.getElementById('onboard-ticket-size');
      if (sizeSelect && config.ticket_size) sizeSelect.value = config.ticket_size;
    }
  } catch (err) {
    console.error("Error al obtener configuración:", err);
  }
}

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
    let areaW = '72mm';
    let fontSize = '11px';

    if (size === '58mm') {
        pageW = '58mm';
        areaW = '48mm';
        fontSize = '10px';
    } else if (size === '80mm') {
        pageW = '80mm';
        areaW = '72mm';
        fontSize = '12px';
    } else if (size === 'carta') {
        pageW = '215.9mm';
        areaW = '195mm';
        fontSize = '14px';
    } else if (size === 'a4') {
        pageW = '210mm';
        areaW = '190mm';
        fontSize = '14px';
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

function abrirModalOnboarding() {
  const modal = document.getElementById('modal-onboarding');
  if (modal) modal.classList.remove('hidden');
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
  const whatsapp = document.getElementById('onboard-whatsapp').value.trim();
  const footer = document.getElementById('onboard-footer').value.trim();
  const ticketSize = document.getElementById('onboard-ticket-size').value;
  const printer = document.getElementById('onboard-printer') ? document.getElementById('onboard-printer').value : '';

  await window.posAPI.saveConfig('nombre_negocio', nombre);
  await window.posAPI.saveConfig('tipo_negocio', tipo);
  await window.posAPI.saveConfig('logotipo', logo);
  await window.posAPI.saveConfig('slogan', slogan);
  await window.posAPI.saveConfig('whatsapp', whatsapp);
  await window.posAPI.saveConfig('mensaje_final', footer);
  await window.posAPI.saveConfig('ticket_size', ticketSize);
  await window.posAPI.saveConfig('impresora_seleccionada', printer);
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
    const frecuentesBtns = botones.filter(b => b.bloque === 'FRECUENTES');

    // 1. Renderizar Zona de Ráfaga Dinámica
    if (containerRafaga && rafagaBtns.length > 0) {
      let htmlRafaga = '';
      for (let i = 0; i < rafagaBtns.length; i += 2) {
        const b1 = rafagaBtns[i];
        const b2 = rafagaBtns[i + 1];

        htmlRafaga += `<div class="flex h-28 rounded-2xl overflow-hidden shadow-lg border-2 border-white">`;

        // Botón 1 del Par
        const bg1 = b1.color && b1.color.toUpperCase() !== '#FFFFFF' ? `style="background-color:${b1.color};color:#ffffff;"` : 'class="bg-white"';
        const text1 = b1.color && b1.color.toUpperCase() !== '#FFFFFF' ? 'text-white' : 'text-slate-500';
        const icon1 = b1.icono ? `<i class="${b1.icono} text-3xl mb-1"></i>` : `<i class="fas fa-bolt text-3xl mb-1 text-amber-500"></i>`;
        
        htmlRafaga += `
            <button onmousedown="startTimer(${argumentoInline(b1.label)}, ${argumentoInline(b1.label)}, ${b1.precio_base}, ${argumentoInline(b1.codigo_prod)}, ${argumentoInline(b1.id)})" 
              onmouseup="endTimer(${argumentoInline(b1.label)}, ${argumentoInline(b1.label)}, ${b1.precio_base}, ${argumentoInline(b1.codigo_prod)})" 
                  class="btn-fast w-1/2 flex flex-col items-center justify-center border-r border-slate-200" ${bg1}>
              ${icon1}
              <span class="text-[10px] font-bold ${text1} uppercase">${escaparHtml(b1.label)}</span>
              <span class="text-[9px] font-black text-blue-500">Q${parseFloat(b1.precio_base).toFixed(2)}</span>
          </button>
        `;

        // Botón 2 del Par (Si existe)
        if (b2) {
          const bg2 = b2.color && b2.color.toUpperCase() !== '#FFFFFF' ? `style="background-color:${b2.color};color:#ffffff;"` : 'class="bg-white"';
          const text2 = b2.color && b2.color.toUpperCase() !== '#FFFFFF' ? 'text-white' : 'text-slate-500';
          const icon2 = b2.icono ? `<i class="${b2.icono} text-3xl mb-1"></i>` : `<i class="fas fa-layer-group text-3xl mb-1 text-blue-500"></i>`;

          htmlRafaga += `
                <button onmousedown="startTimer(${argumentoInline(b2.label)}, ${argumentoInline(b2.label)}, ${b2.precio_base}, ${argumentoInline(b2.codigo_prod)}, ${argumentoInline(b2.id)})" 
                  onmouseup="endTimer(${argumentoInline(b2.label)}, ${argumentoInline(b2.label)}, ${b2.precio_base}, ${argumentoInline(b2.codigo_prod)})" 
                    class="btn-fast w-1/2 flex flex-col items-center justify-center" ${bg2}>
                ${icon2}
                <span class="text-[10px] font-bold ${text2} uppercase">${escaparHtml(b2.label)}</span>
                <span class="text-[9px] font-black text-blue-500">Q${parseFloat(b2.precio_base).toFixed(2)}</span>
            </button>
          `;
        }

        htmlRafaga += `</div>`;
      }
      containerRafaga.innerHTML = htmlRafaga;
    }

    // 2. Renderizar Servicios Frecuentes Dinámicos
    if (containerFrecuentes && frecuentesBtns.length > 0) {
      containerFrecuentes.innerHTML = frecuentesBtns.map(b => {
        const esDark = b.color && b.color.toUpperCase() !== '#FFFFFF';
        const bgAttr = esDark ? `style="background-color:${b.color};color:#ffffff;"` : 'class="bg-white hover:bg-slate-50"';
        const textClass = esDark ? 'text-white font-black' : 'text-gray-700 font-bold';
        const iconHtml = b.icono ? `<i class="${b.icono} ${esDark ? 'text-white' : 'text-blue-500'} mt-1 text-lg"></i>` : '';

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
                  class="btn-fast h-20 rounded-xl shadow-md border-b-4 border-blue-500 text-xs uppercase flex flex-col items-center justify-center p-2 transition-all active:scale-95">
              <span class="${textClass}">${escaparHtml(b.label)}</span>
              ${iconHtml}
              ${b.precio_base > 0 ? `<span class="text-blue-500 text-[10px] font-extrabold mt-0.5">Q${parseFloat(b.precio_base).toFixed(2)}</span>` : ''}
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
      let submenusHTML = btn.submenus.map(sub => `
        <button onclick="seleccionarSubmenuItem(${argumentoInline(sub.label)}, ${sub.precio}, ${argumentoInline(sub.codigo_prod || btn.codigo_prod)}, ${argumentoInline(btn.categoria || btn.label)})"
          class="w-full bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-500 p-3 rounded-xl flex justify-between items-center transition-all">
          <span class="font-bold text-slate-800 text-xs uppercase">${escaparHtml(sub.label)}</span>
          <span class="font-black text-blue-600 text-sm">Q${parseFloat(sub.precio).toFixed(2)}</span>
        </button>
      `).join('');
      
      submenusHTML += `
        <button onclick="cerrarTodosModales(); openManualInput('full', ${argumentoInline(btn.categoria || btn.label)})"
          class="w-full bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-xl flex justify-center items-center transition-all mt-2 shadow-lg active:scale-95">
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
  
  addCartItem({
    codigo: codigo || 'GEN',
    descripcion: label,
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
    await addCartItem({
      codigo: currentItem.codigo_prod || 'SER-RAPIDO',
      descripcion: currentItem.label || currentItem.descripcion,
      cantidad: cant,
      precio_unitario: parseFloat(currentItem.precio_base || currentItem.precio_venta || 0),
      subtotal: cant * parseFloat(currentItem.precio_base || currentItem.precio_venta || 0),
      categoria: currentItem.categoria || currentItem.label || 'SERVICIOS'
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
          const cat = b.categoria || b.label;
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
      <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center mb-2">
        <div class="flex-1 mr-2">
          <p class="font-black text-slate-800 text-xs uppercase leading-tight">${item.descripcion}</p>
          <div class="flex gap-2 items-center mt-1">
            <span onclick="abrirEditarCantidad(${idx})" class="qty-editable text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Cant: ${item.cantidad}
            </span>
            <span onclick="abrirEditarPrecio(${idx})" class="qty-editable text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              @ Q${item.precio_unitario.toFixed(2)}
            </span>
          </div>
        </div>
        <div class="text-right">
          <p class="font-black text-blue-900 text-sm">Q${item.subtotal.toFixed(2)}</p>
          <button onclick="eliminarItemCarrito(${idx})" class="text-red-500 hover:text-red-700 text-xs font-bold mt-1">
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

function vaciarCarrito() {
  cart = [];
  renderCartUI();
}

/* -------------------------------------------------------------------------- */
/* 5. REGISTRO DE VENTA E IMPRESIÓN DE TICKET                                 */
/* -------------------------------------------------------------------------- */
async function procesarCobroVenta() {
  if (cart.length === 0) {
    alert("El carrito está vacío.");
    return;
  }

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
  const itemDescuento = cart.find(item => (item.descripcion || item.nombre) === 'DESCUENTO');
  const descuento = itemDescuento ? Math.abs(Number(itemDescuento.subtotal || 0)) : 0;

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
        metodo_pago: metodo_pago,
        detalles: cart
      };

      const res = await window.posAPI.crearPedido(pedidoPayload);
      if (res.success) {
        prepararTicket(res.id_pedido, res.fecha, res.hora, pedidoPayload.cliente, nit, cart, total, metodo_pago);
        document.getElementById('ticket-title-doc').innerText = `PEDIDO #${res.id_pedido}`;
        
        // Add Anticipo/Saldo to ticket
        const footerInfo = document.getElementById('ticket-footer-info');
        if (footerInfo) {
            footerInfo.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-top:5px; font-weight:bold; color:#000;">
                    <span>ANTICIPO:</span><span>Q${anticipo.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:5px; font-weight:900; font-size:16px; color:#000; padding-top:5px; border-top:2px dashed #000;">
                    <span>SALDO PENDIENTE:</span><span>Q${saldo.toFixed(2)}</span>
                </div>
                <div style="text-align:center; margin-top:10px; font-size:10px; font-weight:bold;">¡GUARDE ESTE COMPROBANTE!</div>
            `;
        }

        document.body.classList.add('printing-sales');
        await window.ejecutarImpresion();
        document.body.classList.remove('printing-sales');
      } else {
        alert("Error al crear pedido: " + res.error);
        return;
      }
    } else {
      const ventaPayload = {
        tipo_documento,
        cliente,
        nit,
        total,
        descuento,
        metodo_pago,
        terminal: 'CAJA-01',
        detalles: cart
      };

      const res = await window.posAPI.registrarVenta(ventaPayload);
      if (res.success) {
        if (tipo_documento === 'COTIZACION') {
          prepararCotizacionLetter(res.id_venta, res.fecha, res.hora, cliente, nit, cart, total, metodo_pago);
          const style = document.createElement('style');
          style.id = 'print-page-style';
          style.innerHTML = `@media print { @page { size: letter !important; margin: 15mm !important; } }`;
          document.head.appendChild(style);
          document.body.classList.add('printing-quotation');
          await window.ejecutarImpresion(true); 
          document.body.classList.remove('printing-quotation');
          document.head.removeChild(style);
        } else {
          // Preparar Ticket Térmico para Impresión
          prepararTicketTermico(res.id_venta, res.fecha, res.hora, cliente, nit, cart, total, metodo_pago, tipo_documento);
          
          // Imprimir
          document.body.classList.add('printing-sales');
          await window.ejecutarImpresion();
          document.body.classList.remove('printing-sales');
          
          if (typeof window.cargarTop20 === 'function') {
              await window.cargarTop20();
          }
        }
      }
    } // end else (no es pedido)

    // Limpiar Formulario y Carrito
    vaciarCarrito();
    if (clienteElem) clienteElem.value = '';
    if (nitElem) nitElem.value = '';
    if (document.getElementById('toggle-cotizacion')) {
        document.getElementById('toggle-cotizacion').checked = false;
    }
    if (document.getElementById('toggle-pedido')) {
        document.getElementById('toggle-pedido').checked = false;
    }
    if (typeof toggleModosVenta === 'function') toggleModosVenta('venta');
    
    // Restaurar footer original del ticket si fue modificado
    const footerInfo = document.getElementById('ticket-footer-info');
    if (footerInfo) footerInfo.innerHTML = '';
    window.datosPedidoTemp = null;

  } catch (err) {
    console.error("Error procesando cobro:", err);
    alert("Ocurrió un error al procesar el documento.");
  }
}

function prepararTicketTermico(idVenta, fecha, hora, cliente, nit, items, total, metodoPago, tipoDocumento = 'VENTA') {
  const dateElem = document.getElementById('print-date');
  const clientElem = document.getElementById('print-client-name');
  const nitPrintElem = document.getElementById('print-client-nit');
  const itemsContainer = document.getElementById('print-items-container');
  const totalPrintElem = document.getElementById('print-total-display');

  const documentTitle = tipoDocumento === 'COTIZACION' ? 'COTIZACIÓN' : 'TICKET';

  if (dateElem) dateElem.innerText = `${fecha} ${hora} | ${documentTitle} #${idVenta}`;
  if (clientElem) clientElem.innerText = `${cliente.toUpperCase()}`;
  if (nitPrintElem) nitPrintElem.innerText = `NIT: ${nit.toUpperCase()}`;
  if (totalPrintElem) totalPrintElem.innerText = `TOTAL: Q ${total.toFixed(2)} (${metodoPago})`;

  if (itemsContainer) {
    itemsContainer.innerHTML = items.map(i => {
      const n = (i.descripcion || i.nombre || '').toUpperCase();
      if (n === 'DESCUENTO') {
        return `
          <div class="print-item">
            <span class="item-name">- DESCUENTO</span>
            <span class="item-price">Q${Math.abs(Number(i.subtotal || 0)).toFixed(2)}</span>
          </div>
        `;
      }
      return `
        <div class="print-item">
          <span class="item-name">${i.cantidad}x ${n.substring(0, 20)}</span>
          <span class="item-price">Q${i.subtotal.toFixed(2)}</span>
        </div>
      `;
    }).join('');
  }
}

function prepararCotizacionLetter(idVenta, fecha, hora, cliente, nit, items, total, metodoPago) {
  const idElem = document.getElementById('q-print-id');
  const dateElem = document.getElementById('q-print-date');
  const clientElem = document.getElementById('q-print-client');
  const nitPrintElem = document.getElementById('q-print-nit');
  const itemsContainer = document.getElementById('q-print-items-container');
  const totalPrintElem = document.getElementById('q-print-total');
  const userElem = document.getElementById('q-print-user');
  const qLogoImg = document.getElementById('q-print-logo-img');
  const logoImg = document.getElementById('print-logo-img');

  if (idElem) idElem.innerText = idVenta;
  if (dateElem) dateElem.innerText = `${fecha} ${hora}`;
  if (clientElem) clientElem.innerText = `${cliente.toUpperCase()}`;
  if (nitPrintElem) nitPrintElem.innerText = `${nit.toUpperCase()}`;
  if (totalPrintElem) totalPrintElem.innerText = `${total.toFixed(2)}`;

  if (userElem) {
      const currentUser = localStorage.getItem('currentUser') || 'Administrador';
      userElem.innerText = currentUser.toUpperCase();
  }

  if (qLogoImg && logoImg) {
      qLogoImg.src = logoImg.src;
      qLogoImg.style.display = logoImg.style.display;
  }

  if (itemsContainer) {
    itemsContainer.innerHTML = items.map(i => {
      const n = (i.descripcion || i.nombre || '').toUpperCase();
      if (n === 'DESCUENTO') {
        return `
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">1</td>
            <td style="border: 1px solid #ccc; padding: 8px;">- DESCUENTO</td>
            <td style="border: 1px solid #ccc; padding: 8px;"></td>
            <td style="border: 1px solid #ccc; padding: 8px;">Q${Math.abs(Number(i.subtotal || 0)).toFixed(2)}</td>
          </tr>
        `;
      }
      const pUnitario = i.subtotal / i.cantidad;
      return `
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">${i.cantidad}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${n}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">Q${pUnitario.toFixed(2)}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">Q${i.subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');
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

/* -------------------------------------------------------------------------- */
/* 7. CORTE Z & REPORTES DE CAJA                                              */
/* -------------------------------------------------------------------------- */
async function abrirCorteZModal() {
  try {
    const data = await window.posAPI.generarCorteZ();
    const formatearFechaHora = valor => valor ? new Date(valor).toLocaleString('es-GT') : '--';
    
    
    // PREPARAR DATOS PARA EL TICKET IMPRESO (Z)
    document.getElementById('z-print-date').innerText = new Date().toLocaleString();
    document.getElementById('z-print-range').innerText = `Turno: ${formatearFechaHora(data.desde)} a ${formatearFechaHora(data.hasta)}`;
    document.getElementById('z-count').innerText = data.total_ventas;
    
    // El reporte de impresión también debe mostrar el total SQL de la sesión.
    document.getElementById('z-total').innerText = Number(data.gran_total || 0).toFixed(2);
    document.getElementById('z-cash-total').innerText = Number(data.total_efectivo || 0).toFixed(2);
    document.getElementById('z-noncash-total').innerText = Number(data.total_no_efectivo || 0).toFixed(2);
    document.getElementById('z-third-party-total').innerText = Number(data.total_terceros || 0).toFixed(2);
    const currentUser = localStorage.getItem('currentUser') || "DESCONOCIDO";
    document.getElementById('z-print-user').innerText = 'Usuario: ' + currentUser;
    document.getElementById('z-print-business').innerText = window.POS_CONFIG?.businessName || "INCO";
    
    const printContainer = document.getElementById('z-details-container');
    printContainer.innerHTML = data.por_categoria.length > 0
      ? data.por_categoria.map(c => `<div class="report-row"><span>${c.Categoria || c.categoria}</span><span>Q ${parseFloat(c.total || 0).toFixed(2)}</span></div>`).join('')
      : `<div class="report-row"><span style="font-size:10px; color:#666;">Sin ventas registradas</span></div>`;

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
          <div class="flex justify-between border-b pb-2"><span class="font-bold text-slate-500 uppercase">Turno desde:</span><span class="font-black text-slate-800">${formatearFechaHora(data.desde)}</span></div>
          <div class="flex justify-between border-b pb-2"><span class="font-bold text-slate-500 uppercase">Turno hasta:</span><span class="font-black text-slate-800">${formatearFechaHora(data.hasta)}</span></div>
          <div class="flex justify-between bg-amber-50 p-3 rounded-xl border border-amber-200"><span class="font-black text-amber-900 uppercase text-sm">Pagos de terceros:</span><span class="font-black text-amber-900 text-lg">Q ${Number(data.total_terceros || 0).toFixed(2)}</span></div>
          <p class="text-[10px] font-bold text-slate-400 uppercase text-center">Corte a ciegas para colaborador</p>
        </div>`;
      const modalCiego = document.getElementById('modal-corte-z');
      if (modalCiego) modalCiego.classList.remove('hidden');
      return;
    }


    let html = `
      <div class="space-y-3 text-xs">
        <div class="flex justify-between border-b pb-2">
          <span class="font-bold text-slate-500 uppercase">Turno desde:</span>
          <span class="font-black text-slate-800">${formatearFechaHora(data.desde)}</span>
        </div>
        <div class="flex justify-between border-b pb-2">
          <span class="font-bold text-slate-500 uppercase">Turno hasta:</span>
          <span class="font-black text-slate-800">${formatearFechaHora(data.hasta)}</span>
        </div>
        <div class="flex justify-between border-b pb-2">
          <span class="font-bold text-slate-500 uppercase">Fecha:</span>
          <span class="font-black text-slate-800">${data.fecha}</span>
        </div>
        <div class="flex justify-between border-b pb-2">
          <span class="font-bold text-slate-500 uppercase">Ventas Totales:</span>
          <span class="font-black text-slate-800">${data.total_ventas} transacciones</span>
        </div>
        <div class="flex justify-between bg-blue-50 p-3 rounded-xl border border-blue-200">
          <span class="font-black text-blue-900 uppercase text-sm">Gran Total del Día:</span>
          <span class="font-black text-blue-900 text-lg">Q ${data.gran_total.toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
          <span class="font-black text-emerald-900 uppercase text-sm">Efectivo esperado:</span>
          <span class="font-black text-emerald-900 text-lg">Q ${Number(data.total_efectivo || 0).toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-slate-50 p-3 rounded-xl border">
          <span class="font-black text-slate-700 uppercase text-sm">Pagos no efectivos:</span>
          <span class="font-black text-slate-700 text-lg">Q ${Number(data.total_no_efectivo || 0).toFixed(2)}</span>
        </div>

        <h4 class="font-black text-slate-700 uppercase mt-4 text-[11px]">Por Método de Pago</h4>
        <div class="bg-slate-50 p-3 rounded-xl border space-y-1">
          ${data.por_metodo.map(m => `
            <div class="flex justify-between">
              <span class="font-bold text-slate-600">${m.metodo_pago}:</span>
              <span class="font-black text-slate-800">Q ${parseFloat(m.total).toFixed(2)} (${m.cantidad})</span>
            </div>
          `).join('')}
        </div>

        <h4 class="font-black text-slate-700 uppercase mt-4 text-[11px]">Por Categorías</h4>
        <div class="bg-slate-50 p-3 rounded-xl border space-y-1">
          ${data.por_categoria.map(c => `
            <div class="flex justify-between">
              <span class="font-bold text-slate-600">${c.Categoria || c.categoria}:</span>
              <span class="font-black text-slate-800">Q ${parseFloat(c.total).toFixed(2)} (${c.cantidad} uds)</span>
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
            <button onclick="cerrarTodosModales()" class="bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-xl font-bold text-sm uppercase transition-colors">Cerrar Preview</button>
            <button onclick="imprimirZ()" class="bg-slate-800 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm uppercase shadow-md transition-all">🖨️ Imprimir (Sin Cerrar)</button>
            <button onclick="cerrarTurnoZ()" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm uppercase shadow-md transition-all ml-2">Cerrar Turno</button>
        `;
    }
    
    const modalZ = document.getElementById('modal-corte-z');
    if (modalZ) modalZ.classList.remove('hidden');


    const modal = document.getElementById('modal-corte-z');
    if (modal) modal.classList.remove('hidden');
  } catch (err) {
    alert("Error al generar Corte Z: " + err.message);
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
      alert(res.mensaje);
    } catch (err) {
      alert("Error al anular ticket: " + err.message);
    }
  });
}

async function abrirHistorialTickets() {
  const modal = document.getElementById('modal-historial-tickets');
  const container = document.getElementById('historial-tickets-list');
  if (!modal || !container) return;
  modal.classList.remove('hidden');
  container.innerHTML = '<p class="text-center text-slate-400 font-bold text-sm p-8">Cargando tickets desde SQLite...</p>';
  const tickets = await window.posAPI.obtenerHistorialTickets();
  if (!tickets.length) {
    container.innerHTML = '<p class="text-center text-slate-400 font-bold text-sm p-8">No hay tickets registrados.</p>';
    return;
  }
  container.innerHTML = tickets.map(ticket => {
    const anulable = ticket.estado === 'COMPLETADO';
    return `<div class="border rounded-xl p-3 bg-slate-50">
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <div class="flex items-center gap-3">
          <span class="font-black text-blue-900">#${ticket.id}</span>
          <span class="text-xs font-bold text-slate-500">${ticket.fecha} ${ticket.hora}</span>
          <span class="text-[10px] font-black uppercase px-2 py-1 rounded ${anulable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${ticket.estado}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-slate-600">${ticket.metodo_pago || 'EFECTIVO'}</span>
          <span class="font-black text-slate-900">Q${Number(ticket.total || 0).toFixed(2)}</span>
          ${Number(ticket.descuento || 0) > 0 ? `<span class="text-[10px] font-bold text-red-600">Desc. Q${Number(ticket.descuento).toFixed(2)}</span>` : ''}
          <button onclick="verDetalleTicket(${ticket.id})" class="text-blue-600 hover:text-blue-800 text-xs font-black uppercase"><i class="fas fa-eye mr-1"></i>Ver</button>
          ${anulable ? `<button onclick="anularTicketDesdeHistorial(${ticket.id})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase"><i class="fas fa-undo mr-1"></i>Anular ticket</button>` : ''}
        </div>
      </div>
      <div id="detalle-ticket-${ticket.id}" class="hidden mt-3 pt-3 border-t text-xs"></div>
    </div>`;
  }).join('');
}

async function verDetalleTicket(idTicket) {
  const detail = document.getElementById(`detalle-ticket-${idTicket}`);
  if (!detail) return;
  if (!detail.classList.contains('hidden')) {
    detail.classList.add('hidden');
    return;
  }
  const items = await window.posAPI.obtenerDetalleTicket(idTicket);
  detail.innerHTML = items.map(item => `<div class="flex justify-between py-1"><span>${item.cantidad}x ${item.descripcion}</span><span class="font-bold">Q${Number(item.subtotal || 0).toFixed(2)}</span></div>`).join('') || '<span class="text-slate-400">Sin detalle.</span>';
  detail.classList.remove('hidden');
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
    alert(resultado.mensaje);
    await abrirHistorialTickets();
  });
}

/* -------------------------------------------------------------------------- */
/* 9. UTILIDADES Y GESTIÓN DE MODALES                                        */
/* -------------------------------------------------------------------------- */

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
                    <span class="text-xs font-black text-slate-400 group-hover:text-purple-500">Q</span>
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
                    return new Date(cell.getValue()).toLocaleString();
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
    const tabs = ['ventas', 'tecnico', 'inv-sala', 'inv-bodega', 'etiquetas'];
    
    // Ocultar todas las secciones principales
    const v = document.getElementById('content-ventas'); if(v) v.classList.add('hidden');
    const tec = document.getElementById('content-tecnico'); if(tec) tec.classList.add('hidden');
    const invSala = document.getElementById('content-inv-sala'); if(invSala) invSala.classList.add('hidden');
    const invBodega = document.getElementById('content-inv-bodega'); if(invBodega) invBodega.classList.add('hidden');
    const etiquetas = document.getElementById('content-etiquetas'); if(etiquetas) etiquetas.classList.add('hidden');

    // Desactivar todos los botones
    tabs.forEach(tab => {
        const btn = document.getElementById('tab-' + tab);
        if (btn) btn.className = 'px-8 py-3 font-black text-xs tracking-widest text-gray-400 hover:bg-gray-50 uppercase transition-colors border-r';
    });

    // Activar botón seleccionado
    const activeBtn = document.getElementById('tab-' + t);
    if (activeBtn) activeBtn.className = 'px-8 py-3 font-black text-xs tracking-widest tab-active uppercase transition-colors border-r';

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
    }
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
                {title: 'STOCK SALA', field: 'Stock', hozAlign: 'center', width: 120, formatter: (cell) => `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">${cell.getValue()}</span>`},
                {title: 'ACCIONES', formatter: actionFormatterSala, hozAlign: 'center', headerSort: false, width: 150}
            ],
        });
        
        tableSala.on("rowClick", function(e, row) {
            // Prevenir que se active al hacer clic en un botón de acción (o en sus iconos)
            if (!e.target.closest('button')) {
                window.editSala(row.getData().Codigo);
                // Hacer scroll suave hacia arriba para ver el formulario
                document.getElementById('form-container-sala').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        
        const searchInput = document.getElementById('inv-sala-search');
        if(searchInput) {
            searchInput.addEventListener('input', function(e) {
                tableSala.setFilter([
                    [{field:"Codigo", type:"like", value:this.value}, {field:"Descripcion", type:"like", value:this.value}]
                ]);
            });
        }
    } else {
        tableSala.setData(data);
    }
}

function actionFormatterSala(cell, formatterParams, onRendered) {
    return `<button class="text-blue-500 hover:text-blue-700 mr-3" onclick="editSala('${cell.getRow().getData().Codigo}')" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="text-green-600 hover:text-green-800 mr-3" onclick="movimientoSala('${cell.getRow().getData().Codigo}', 'ENTRADA')" title="Dar de Entrada Manual"><i class="fas fa-box-open mr-1"></i>Entrada</button>
            <button class="text-red-500 hover:text-red-700" onclick="movimientoSala('${cell.getRow().getData().Codigo}', 'SALIDA')" title="Ajuste / Merma"><i class="fas fa-dolly mr-1"></i>Ajuste</button>`;
}

window.verificarCodigoGlobal = async function(contexto) {
    const inputId = contexto === 'SALA' ? 'inv-sala-codigo' : 'inv-bodega-codigo';
    const codigo = document.getElementById(inputId).value.trim();
    
    if (!codigo) return;
    
    try {
        const res = await window.posAPI.buscarProductoGlobal(codigo);
        
        if (contexto === 'SALA') {
            if (res.sala) {
                // Producto ya existe en Sala -> Editar
                editSala(codigo);
            } else if (res.bodega) {
                // Producto existe en Bodega pero NO en Sala -> Autocompletar para Sala
                document.getElementById('inv-sala-desc').value = res.bodega.Descripcion;
                document.getElementById('inv-sala-cat').value = res.bodega.Categoria;
                document.getElementById('inv-sala-costo').value = res.bodega.Costo_Adquisicion;
                document.getElementById('inv-sala-precio').value = res.bodega.Precio_Venta; // Sugerencia de precio
                
                // Efecto visual sutil de auto-fill
                const form = document.getElementById('form-container-sala');
                form.classList.add('bg-green-50');
                setTimeout(() => form.classList.remove('bg-green-50'), 1000);
            }
        } else if (contexto === 'BODEGA') {
            if (res.bodega) {
                // Producto ya existe en Bodega -> Editar
                editBodega(codigo);
            } else if (res.sala) {
                // Producto existe en Sala pero NO en Bodega -> Autocompletar para Bodega
                document.getElementById('inv-bodega-desc').value = res.sala.Descripcion;
                document.getElementById('inv-bodega-cat').value = res.sala.Categoria;
                document.getElementById('inv-bodega-costo').value = res.sala.Costo_Adquisicion;
                document.getElementById('inv-bodega-precio').value = res.sala.Precio_Venta; // Sugerencia de precio
                
                // Efecto visual sutil de auto-fill
                const form = document.getElementById('form-container-bodega');
                form.classList.add('bg-green-50');
                setTimeout(() => form.classList.remove('bg-green-50'), 1000);
            }
        }
    } catch (err) {
        console.error("Error al verificar código global:", err);
    }
};

window.editSala = function(codigo) {
    const role = document.getElementById('ui-current-role') ? document.getElementById('ui-current-role').innerText : 'Cajero';
    if (role !== 'Administrador' && typeof requestAdminPassword === 'function') {
        requestAdminPassword(() => { window._ejecutarEditSala(codigo); });
    } else if (role === 'Administrador') {
        window._ejecutarEditSala(codigo);
    } else {
        alert('Se requieren permisos de administrador para editar.');
    }
};

window._ejecutarEditSala = function(codigo) {
    const row = tableSala.getRow(codigo).getData();
    document.getElementById('inv-sala-codigo').value = row.Codigo;
    document.getElementById('inv-sala-desc').value = row.Descripcion;
    document.getElementById('inv-sala-cat').value = row.Categoria;
    document.getElementById('inv-sala-costo').value = row.Costo_Adquisicion;
    document.getElementById('inv-sala-precio').value = row.Precio_Venta;
    
    // Configurar modo edición
    document.getElementById('inv-sala-codigo').readOnly = true;
    document.getElementById('inv-sala-desc').readOnly = true;
    document.getElementById('inv-sala-cat').readOnly = true;
    document.getElementById('inv-sala-stock-container').classList.add('hidden');
    document.getElementById('btn-delete-sala').classList.remove('hidden');
    
    document.getElementById('edit-indicator-sala-code').innerText = row.Codigo;
    document.getElementById('edit-indicator-sala').classList.remove('hidden');
    document.getElementById('form-container-sala').classList.add('border-2', 'border-blue-500');
    document.getElementById('form-title-sala').innerText = 'Editar Producto en Sala';
    document.getElementById('btn-save-sala').innerHTML = '<i class="fas fa-sync"></i> Actualizar Producto';
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
    document.getElementById('inv-sala-stock-container').classList.remove('hidden');
    document.getElementById('btn-delete-sala').classList.add('hidden');
    
    document.getElementById('edit-indicator-sala').classList.add('hidden');
    document.getElementById('form-container-sala').classList.remove('border-2', 'border-blue-500');
    document.getElementById('form-title-sala').innerText = 'Agregar / Editar Producto en Sala';
    document.getElementById('btn-save-sala').innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
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

    if (!payload.codigo || !payload.descripcion) {
        alert('Código y Descripción son obligatorios.');
        return;
    }

    const res = await window.posAPI.guardarProducto(payload);
    if (res.success) {
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
                {title: 'STOCK BODEGA', field: 'Stock', hozAlign: 'center', width: 130, formatter: (cell) => `<span class="px-2 py-1 bg-orange-100 text-orange-800 rounded font-bold">${cell.getValue()}</span>`},
                {title: 'ACCIONES', formatter: actionFormatterBodega, hozAlign: 'center', headerSort: false, width: 150}
            ],
        });
        
        tableBodega.on("rowClick", function(e, row) {
            // Prevenir que se active al hacer clic en un botón de acción
            if (!e.target.closest('button')) {
                window.editBodega(row.getData().Codigo);
                // Hacer scroll suave hacia arriba
                document.getElementById('form-container-bodega').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        
        const searchInput = document.getElementById('inv-bodega-search');
        if(searchInput) {
            searchInput.addEventListener('input', function(e) {
                tableBodega.setFilter([
                    [{field:"Codigo", type:"like", value:this.value}, {field:"Descripcion", type:"like", value:this.value}]
                ]);
            });
        }
    } else {
        tableBodega.setData(data);
    }
}

function actionFormatterBodega(cell, formatterParams, onRendered) {
    return `<button class="text-blue-500 hover:text-blue-700 mr-3" onclick="editBodega('${cell.getRow().getData().Codigo}')" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="text-green-600 hover:text-green-800 mr-3" onclick="movimientoBodega('${cell.getRow().getData().Codigo}', 'ENTRADA')" title="Dar de Entrada Manual"><i class="fas fa-box-open mr-1"></i>Entrada</button>
            <button class="text-red-500 hover:text-red-700" onclick="movimientoBodega('${cell.getRow().getData().Codigo}', 'SALIDA')" title="Ajuste / Merma / Salida"><i class="fas fa-dolly mr-1"></i>Salida/Ajuste</button>`;
}

window.editBodega = function(codigo) {
    const role = document.getElementById('ui-current-role') ? document.getElementById('ui-current-role').innerText : 'Cajero';
    if (role !== 'Administrador' && typeof requestAdminPassword === 'function') {
        requestAdminPassword(() => { window._ejecutarEditBodega(codigo); });
    } else if (role === 'Administrador') {
        window._ejecutarEditBodega(codigo);
    } else {
        alert('Se requieren permisos de administrador para editar.');
    }
};

window._ejecutarEditBodega = function(codigo) {
    const row = tableBodega.getRow(codigo).getData();
    document.getElementById('inv-bodega-codigo').value = row.Codigo;
    document.getElementById('inv-bodega-desc').value = row.Descripcion;
    document.getElementById('inv-bodega-pres').value = row.Presentacion;
    document.getElementById('inv-bodega-cat').value = row.Categoria;
    document.getElementById('inv-bodega-costo').value = row.Costo_Adquisicion;
    document.getElementById('inv-bodega-precio').value = row.Precio_Venta;
    
    // Configurar modo edición
    document.getElementById('inv-bodega-codigo').readOnly = true;
    document.getElementById('inv-bodega-desc').readOnly = true;
    document.getElementById('inv-bodega-cat').readOnly = true;
    document.getElementById('inv-bodega-pres').readOnly = true;
    document.getElementById('inv-bodega-stock-container').classList.add('hidden');
    document.getElementById('btn-delete-bodega').classList.remove('hidden');
    
    document.getElementById('edit-indicator-bodega-code').innerText = row.Codigo;
    document.getElementById('edit-indicator-bodega').classList.remove('hidden');
    document.getElementById('form-container-bodega').classList.add('border-2', 'border-orange-500');
    document.getElementById('form-title-bodega').innerText = 'Editar Producto en Bodega';
    document.getElementById('btn-save-bodega').innerHTML = '<i class="fas fa-sync"></i> Actualizar Producto';
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
    document.getElementById('inv-bodega-stock-container').classList.remove('hidden');
    document.getElementById('btn-delete-bodega').classList.add('hidden');
    
    document.getElementById('edit-indicator-bodega').classList.add('hidden');
    document.getElementById('form-container-bodega').classList.remove('border-2', 'border-orange-500');
    document.getElementById('form-title-bodega').innerText = 'Agregar / Editar Producto en Bodega';
    document.getElementById('btn-save-bodega').innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
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

    if (!payload.codigo || !payload.descripcion) {
        alert('Código y Descripción son obligatorios.');
        return;
    }

    const res = await window.posAPI.guardarProducto(payload);
    if (res.success) {
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
        imprimirZ(); // Imprimimos primero
        try {
            const resultadoCierre = await window.posAPI.cerrarTurno(currentZSessionId);
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

window.imprimirZ = async function() {
    document.body.classList.remove('printing-sales', 'printing-tech');
    document.body.classList.add('printing-report');
    await window.ejecutarImpresion(true);
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

window.ejecutarImpresion = async function(forcePrint = false) {
    if (!forcePrint) {
        const checkbox = document.getElementById('cobro-imprimir-ticket');
        // Si el checkbox existe y NO está marcado, abortamos la impresión
        if (checkbox && !checkbox.checked) return;
        
        // Si el checkbox no está en el DOM en este momento, leer de localStorage como fallback para ventas
        if (!checkbox) {
            const val = localStorage.getItem('imprimir_ticket');
            if (val === 'false') return;
        }
    }

    try {
        const config = await window.posAPI.getConfig();
        if (config.impresora_seleccionada && config.impresora_seleccionada !== '') {
            // Dar tiempo al DOM para renderizar
            await new Promise(resolve => setTimeout(resolve, 100));
            const res = await window.posAPI.printSilent(config.impresora_seleccionada);
            if (!res.success) {
                console.error("Error en impresión silenciosa:", res.error);
                window.print(); // Fallback
            }
        } else {
            window.print();
        }
    } catch (e) {
        console.error("Error en ejecutarImpresion:", e);
        window.print();
    }
};

let top20HoldTimer = null;
window.cargarTop20 = async function() {
    if (!window.posAPI || !window.posAPI.obtenerTop20) return;
    const container = document.getElementById('top20-container');
    if (!container) return;

    try {
        const top20 = await window.posAPI.obtenerTop20();
        container.innerHTML = '';
        if (top20.length === 0) {
            container.innerHTML = '<p class="text-[10px] text-slate-400 font-bold uppercase italic p-2">Aún no hay suficientes ventas.</p>';
            return;
        }

        top20.forEach(prod => {
            const btn = document.createElement('button');
            btn.className = "flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm shrink-0 snap-start active:scale-95";
            btn.style.width = '100px';
            btn.style.height = '100px';

            const iconContainer = document.createElement('div');
            iconContainer.className = "text-xl text-blue-500 mb-1 flex items-center justify-center bg-blue-50 w-10 h-10 rounded-full";
            iconContainer.innerHTML = '<i class="fas fa-star text-sm"></i>';

            const labelDesc = document.createElement('p');
            labelDesc.className = "text-[10px] font-black text-slate-700 leading-tight truncate w-full uppercase text-center mt-1";
            labelDesc.innerText = prod.Descripcion;

            const labelPrice = document.createElement('p');
            labelPrice.className = "text-[9px] font-bold text-blue-600 mt-1 uppercase";
            labelPrice.innerText = `Q${parseFloat(prod.Precio_Venta).toFixed(2)}`;

            btn.appendChild(iconContainer);
            btn.appendChild(labelDesc);
            btn.appendChild(labelPrice);

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
                    if (typeof window.addCartItem === 'function') {
                        window.addCartItem({
                            codigo: prod.Codigo,
                            descripcion: prod.Descripcion,
                            cantidad: 1,
                            precio_unitario: Number(prod.Precio_Venta) || 0,
                            subtotal: Number(prod.Precio_Venta) || 0,
                            categoria: prod.Categoria || 'GENERAL'
                        });
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
                    if (typeof window.addCartItem === 'function') {
                        window.addCartItem({
                            codigo: prod.Codigo,
                            descripcion: prod.Descripcion,
                            cantidad: 1,
                            precio_unitario: Number(prod.Precio_Venta) || 0,
                            subtotal: Number(prod.Precio_Venta) || 0,
                            categoria: prod.Categoria || 'GENERAL'
                        });
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

    let modoInput = prompt(`Vas a importar un archivo Excel a la base de datos de ${contexto}.\n\nSi un código de producto del Excel YA EXISTE en el sistema, ¿Qué deseas hacer con la cantidad de Stock?\n\nEscribe "1" para REEMPLAZAR el stock actual (Inventario General).\nEscribe "2" para SUMAR al stock actual (Ingreso de Mercadería).`, "1");
    
    if (modoInput === null) return; 
    
    let modo = 'REEMPLAZAR';
    if (modoInput.trim() === '2') {
        modo = 'SUMAR';
    } else if (modoInput.trim() !== '1') {
        alert("Opción no válida. Cancelando importación.");
        return;
    }

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