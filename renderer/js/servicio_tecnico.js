/**
 * servicio_tecnico.js
 * Módulo para gestionar el ingreso de órdenes de servicio técnico y recomendaciones.
 */

async function processTechOrder() {
    const cliente = document.getElementById('st-cliente').value.toUpperCase();
    const modelo = document.getElementById('st-modelo').value.toUpperCase();
    const falla = document.getElementById('st-falla').value.toUpperCase();
    const total = parseFloat(document.getElementById('st-total').value) || 0;
    const anticipo = parseFloat(document.getElementById('st-anticipo').value) || 0;
    const saldo = Math.max(0, total - anticipo);
    const tel = document.getElementById('st-telefono').value;
    const tipo = document.getElementById('st-tipo').value;
    const reco = document.getElementById('st-reco-text').innerText;
    
    if (!cliente || !modelo || !falla) { 
        alert("Faltan datos"); 
        return; 
    }

    let ordenGuardada;
    if (window.posAPI && window.posAPI.guardarOrdenTecnica) {
        try {
            ordenGuardada = await window.posAPI.guardarOrdenTecnica({ 
                cliente, 
                equipo: `${tipo} - ${modelo}`, 
                falla, 
                estado: 'PENDIENTE',
                total,
                anticipo,
                saldo
            });
            if (!ordenGuardada?.success) throw new Error(ordenGuardada?.error || 'No se pudo guardar la orden técnica.');
        } catch (e) {
            alert(`No se pudo guardar la orden técnica: ${e.message}`);
            return;
        }
    }

    const fechaAhora = new Date().toLocaleString();
    const idOrden = `ST-${ordenGuardada?.id || Date.now()}`;
    
    document.body.classList.remove('printing-sales', 'printing-report');
    document.body.classList.add('printing-tech');
    document.getElementById('tech-print-date').innerText = fechaAhora;
    document.getElementById('tech-print-id').innerText = idOrden;
    document.getElementById('tech-print-cliente').innerText = cliente;
    document.getElementById('tech-print-tel').innerText = tel;
    document.getElementById('tech-print-modelo').innerText = `${tipo} - ${modelo}`;
    document.getElementById('tech-print-falla').innerText = falla;
    document.getElementById('tech-print-reco').innerText = reco;
    document.getElementById('tech-print-anticipo').innerText = anticipo.toFixed(2);
    
    await window.ejecutarImpresion(true);
    
    document.getElementById('st-cliente').value = "";
    document.getElementById('st-modelo').value = "";
    document.getElementById('st-falla').value = "";
    document.getElementById('st-total').value = "0";
    document.getElementById('st-anticipo').value = "0";
    alert("Orden Ingresada en SQLite correctamente.");
}

function updateTechReco() { 
    const tipo = document.getElementById('st-tipo').value; 
    const text = document.getElementById('st-reco-text'); 
    if (tipo === 'IMPRESORA') {
        text.innerText = "Nota: Usar el equipo al menos cada 3 días. No dejar bajar la tinta del 20%."; 
    } else if (tipo === 'COMPUTADORA') {
        text.innerText = "Nota: Recomendamos limpieza de virus semestral y cambio de pasta térmica anual."; 
    } else {
        text.innerText = "Nota: Equipo ingresado para revisión técnica especializada."; 
    }
}

