/**
 * tramites_gestiones.js
 * Módulo para gestionar el cobro de trámites, boletas y comisiones.
 */

let serviciosGestionCache = [];

async function buscarPresetGestion(e) {
    const input = e.target.value.toLowerCase();
    const list = document.getElementById('gestion-suggestions');
    if (input.length < 2) { list.classList.add('hidden'); return; }

    serviciosGestionCache = await window.posAPI.obtenerServiciosGestion(true);
    const resultados = serviciosGestionCache.filter(servicio => servicio.nombre.toLowerCase().includes(input));
    let html = '';
    if (resultados.length > 0) {
        html += resultados.map(servicio => `
            <div onclick="seleccionarPresetGestion(${servicio.id})" class="p-3 border-b hover:bg-amber-50 cursor-pointer transition-colors">
                <div class="font-black text-slate-800 text-xs uppercase">${escaparTextoGestion(servicio.nombre)}</div>
                <div class="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                    ${servicio.valor_boleta !== null ? `Boleta: Q${Number(servicio.valor_boleta).toFixed(2)}` : `Boleta: (Ingresar manual)`}
                    | Gestión: Q${Number(servicio.valor_gestion).toFixed(2)} | Comisión: Q${Number(servicio.comision_pago).toFixed(2)}
                </div>
            </div>
        `).join('');
    }
    html += `
        <div onclick="ocultarSugerenciasGestion()" class="p-3 bg-slate-800 hover:bg-black cursor-pointer transition-colors text-center border-t-2 border-slate-900">
            <span class="font-bold text-white text-xs uppercase tracking-widest"><i class="fas fa-keyboard mr-1"></i> Usar trámite manual escrito</span>
        </div>
    `;
    list.innerHTML = html;
    list.classList.remove('hidden');
}

function ocultarSugerenciasGestion() {
    document.getElementById('gestion-suggestions').classList.add('hidden');
}

function escaparTextoGestion(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
}

async function seleccionarPresetGestion(idServicio) {
    const servicios = serviciosGestionCache.length ? serviciosGestionCache : await window.posAPI.obtenerServiciosGestion(true);
    const preset = servicios.find(servicio => servicio.id === Number(idServicio));
    if (!preset) return;
    document.getElementById('gestion-desc').value = preset.nombre;
    document.getElementById('gestion-tipo-cobro').value = 'gestion_y_pago';
    document.getElementById('gestion-monto-boleta').value = preset.valor_boleta ?? '';
    document.getElementById('gestion-monto-gestion').value = preset.valor_gestion;
    document.getElementById('gestion-monto-comision').value = preset.comision_pago;
    toggleMontoBoleta();
    document.getElementById('gestion-suggestions').classList.add('hidden');
}

async function openGestionModal() {
    if (typeof window.closeAllModals === 'function') window.closeAllModals();
    
    document.getElementById('modal-gestiones').classList.remove('hidden');
    document.getElementById('gestion-desc').value = '';
    document.getElementById('gestion-suggestions').classList.add('hidden');
    document.getElementById('gestion-tipo-cobro').value = 'solo_gestion';
    document.getElementById('gestion-monto-boleta').value = '';
    document.getElementById('gestion-monto-gestion').value = '10.00';
    document.getElementById('gestion-monto-comision').value = '5.00';
    document.getElementById('div-monto-boleta').classList.add('hidden');
    serviciosGestionCache = await window.posAPI.obtenerServiciosGestion(true);
    setTimeout(() => document.getElementById('gestion-desc').focus(), 100);
}

function closeGestionModal() {
    document.getElementById('modal-gestiones').classList.add('hidden');
}

function toggleMontoBoleta() {
    const tipo = document.getElementById('gestion-tipo-cobro').value;
    const divMonto = document.getElementById('div-monto-boleta');
    if (tipo === 'gestion_y_pago') { divMonto.classList.remove('hidden'); }
    else { divMonto.classList.add('hidden'); }
}

function confirmGestionInput() {
    const desc = document.getElementById('gestion-desc').value.trim() || 'TRÁMITE GENERAL';
    const tipoCobro = document.getElementById('gestion-tipo-cobro').value;
    const valorGestion = parseFloat(document.getElementById('gestion-monto-gestion').value) || 10.00;
    const valorComision = parseFloat(document.getElementById('gestion-monto-comision').value) || 5.00;

    // Dependencia de addCart
    if (typeof window.addCart !== 'function') {
        alert("El módulo del carrito no está listo.");
        return;
    }

    if (tipoCobro === 'solo_gestion') {
        window.addCart(`GESTIÓN: ${desc}`, valorGestion, 1, 'GESTION_TRAMITE');
    } else {
        const boletaInput = document.getElementById('gestion-monto-boleta').value.trim();
        if (boletaInput === '') {
            alert("Ingresa el valor de la boleta o selecciona que el pago irá al banco.");
            document.getElementById('gestion-monto-boleta').focus();
            return;
        }
        const montoBoleta = parseFloat(boletaInput);
        if (Number.isNaN(montoBoleta) || montoBoleta < 0) {
            alert("El valor de la boleta no es válido.");
            document.getElementById('gestion-monto-boleta').focus();
            return;
        }
        if (montoBoleta > 0) window.addCart(`PAGO BOLETA: ${desc}`, montoBoleta, 1, 'PAGO_INSTITUCION');
        window.addCart(`GESTIÓN: ${desc}`, valorGestion, 1, 'GESTION_TRAMITE');
        window.addCart(`COMISIÓN COBRO: ${desc}`, valorComision, 1, 'COMISION_PAGO');
    }
    closeGestionModal();
}

// Exportar funciones globales
window.buscarPresetGestion = buscarPresetGestion;
window.ocultarSugerenciasGestion = ocultarSugerenciasGestion;
window.escaparTextoGestion = escaparTextoGestion;
window.seleccionarPresetGestion = seleccionarPresetGestion;
window.openGestionModal = openGestionModal;
window.closeGestionModal = closeGestionModal;
window.toggleMontoBoleta = toggleMontoBoleta;
window.confirmGestionInput = confirmGestionInput;
window.serviciosGestionCache = serviciosGestionCache;
