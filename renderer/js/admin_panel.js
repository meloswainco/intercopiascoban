/**
 * admin_panel.js
 * Módulo para gestionar las pestañas, reportes y configuración del Panel de Administración.
 */

// ================== PANEL ADMIN ==================
function promptAdminAccess() {
    if (typeof window.requestAdminPassword === 'function') {
        window.requestAdminPassword(() => {
            openAdminModal();
        });
    } else {
        console.error('Módulo admin_auth no disponible; acceso administrativo bloqueado.');
        alert('No se pudo cargar la autenticación administrativa.');
    }
}

function openAdminModal() {
    document.getElementById('modal-admin').classList.remove('hidden');
    switchAdminTab('reportes');
}

function closeAdminModal() {
    document.getElementById('modal-admin').classList.add('hidden');
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-content').forEach(el => el.classList.remove('flex'));

    document.querySelectorAll('.admin-tab').forEach(el => {
        el.classList.remove('bg-blue-50', 'text-blue-900');
        el.classList.add('text-slate-500');
    });

    const content = document.getElementById(`admin-content-${tab}`);
    if (content) {
        content.classList.remove('hidden');
        if (tab === 'reportes') content.classList.add('flex');
        else content.classList.add('flex');
    }

    const btn = document.getElementById(`admin-tab-${tab}`);
    if (btn) {
        btn.classList.add('bg-blue-50', 'text-blue-900');
        btn.classList.remove('text-slate-500');
    }

    if (tab === 'reportes' && typeof window.renderAdminHistorySql === 'function') window.renderAdminHistorySql();
    
    // Funciones que pueden estar definidas en app.js u otros archivos
    if (tab === 'kardex' && typeof loadAdminKardex === 'function') loadAdminKardex();
    if (tab === 'frecuentes' && typeof window.loadAdminFrecuentes === 'function') window.loadAdminFrecuentes();
    if (tab === 'escalas' && typeof window.loadAdminEscalas === 'function') window.loadAdminEscalas();
    if (tab === 'personalizados' && typeof window.loadAdminPersonalizados === 'function') window.loadAdminPersonalizados();
    if (tab === 'gestiones' && typeof window.loadAdminGestiones === 'function') window.loadAdminGestiones();
    if (tab === 'usuarios' && typeof window.loadAdminColaboradores === 'function') window.loadAdminColaboradores();
    if (tab === 'config' && typeof loadAdminConfig === 'function') loadAdminConfig();
}

