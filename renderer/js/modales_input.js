/**
 * modales_input.js
 * Módulo para gestionar los ingresos dinámicos por teclado y submenús editables.
 */

// --- INFRAESTRUCTURA DE SUBMENÚ DINÁMICO EDITABLE ---
async function openDynamicSubmenu(title, category, optionsArray) {
    if (typeof window.closeAllModals === 'function') window.closeAllModals();
    
    document.getElementById('modal-dynamic-submenu').classList.remove('hidden');
    document.getElementById('dynamic-submenu-title').innerText = title;
    document.getElementById('dynamic-submenu-qty').value = '1';

    const optionsContainer = document.getElementById('dynamic-submenu-options');
    optionsContainer.innerHTML = '<div class="text-xs text-slate-400">Cargando...</div>';

    // Cargar configuración para ver si hay precios sobreescritos
    let config = {};
    try {
        if (window.posAPI) {
            config = await window.posAPI.getConfig();
        }
    } catch (e) { console.error(e); }

    optionsContainer.innerHTML = optionsArray.map(opt => {
        const configKey = 'submenu_price_' + opt.key;
        const savedPrice = config[configKey];
        const finalPrice = savedPrice !== undefined ? parseFloat(savedPrice) : opt.defaultPrice;

        return `
        <div class="relative bg-blue-50 rounded-xl shadow-sm border border-blue-200 overflow-hidden flex flex-col">
            <div class="flex items-center justify-between p-2 border-b border-blue-100 bg-white">
                <span class="text-[10px] font-bold text-slate-500 uppercase">Precio Unitario</span>
                <div class="flex items-center">
                    <span class="text-xs font-black text-blue-900 mr-1">Q</span>
                    <input type="number" id="dynamic-price-${opt.key}" value="${finalPrice.toFixed(2)}" step="0.01" 
                        class="w-16 text-right font-black text-blue-900 outline-none bg-slate-100 rounded p-1 text-xs" 
                        onchange="updateDynamicSubmenuPrice('${opt.key}', this.value)">
                </div>
            </div>
            <button onclick="confirmDynamicSubmenu('${opt.label}', '${opt.key}', '${category || 'GENERAL'}')" 
                class="w-full text-blue-900 font-black py-3 uppercase text-sm hover:bg-blue-100 transition-colors">
                ${opt.label}
            </button>
        </div>
        `;
    }).join('');

    setTimeout(() => { document.getElementById('dynamic-submenu-qty').focus(); document.getElementById('dynamic-submenu-qty').select(); }, 100);
}

async function updateDynamicSubmenuPrice(key, value) {
    const price = parseFloat(value);
    if (!isNaN(price) && price >= 0) {
        try {
            if (window.posAPI) {
                await window.posAPI.saveConfig('submenu_price_' + key, price);
            }
        } catch (e) { console.error("Error guardando precio de submenú", e); }
    }
}

function confirmDynamicSubmenu(label, key, category) {
    const qty = parseInt(document.getElementById('dynamic-submenu-qty').value);
    if (isNaN(qty) || qty < 1) return;

    const price = parseFloat(document.getElementById('dynamic-price-' + key).value);
    if (isNaN(price) || price < 0) return;

    if (typeof window.addCart === 'function') {
        window.addCart(label.toUpperCase(), price, qty, category);
    }
    if (typeof window.closeAllModals === 'function') window.closeAllModals();
}

function openManualInput(m, d, defaultPrice = '') {
    if (typeof window.closeAllModals === 'function') window.closeAllModals();
    
    document.getElementById('modal-manual').classList.remove('hidden');
    document.getElementById('manual-title').innerText = d || 'MANUAL';
    const dn = document.getElementById('manual-desc-input');
    const p = document.getElementById('manual-price-input');
    const q = document.getElementById('manual-qty-input');
    if (q) {
        q.value = '1';
    }
    p.value = defaultPrice !== '' ? defaultPrice : '';

    if (m === 'price_only' || m === 'escaneo') {
        dn.value = d;
        document.getElementById('manual-name-container').classList.add('hidden');
        // Focus en cantidad si es escaneo
        if (q && m === 'escaneo') {
            q.focus();
            q.select();
        } else {
            p.focus();
        }
    } else {
        dn.value = '';
        document.getElementById('manual-name-container').classList.remove('hidden');
        dn.focus();
    }
}

function confirmManualInput() {
    const d = document.getElementById('manual-desc-input').value;
    const p = parseFloat(document.getElementById('manual-price-input').value);
    const qInput = document.getElementById('manual-qty-input');
    const q = qInput ? (parseInt(qInput.value) || 1) : 1;
    const tituloModal = document.getElementById('manual-title').innerText;

    let catManual = 'LIBRERIA/OTROS';

    if (tituloModal.includes('AJUSTE')) catManual = 'AJUSTE DOCUMENTO';
    if (tituloModal.includes('MULTIMEDIA')) catManual = 'MULTIMEDIA';
    if (tituloModal.includes('DISEÑO')) catManual = 'DISEÑO';
    if (tituloModal.includes('PAPEL')) catManual = 'IMP.OTRO';
    if (tituloModal.includes('APA')) catManual = 'NORMAS APA';
    if (tituloModal.includes('CIBER')) catManual = 'CIBER';
    if (tituloModal.toUpperCase().includes('ESCANEO')) catManual = 'ESCANEO';

    if (d && !isNaN(p) && q > 0) {
        if (typeof window.addCart === 'function') {
            window.addCart(d.toUpperCase(), p, q, catManual);
        }
        if (typeof window.closeAllModals === 'function') window.closeAllModals();
    }
}

function btnAjusteDoc() {
    openManualInput('price_only', 'AJUSTE DOCUMENTO');
}

// Exportar globalmente
window.openDynamicSubmenu = openDynamicSubmenu;
window.updateDynamicSubmenuPrice = updateDynamicSubmenuPrice;
window.confirmDynamicSubmenu = confirmDynamicSubmenu;
window.openManualInput = openManualInput;
window.confirmManualInput = confirmManualInput;
window.btnAjusteDoc = btnAjusteDoc;
