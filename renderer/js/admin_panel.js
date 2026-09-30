/**
 * admin_panel.js
 * MÃ³dulo para gestionar las pestaÃ±as, reportes y configuraciÃ³n del Panel de AdministraciÃ³n.
 */

// ================== PANEL ADMIN ==================
function promptAdminAccess() {
    if (typeof window.requestAdminPassword === 'function') {
        window.requestAdminPassword(() => {
            openAdminModal();
        });
    } else {
        console.error('MÃ³dulo admin_auth no disponible; acceso administrativo bloqueado.');
        alert('No se pudo cargar la autenticaciÃ³n administrativa.');
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
        el.classList.remove('bg-primary-light', 'text-primary', 'border-l-4', 'border-primary', 'shadow-sm');
        el.classList.add('text-muted', 'border-l-4', 'border-transparent');
    });

    const content = document.getElementById(`admin-content-${tab}`);
    if (content) {
        content.classList.remove('hidden');
        if (tab === 'reportes') content.classList.add('flex');
        else content.classList.add('flex');
    }

    const btn = document.getElementById(`admin-tab-${tab}`);
    if (btn) {
        btn.classList.add('bg-primary-light', 'text-primary', 'border-l-4', 'border-primary', 'shadow-sm');
        btn.classList.remove('text-muted', 'border-transparent');
    }

    if (tab === 'reportes' && typeof window.renderAdminHistorySql === 'function') window.renderAdminHistorySql();
    
    // Funciones que pueden estar definidas en app.js u otros archivos
    if (tab === 'dashboard' && typeof window.loadAdminDashboard === 'function') window.loadAdminDashboard();
    if (tab === 'kardex' && typeof loadAdminKardex === 'function') loadAdminKardex();
    if (tab === 'gastos' && typeof initAdminGastos === 'function') initAdminGastos();
    if (tab === 'frecuentes' && typeof window.loadAdminFrecuentes === 'function') window.loadAdminFrecuentes();
    if (tab === 'escalas' && typeof window.loadAdminEscalas === 'function') window.loadAdminEscalas();
    if (tab === 'personalizados' && typeof window.loadAdminPersonalizados === 'function') window.loadAdminPersonalizados();
    if (tab === 'gestiones' && typeof window.loadAdminGestiones === 'function') window.loadAdminGestiones();
    if (tab === 'usuarios' && typeof window.loadAdminColaboradores === 'function') window.loadAdminColaboradores();
    if (tab === 'config' && typeof loadAdminConfig === 'function') loadAdminConfig();
}

let kardexTable = null;

async function loadAdminKardex() {
    const tableContainer = document.getElementById('kardex-tabulator-table');
    if (!tableContainer) return;

    try {
        const res = await window.posAPI.obtenerKardex();
        if (res && res.success && res.data) {
            const formattedData = res.data.map(k => {
                const dateStr = window.formatearFechaHora(k.Fecha, '');
                const yyyyMmDd = window.fechaLocalISO(k.Fecha);
                return {
                    id: k.ID_Movimiento,
                    fecha: dateStr,
                    fechaISO: yyyyMmDd,
                    codigo: k.Codigo_Producto,
                    tipo: k.Tipo_Movimiento,
                    cant: k.Cantidad,
                    contexto: k.Contexto,
                    encargado: k.Encargado || 'N/A',
                    obs: k.Observacion || '-'
                };
            });

            if (!kardexTable) {
                kardexTable = new Tabulator("#kardex-tabulator-table", {
                    data: formattedData,
                    layout: "fitColumns",
                    height: "100%",
                    pagination: "local",
                    paginationSize: 15,
                    paginationSizeSelector: [15, 30, 50, 100],
                    columns: [
                        {title: "ID", field: "id", width: 70},
                        {title: "Fecha", field: "fecha", width: 140},
                        {title: "Cï¿½digo", field: "codigo", width: 130},
                        {title: "Tipo", field: "tipo", width: 100, formatter: function(cell){
                            return cell.getValue() === 'ENTRADA' ? `<span class="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">ENTRADA</span>` : `<span class="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">SALIDA</span>`;
                        }},
                        {title: "Cant", field: "cant", width: 80, hozAlign: "center", headerHozAlign: "center"},
                        {title: "Contexto", field: "contexto", width: 150},
                        {title: "Encargado", field: "encargado", width: 100},
                        {title: "Obs", field: "obs", formatter: "textarea", minWidth: 200}
                    ],
                });
            } else {
                kardexTable.setData(formattedData);
            }
        } else {
            if(kardexTable) kardexTable.clearData();
        }
    } catch (error) {
        console.error(error);
        if(kardexTable) kardexTable.clearData();
    }
}