async function cargarHistorialTecnico() {
    const container = document.getElementById('historial-tecnico-list');
    if (!container) return;
    container.innerHTML = '<p class="text-center p-8 text-slate-400 font-bold">Cargando órdenes...</p>';
    try {
        const ordenes = await window.posAPI.obtenerOrdenesTecnicas();
        if (!ordenes || ordenes.length === 0) {
            container.innerHTML = '<p class="text-center p-8 text-slate-400 font-bold">No hay órdenes registradas.</p>';
            return;
        }
        container.innerHTML = ordenes.map(orden => `
            <div class="border rounded-xl p-4 bg-slate-50 flex flex-col gap-3 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
                    <div class="flex items-center gap-3">
                        <span class="font-black text-blue-900 text-lg uppercase">#ST-${orden.id}</span>
                        <span class="text-xs font-bold text-slate-500"><i class="fas fa-calendar mr-1"></i>${orden.fecha}</span>
                        <span class="text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider ${orden.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">${escaparTextoTecnico(orden.estado)}</span>
                    </div>
                    <span class="text-sm font-black text-slate-800 uppercase"><i class="fas fa-user mr-1"></i>${escaparTextoTecnico(orden.cliente)}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-100">
                    <div><span class="block text-[9px] font-black uppercase text-slate-400">Equipo</span><span class="font-bold text-slate-700">${escaparTextoTecnico(orden.equipo)}</span></div>
                    <div class="md:col-span-2"><span class="block text-[9px] font-black uppercase text-slate-400">Falla reportada</span><span class="font-bold text-slate-700">${escaparTextoTecnico(orden.falla)}</span></div>
                </div>
                <div class="flex justify-between items-center mt-2 bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <div class="flex gap-4">
                        <div class="flex flex-col">
                            <span class="text-[9px] font-black text-slate-500 uppercase">Total:</span>
                            <span class="text-sm font-black text-slate-700">Q${parseFloat(orden.Total || 0).toFixed(2)}</span>
                        </div>
                        <div class="flex flex-col border-l border-slate-300 pl-4">
                            <span class="text-[9px] font-black text-emerald-600 uppercase">Anticipo:</span>
                            <span class="text-sm font-black text-emerald-700">Q${parseFloat(orden.Anticipo || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="flex flex-col items-end">
                            <span class="text-[9px] font-black text-red-500 uppercase tracking-widest">Saldo Pendiente:</span>
                            <span class="text-xl font-black text-red-600">Q${parseFloat(orden.Saldo || 0).toFixed(2)}</span>
                        </div>
                        ${orden.estado === 'PENDIENTE' ? `
                            <button onclick="liquidarOrdenTecnicaUI(${orden.id}, ${orden.Saldo})" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase shadow-md transition-colors flex items-center gap-2">
                                <i class="fas fa-hand-holding-dollar"></i> Liquidar Saldo
                            </button>
                        ` : `
                            <span class="text-emerald-600 font-black text-xs uppercase"><i class="fas fa-check-circle mr-1"></i>Entregado</span>
                        `}
                    </div>
                </div>
            </div>`).join('');
    } catch (error) {
        console.error('Error cargando historial técnico:', error);
        container.innerHTML = '<p class="text-center p-8 text-red-500 font-bold">No se pudo cargar el historial.</p>';
    }
}

function escaparTextoTecnico(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
}

async function abrirHistorialTecnico() {
    const modal = document.getElementById('modal-historial-tecnico');
    if (!modal) return;
    modal.classList.remove('hidden');
    await cargarHistorialTecnico();
}

async function liquidarOrdenTecnicaUI(idOrden, saldo) {
    if (!confirm(`¿Estás seguro de liquidar la orden ST-${idOrden} por el saldo de Q${saldo.toFixed(2)}? \n\nEsto generará el ticket de pago final en el Corte Z.`)) return;

    const metodo = prompt(`Ingrese método de pago para el saldo (EFECTIVO, TRANSFERENCIA, TARJETA):`, 'EFECTIVO');
    if (metodo === null) return; 

    const methodClean = metodo.toUpperCase().trim();
    if (!['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].includes(methodClean)) {
        alert("Método de pago no válido.");
        return;
    }

    try {
        const res = await window.posAPI.liquidarOrdenTecnica({ id_orden: idOrden, metodo_pago: methodClean });
        if (res.success) {
            alert(`Orden ST-${idOrden} liquidada correctamente. Ticket #${res.id_ticket} generado.`);
            
            // Imprimir Ticket Final
            const tickDetails = await window.posAPI.obtenerDetalleTicket(res.id_ticket);
            if(tickDetails) {
                const head = tickDetails.maestro;
                const items = tickDetails.detalles;
                if(typeof prepararTicketTermico === 'function') {
                    prepararTicketTermico(head.ID_Ticket, head.Fecha, head.Hora, head.Cliente, head.NIT, items, head.Total_Documento, head.Metodo_Pago, head.Tipo_Documento);
                    document.body.classList.add('printing-sales');
                    await window.ejecutarImpresion();
                    document.body.classList.remove('printing-sales');
                }
            }

            cargarHistorialTecnico();
            if (typeof window.cargarTop20 === 'function') await window.cargarTop20();
        } else {
            alert("Error al liquidar la orden: " + res.error);
        }
    } catch (err) {
        alert("Ocurrió un error al liquidar.");
        console.error(err);
    }
}

// Exportar globalmente
window.processTechOrder = processTechOrder;
window.updateTechReco = updateTechReco;
window.abrirHistorialTecnico = abrirHistorialTecnico;
window.cargarHistorialTecnico = cargarHistorialTecnico;
window.liquidarOrdenTecnicaUI = liquidarOrdenTecnicaUI;
