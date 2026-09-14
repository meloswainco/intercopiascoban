// admin_pedidos.js

async function abrirHistorialPedidos() {
    document.getElementById('modal-historial-pedidos').classList.remove('hidden');
    await cargarHistorialPedidos();
}

function cerrarHistorialPedidos() {
    document.getElementById('modal-historial-pedidos').classList.add('hidden');
}

async function cargarHistorialPedidos() {
    const list = document.getElementById('historial-pedidos-list');
    list.innerHTML = '<div class="text-center p-4 text-slate-500 font-bold uppercase text-xs animate-pulse">Cargando pedidos...</div>';

    const pedidos = await window.posAPI.obtenerPedidosPendientes();

    if (!pedidos || pedidos.length === 0) {
        list.innerHTML = `
            <div class="text-center p-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <i class="fas fa-boxes-packing text-4xl text-slate-300 mb-2"></i>
                <p class="text-slate-500 font-bold text-xs uppercase">No hay pedidos pendientes.</p>
            </div>`;
        return;
    }

    list.innerHTML = '';
    for (const pedido of pedidos) {
        const div = document.createElement('div');
        div.className = 'bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow';

        // Fetch detalles
        const detalles = await window.posAPI.obtenerDetallesPedido(pedido.ID_Pedido);
        const detallesHTML = detalles.map(d => `
            <div class="flex justify-between text-xs text-slate-600 font-bold border-b border-slate-100 last:border-0 pb-1">
                <span>${d.Cantidad}x ${d.Descripcion}</span>
                <span>Q${d.Subtotal.toFixed(2)}</span>
            </div>
        `).join('');

        div.innerHTML = `
            <div class="flex justify-between items-start border-b border-slate-200 pb-2">
                <div>
                    <h4 class="font-black text-slate-800 text-sm uppercase">Pedido #${pedido.ID_Pedido}</h4>
                    <p class="text-[10px] text-slate-500 font-bold"><i class="fas fa-user mr-1"></i>${pedido.Cliente} | <i class="fas fa-phone mr-1"></i>${pedido.Telefono}</p>
                    <p class="text-[10px] text-slate-400 font-bold"><i class="fas fa-calendar mr-1"></i>${pedido.Fecha} ${pedido.Hora}</p>
                </div>
                <div class="text-right">
                    <span class="bg-purple-100 text-purple-700 font-black text-[10px] px-2 py-1 rounded-md uppercase tracking-wider">${pedido.Estado}</span>
                </div>
            </div>
            
            <div class="bg-white p-2 rounded-lg border border-slate-100 mt-1 max-h-32 overflow-y-auto">
                ${detallesHTML}
            </div>

            <div class="flex justify-between items-center mt-2 bg-slate-100 p-2 rounded-lg">
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-slate-500 uppercase">Total: Q${pedido.Total.toFixed(2)}</span>
                    <span class="text-[10px] font-black text-emerald-600 uppercase">Anticipo: Q${pedido.Anticipo.toFixed(2)}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-lg font-black text-red-600">SALDO: Q${pedido.Saldo.toFixed(2)}</span>
                    <button onclick="liquidarPedido(${pedido.ID_Pedido}, ${pedido.Saldo})" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-black text-xs uppercase shadow-md transition-colors flex items-center gap-2">
                        <i class="fas fa-check-circle"></i> Liquidar y Entregar
                    </button>
                </div>
            </div>
        `;
        list.appendChild(div);
    }
}

async function liquidarPedido(idPedido, saldo) {
    if (!confirm(`¿Estás seguro de liquidar el pedido #${idPedido} por el saldo de Q${saldo.toFixed(2)}? \n\nEsto generará el ticket de venta final.`)) return;

    // Aquí podríamos pedir método de pago del saldo, pero para mantenerlo rápido usaremos efectivo.
    // Opcionalmente se puede pedir:
    const metodo = prompt(`Ingrese método de pago para el saldo (EFECTIVO, TRANSFERENCIA, TARJETA):`, 'EFECTIVO');
    if (metodo === null) return; // Cancelado

    const methodClean = metodo.toUpperCase().trim();
    if (!['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].includes(methodClean)) {
        alert("Método de pago no válido.");
        return;
    }

    try {
        const res = await window.posAPI.liquidarPedido({ id_pedido: idPedido, metodo_pago: methodClean });
        if (res.success) {
            alert(`Pedido #${idPedido} liquidado correctamente. Ticket de Saldo #${res.id_ticket} generado.`);
            
            // Imprimir Ticket Final (Este es un ticket normal, pero con una línea negativa que descuenta el anticipo, app.js imprimirá normal)
            // Necesitamos la data del ticket para imprimir
            const tickDetails = await window.posAPI.obtenerDetalleTicket(res.id_ticket);
            if(tickDetails) {
                const head = tickDetails.maestro;
                const items = tickDetails.detalles;
                // El total del ticket final será igual al SALDO
                if(typeof prepararTicketTermico === 'function') {
                    prepararTicketTermico(head.ID_Ticket, head.Fecha, head.Hora, head.Cliente, head.NIT, items, head.Total_Documento, head.Metodo_Pago, head.Tipo_Documento);
                    document.body.classList.add('printing-sales');
                    await window.ejecutarImpresion();
                    document.body.classList.remove('printing-sales');
                }
            }

            cargarHistorialPedidos();
            
            if (typeof window.cargarTop20 === 'function') {
                await window.cargarTop20();
            }
        } else {
            alert("Error al liquidar el pedido: " + res.error);
        }
    } catch (err) {
        alert("Ocurrió un error al liquidar.");
        console.error(err);
    }
}

// Exportar globalmente
window.abrirHistorialPedidos = abrirHistorialPedidos;
window.cerrarHistorialPedidos = cerrarHistorialPedidos;
window.cargarHistorialPedidos = cargarHistorialPedidos;
window.liquidarPedido = liquidarPedido;