window.filtrarKardexTabulator = function(val) {
    if (!kardexTable) return;
    if (val) {
        kardexTable.setFilter("fechaISO", "=", val);
    } else {
        kardexTable.clearFilter();
    }
};
async function loadAdminConfig() {
    if (!window.posAPI) return;
    const config = await window.posAPI.getConfig();
    const checkbox = document.getElementById('config-stock-negativo');
    if (checkbox) checkbox.checked = config.permitir_stock_negativo === '1';
    const terminalInput = document.getElementById('config-terminal-id');
    if (terminalInput) terminalInput.value = config.terminal_id || 'CAJA_1';

    const selectImpresora = document.getElementById('config-impresora-seleccionada');
    if (selectImpresora && window.posAPI.getPrinters) {
        try {
            const printers = await window.posAPI.getPrinters();
            let html = '<option value="">-- PREDETERMINADA DEL SISTEMA --</option>';
            printers.forEach(p => {
                html += `<option value="${p.name}">${p.name}</option>`;
            });
            selectImpresora.innerHTML = html;
            if (config.impresora_seleccionada) {
                selectImpresora.value = config.impresora_seleccionada;
            }
        } catch(e) {
            console.error("Error al cargar impresoras", e);
        }
    }

    const selectSize = document.getElementById('config-ticket-size');
    if (selectSize) {
        selectSize.value = config.ticket_size || '58mm';
    }

    const tipoImpresora = document.getElementById('config-tipo-impresora');
    if (tipoImpresora) {
        tipoImpresora.value = ['TERMICA', 'TINTA'].includes(config.tipo_impresora) ? config.tipo_impresora : 'TERMICA';
    }
    const formatoTinta = document.getElementById('config-formato-tinta');
    if (formatoTinta) formatoTinta.value = config.formato_tinta || 'CARTA';
    if (typeof window.actualizarCamposTipoImpresora === 'function') {
        window.actualizarCamposTipoImpresora('config');
    }

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
    const resultado = await window.posAPI.saveConfig('permitir_stock_negativo', isChecked ? '1' : '0');
    if (!resultado?.success) {
        alert(`No se pudo guardar la configuraciÃ³n: ${resultado?.error || 'Error desconocido'}`);
        document.getElementById('config-stock-negativo').checked = !isChecked;
        return;
    }
    if (typeof window.cargarConfigGlobal === 'function') {
        await window.cargarConfigGlobal();
    }
    if (typeof window.cargarTop20 === 'function') await window.cargarTop20();
    if (typeof tableSala !== 'undefined' && tableSala) tableSala.redraw(true);
    if (typeof tableBodega !== 'undefined' && tableBodega) tableBodega.redraw(true);
    const searchInput = document.getElementById('main-search');
    if (searchInput?.value.trim()) searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    const dashboard = document.getElementById('admin-content-dashboard');
    if (typeof window.loadAdminDashboard === 'function' && dashboard && !dashboard.classList.contains('hidden')) {
        await window.loadAdminDashboard();
    }
}

async function guardarTerminalId() {
    const input = document.getElementById('config-terminal-id');
    if (!input) return;
    const anterior = window.POS_CONFIG?.terminal_id || 'CAJA_1';
    const terminal = input.value.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    if (!terminal) {
        input.value = anterior;
        return alert('El identificador de caja no puede estar vacÃ­o.');
    }
    if (terminal === anterior) return;

    const estado = await window.posAPI.checkTurnoAbierto();
    if (estado.abierto) {
        input.value = anterior;
        return alert('Cierra el turno actual antes de cambiar el identificador de caja.');
    }

    const resultado = await window.posAPI.saveConfig('terminal_id', terminal);
    if (!resultado?.success) {
        input.value = anterior;
        return alert(`No se pudo guardar la terminal: ${resultado?.error || 'Error desconocido'}`);
    }
    input.value = terminal;
    if (typeof window.cargarConfigGlobal === 'function') await window.cargarConfigGlobal();
}

async function guardarConfiguracionImpresion() {
    const printerSelect = document.getElementById('config-impresora-seleccionada');
    const sizeSelect = document.getElementById('config-ticket-size');
    const tipoSelect = document.getElementById('config-tipo-impresora');
    const formatoTinta = document.getElementById('config-formato-tinta');
    
    if (tipoSelect) {
        const tipoImpresora = tipoSelect.value;
        await window.posAPI.saveConfig('tipo_impresora', tipoImpresora);

        if (printerSelect) {
            await window.posAPI.saveConfig('impresora_seleccionada', printerSelect.value);
        }

        if (tipoImpresora === 'TERMICA' && sizeSelect) {
            await window.posAPI.saveConfig('ticket_size', sizeSelect.value);
        }

        if (tipoImpresora === 'TINTA' && formatoTinta) {
            await window.posAPI.saveConfig('formato_tinta', formatoTinta.value);
        }
        
        if (typeof window.cargarConfigGlobal === 'function') {
            await window.cargarConfigGlobal();
        }
        
        window.customAlert(`ConfiguraciÃ³n de impresiÃ³n guardada: ${tipoImpresora === 'TERMICA' ? 'tÃ©rmica ESC/POS' : 'impresora de tinta'}.`);
    }
}

function switchConfigTab(tabId) {
    // Hide all panes
    const panes = document.querySelectorAll('.config-pane');
    panes.forEach(pane => {
        pane.classList.add('hidden');
        pane.classList.remove('block');
    });

    // Remove active state from all tabs
    const tabs = document.querySelectorAll('.config-tab-btn');
    tabs.forEach(tab => {
        tab.classList.remove('active', 'bg-primary-light', 'text-primary');
        tab.classList.add('text-muted', 'hover:bg-app');
    });

    // Show selected pane
    const targetPane = document.getElementById(`config-pane-${tabId}`);
    if (targetPane) {
        targetPane.classList.remove('hidden');
        targetPane.classList.add('block');
    }

    // Set active state on clicked tab
    const targetTab = document.getElementById(`config-tab-${tabId}`);
    if (targetTab) {
        targetTab.classList.remove('text-muted', 'hover:bg-app');
        targetTab.classList.add('active', 'bg-primary-light', 'text-primary');
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
window.guardarTerminalId = guardarTerminalId;
window.guardarConfiguracionImpresion = guardarConfiguracionImpresion;
window.guardarAccesosRapidos = guardarAccesosRapidos;
window.switchConfigTab = switchConfigTab;
window.guardarAtajos = guardarAtajos;