async function loadAdminKardex() {
    const tbody = document.getElementById('admin-kardex-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center p-4">Cargando...</td></tr>';
    try {
        const res = await window.posAPI.obtenerKardex();
        if (res && res.success && res.data) {
            if (res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-slate-400">No hay movimientos en el Kardex</td></tr>';
            } else {
                tbody.innerHTML = res.data.map(k => {
                    const date = new Date(k.Fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                    const tClass = k.Tipo_Movimiento === 'ENTRADA' ? 'text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded' : 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded';
                    return `
                        <tr class="border-b hover:bg-slate-50 transition-colors">
                            <td class="p-3">${k.ID_Movimiento}</td>
                            <td class="p-3">${date}</td>
                            <td class="p-3 font-bold">${k.Codigo_Producto}</td>
                            <td class="p-3"><span class="${tClass}">${k.Tipo_Movimiento}</span></td>
                            <td class="p-3 font-bold text-center">${k.Cantidad}</td>
                            <td class="p-3">${k.Contexto}</td>
                            <td class="p-3 uppercase text-[10px] text-slate-500 font-bold">${k.Encargado || 'N/A'}</td>
                            <td class="p-3 text-[10px] text-slate-500 truncate max-w-[150px]" title="${k.Observacion || ''}">${k.Observacion || '-'}</td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-red-500">Error al cargar Kardex</td></tr>';
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-red-500">Error interno</td></tr>';
    }
}

async function loadAdminConfig() {
    if (!window.posAPI) return;
    const config = await window.posAPI.getConfig();
    const checkbox = document.getElementById('config-stock-negativo');
    if (checkbox) checkbox.checked = config.permitir_stock_negativo === '1';

    const sCobrar = document.getElementById('config-shortcut-cobrar');
    if (sCobrar) sCobrar.value = config.shortcut_cobrar || 'F12';
    
    const sCorteZ = document.getElementById('config-shortcut-cortez');
    if (sCorteZ) sCorteZ.value = config.shortcut_corte_z || 'F10';
    
    const sBuscar = document.getElementById('config-shortcut-buscar');
    if (sBuscar) sBuscar.value = config.shortcut_buscar || 'F3';
    
    await renderDynamicShortcuts(config);
}

async function renderDynamicShortcuts(config) {
    const container = document.getElementById('dynamic-shortcuts-container');
    if (!container) return;
    
    const sCobrar = config.shortcut_cobrar || 'F12';
    const sCorteZ = config.shortcut_corte_z || 'F10';
    const sBuscar = config.shortcut_buscar || 'F3';
    const usedMainKeys = [sCobrar, sCorteZ, sBuscar];
    
    const botones = await window.posAPI.obtenerBotonesGrid(true);
    let optionsHtml = '<option value="">-- NINGUNO --</option>';
    botones.forEach(b => {
        optionsHtml += `<option value="${b.id}">${b.label}</option>`;
    });

    let html = '';
    for (let i = 1; i <= 12; i++) {
        const fKey = `F${i}`;
        if (usedMainKeys.includes(fKey)) continue;
        
        const selectedBtnId = config[`shortcut_dynamic_${fKey}`] || '';
        
        html += `
        <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">${fKey}</label>
            <select id="config-dynamic-${fKey}" onchange="guardarAtajos()" class="w-full bg-white border-2 rounded-lg p-2 font-bold text-slate-700 outline-none focus:border-blue-500 text-[10px]">
                ${optionsHtml}
            </select>
        </div>
        `;
    }
    
    container.innerHTML = html;
    
    for (let i = 1; i <= 12; i++) {
        const fKey = `F${i}`;
        if (usedMainKeys.includes(fKey)) continue;
        const select = document.getElementById(`config-dynamic-${fKey}`);
        if (select) {
            select.value = config[`shortcut_dynamic_${fKey}`] || '';
        }
    }
}

async function guardarAtajos() {
    const sCobrar = document.getElementById('config-shortcut-cobrar').value;
    const sCorteZ = document.getElementById('config-shortcut-cortez').value;
    const sBuscar = document.getElementById('config-shortcut-buscar').value;
    
    await window.posAPI.saveConfig('shortcut_cobrar', sCobrar);
    await window.posAPI.saveConfig('shortcut_corte_z', sCorteZ);
    await window.posAPI.saveConfig('shortcut_buscar', sBuscar);
    
    // Save dynamic
    for (let i = 1; i <= 12; i++) {
        const fKey = `F${i}`;
        const select = document.getElementById(`config-dynamic-${fKey}`);
        if (select) {
            await window.posAPI.saveConfig(`shortcut_dynamic_${fKey}`, select.value);
        }
    }
    
    const config = await window.posAPI.getConfig();
    await renderDynamicShortcuts(config);
    
    if (typeof window.cargarAtajosGlobales === 'function') {
        window.cargarAtajosGlobales();
    }
}

async function toggleConfigStockNegativo() {
    const isChecked = document.getElementById('config-stock-negativo').checked;
    await window.posAPI.saveConfig('permitir_stock_negativo', isChecked ? '1' : '0');
    if (typeof window.cargarConfigGlobal === 'function') {
        window.cargarConfigGlobal(); 
    }
}

// Exportar globalmente
window.promptAdminAccess = promptAdminAccess;
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.switchAdminTab = switchAdminTab;
window.loadAdminKardex = loadAdminKardex;
window.loadAdminConfig = loadAdminConfig;
window.toggleConfigStockNegativo = toggleConfigStockNegativo;
window.guardarAtajos = guardarAtajos;
