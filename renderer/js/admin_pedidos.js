// admin_pedidos.js

let pendientesTabActual = 'pedidos';
let pendientesFechaActual = window.fechaLocalISO();

function formatearFechaPendientes(fechaIso) {
    return window.formatearFechaLarga(fechaIso);
}

async function abrirHistorialPedidos() {
    switchTab('historial-pedidos');
    pendientesFechaActual = window.fechaLocalISO();
    actualizarNavegacionPendientes();
    await cargarPoliticaRetencion();
    await activarTabPendientes('pedidos');
}

function cerrarHistorialPedidos() {
    document.getElementById('modal-historial-pedidos').classList.add('hidden');
}

async function cargarHistorialPedidos() {
    const list = document.getElementById('historial-pedidos-list');
    list.innerHTML = '<div class="text-center p-4 text-slate-500 font-bold uppercase text-xs animate-pulse">Cargando pedidos...</div>';

    const pedidos = await window.posAPI.obtenerPedidosPendientes(pendientesFechaActual);

    if (!pedidos || pedidos.length === 0) {
        list.innerHTML = `
            <div class="text-center p-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <i class="fas fa-boxes-packing text-4xl text-slate-300 mb-2"></i>
                <p class="text-slate-500 font-bold text-xs uppercase">No hay pedidos pendientes para este día.</p>
            </div>`;
        return;
    }

    list.innerHTML = '';
    for (const pedido of pedidos) {
        const div = document.createElement('div');
        div.className = 'bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow';

        if (pedido.Estado === 'ENTREGADO') {
            // Render minimizado
            div.innerHTML = `
                <div class="flex justify-between items-center opacity-70">
                    <div>
                        <h4 class="font-black text-slate-500 text-sm uppercase line-through">Pedido #${pedido.ID_Pedido}</h4>
                        <p class="text-[10px] text-slate-400 font-bold">${pedido.Cliente} | ${pedido.Fecha} ${pedido.Hora}</p>
                    </div>
                    <div class="text-right flex items-center gap-2">
                        <span class="text-emerald-500 font-black text-xs uppercase"><i class="fas fa-check-double mr-1"></i>Entregado</span>
                    </div>
                </div>
            `;
            list.appendChild(div);
            continue;
        }

        // Fetch detalles para pedidos pendientes
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
                <div class="flex items-center gap-2">
                    <span class="text-lg font-black text-red-600">SALDO: Q${pedido.Saldo.toFixed(2)}</span>
                    <select id="metodo-saldo-${pedido.ID_Pedido}" class="bg-white border-2 border-slate-200 text-slate-700 font-bold text-xs p-2 rounded-lg outline-none focus:border-purple-500">
                        <option value="EFECTIVO">EFECTIVO</option>
                        <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                        <option value="TARJETA">TARJETA</option>
                    </select>
                    <button onclick="editarPedidoEnCarrito(${pedido.ID_Pedido})" class="bg-white hover:bg-blue-50 text-blue-700 border-2 border-blue-200 px-3 py-2 rounded-lg font-black text-xs uppercase transition-colors flex items-center gap-2">
                        <i class="fas fa-pen"></i> Editar
                    </button>
                    <button onclick="liquidarPedido(${pedido.ID_Pedido}, ${pedido.Saldo})" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-black text-xs uppercase shadow-md transition-colors flex items-center gap-2">
                        <i class="fas fa-check-circle"></i> Liquidar y Entregar
                    </button>
                </div>
            </div>
        `;
        list.appendChild(div);
    }
}

async function activarTabPendientes(tab) {
    pendientesTabActual = tab;
    document.querySelectorAll('[data-pendientes-tab]').forEach(button => {
        const activo = button.dataset.pendientesTab === tab;
        button.classList.toggle('bg-blue-600', activo);
        button.classList.toggle('text-white', activo);
        button.classList.toggle('bg-slate-100', !activo);
        button.classList.toggle('text-slate-600', !activo);
    });

    const list = document.getElementById('historial-pedidos-list');
    list.innerHTML = '';
    if (tab === 'pedidos') await cargarHistorialPedidos();
    if (tab === 'cotizaciones') await cargarCotizacionesPendientes();
    if (tab === 'cuentas') await cargarCuentasPorCobrar();
}

async function cambiarDiaPendientes(dias) {
    pendientesFechaActual = window.fechaLocalISO(window.sumarDiasFecha(pendientesFechaActual, dias));
    actualizarNavegacionPendientes();
    await activarTabPendientes(pendientesTabActual);
}

async function seleccionarFechaPendientes(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return;
    pendientesFechaActual = fecha;
    actualizarNavegacionPendientes();
    await activarTabPendientes(pendientesTabActual);
}

async function irHoyPendientes() {
    pendientesFechaActual = window.fechaLocalISO();
    actualizarNavegacionPendientes();
    await activarTabPendientes(pendientesTabActual);
}

function actualizarNavegacionPendientes() {
    const input = document.getElementById('pendientes-fecha');
    const label = document.getElementById('pendientes-fecha-label');
    if (input) input.value = pendientesFechaActual;
    if (label) label.textContent = formatearFechaPendientes(pendientesFechaActual);
}

async function cargarPoliticaRetencion() {
    const politica = await window.posAPI.obtenerRetencionCotizaciones();
    if (!politica?.success) return;
    actualizarPoliticaRetencionUI(politica);
}

function actualizarPoliticaRetencionUI(politica) {
    const select = document.getElementById('retencion-cotizaciones-dias');
    const estado = document.getElementById('retencion-cotizaciones-estado');
    if (select) select.value = String(politica.dias_siguientes || politica.dias_activos);
    if (!estado) return;

    const proxima = window.formatearFechaHora(politica.proxima_ejecucion);
    const cambio = politica.dias_siguientes
        ? ` Después se aplicarán ${politica.dias_siguientes} días.`
        : '';
    const eliminadas = politica.eliminadas > 0
        ? ` Se eliminaron ${politica.eliminadas} cotizaciones vencidas.`
        : '';
    estado.textContent = `Período activo: ${politica.dias_activos} días. Próxima depuración: ${proxima}.${cambio}${eliminadas}`;
}

async function programarRetencionCotizaciones(dias) {
    const resultado = await window.posAPI.programarRetencionCotizaciones(Number(dias));
    if (!resultado?.success) {
        alert(`No se pudo programar la retención: ${resultado?.error || 'Error desconocido'}`);
        return;
    }
    actualizarPoliticaRetencionUI(resultado);
}

async function editarPedidoEnCarrito(idPedido) {
    const pedidos = await window.posAPI.obtenerPedidosPendientes();
    const pedido = pedidos.find(item => item.ID_Pedido === idPedido);
    if (!pedido) return alert('El pedido ya no está pendiente.');

    const detalles = await window.posAPI.obtenerDetallesPedido(idPedido);
    if (!detalles.length) return alert('El pedido no tiene productos recuperables.');

    const cargado = window.cargarDocumentoEnCarrito(detalles, {
        cliente: pedido.Cliente,
        nit: 'CF',
        etiqueta: `Editando pedido #${idPedido}`,
        pedidoEdicion: {
            id_pedido: idPedido,
            cliente: pedido.Cliente,
            telefono: pedido.Telefono,
            anticipo: pedido.Anticipo
        }
    });
    if (cargado) cerrarHistorialPedidos();
}

async function cargarCotizacionesPendientes() {
    const list = document.getElementById('historial-pedidos-list');
    list.innerHTML = '<div class="text-center p-4 text-slate-500 font-bold uppercase text-xs animate-pulse">Cargando cotizaciones...</div>';
    const cotizaciones = await window.posAPI.obtenerCotizaciones(pendientesFechaActual);

    if (!cotizaciones.length) {
        list.innerHTML = '<div class="text-center p-8 text-slate-400 font-bold text-xs uppercase">No hay cotizaciones para este día.</div>';
        return;
    }

    list.innerHTML = cotizaciones.map(cotizacion => `
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center gap-4">
            <div>
                <h4 class="font-black text-slate-800 text-sm uppercase">Cotización #${cotizacion.id}</h4>
                <p class="text-[10px] text-slate-500 font-bold">${cotizacion.cliente || 'CF'} · NIT ${cotizacion.nit || 'CF'}</p>
                <p class="text-[10px] text-slate-400 font-bold">${cotizacion.fecha} ${cotizacion.hora} · ${cotizacion.cajero || ''}</p>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-xl font-black text-blue-900">Q${Number(cotizacion.total).toFixed(2)}</span>
                <button onclick="recuperarCotizacion(${cotizacion.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2">
                    <i class="fas fa-cart-arrow-down"></i> Recuperar para cobrar
                </button>
            </div>
        </div>
    `).join('');
}

async function recuperarCotizacion(idTicket) {
    const cotizaciones = await window.posAPI.obtenerCotizaciones(pendientesFechaActual);
    const cotizacion = cotizaciones.find(item => item.id === idTicket);
    if (!cotizacion) return alert('La cotización ya no está disponible.');
    const detalles = await window.posAPI.obtenerDetalleTicket(idTicket);
    if (!detalles.length) return alert('La cotización no contiene productos.');

    const cargado = window.cargarDocumentoEnCarrito(detalles, {
        cliente: cotizacion.cliente,
        nit: cotizacion.nit,
        etiqueta: `Cotización #${idTicket} recuperada`
    });
    if (cargado) cerrarHistorialPedidos();
}

async function cargarCuentasPorCobrar() {
    const list = document.getElementById('historial-pedidos-list');
    list.innerHTML = '<div class="text-center p-4 text-slate-500 font-bold uppercase text-xs animate-pulse">Cargando cuentas...</div>';
    const cuentas = await window.posAPI.obtenerCuentasCobrar(pendientesFechaActual);

    if (!cuentas.length) {
        list.innerHTML = '<div class="text-center p-8 text-slate-400 font-bold text-xs uppercase">No hay cuentas por cobrar creadas este día.</div>';
        return;
    }

    list.innerHTML = cuentas.map(cuenta => {
        const pendiente = cuenta.Estado === 'PENDIENTE';
        return `
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div class="flex justify-between items-start gap-4">
                    <div>
                        <h4 class="font-black text-slate-800 text-sm uppercase">Cuenta #${cuenta.ID_Cuenta} · Ticket #${cuenta.ID_Ticket_Origen}</h4>
                        <p class="text-xs text-slate-600 font-bold">${cuenta.Cliente} · NIT ${cuenta.NIT || 'CF'}</p>
                        <p class="text-[10px] text-slate-400 font-bold">${cuenta.Fecha_Ticket} ${cuenta.Hora_Ticket} · ${cuenta.Cajero || ''}</p>
                    </div>
                    <span class="${pendiente ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} font-black text-[10px] px-2 py-1 rounded uppercase">${cuenta.Estado}</span>
                </div>
                <div class="flex justify-between items-center bg-white border border-slate-100 rounded-lg p-3 gap-3">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase">Deuda original Q${Number(cuenta.Total_Original).toFixed(2)}</p>
                        <p class="text-xl font-black ${pendiente ? 'text-red-600' : 'text-emerald-600'}">Saldo Q${Number(cuenta.Saldo_Actual).toFixed(2)}</p>
                    </div>
                    ${pendiente ? `
                        <input id="abono-cuenta-${cuenta.ID_Cuenta}" type="number" min="0.01" step="0.01" max="${cuenta.Saldo_Actual}" placeholder="Monto" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()" class="w-28 p-2 border-2 border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500">
                        <select id="metodo-cuenta-${cuenta.ID_Cuenta}" class="p-2 border-2 border-slate-200 rounded-lg text-xs font-bold">
                            <option value="EFECTIVO">EFECTIVO</option>
                            <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                            <option value="TARJETA">TARJETA</option>
                        </select>
                        <button onclick="abonarCuenta(${cuenta.ID_Cuenta}, ${cuenta.Saldo_Actual}, false)" class="bg-blue-600 text-white px-3 py-2 rounded-lg font-black text-xs uppercase">Abonar</button>
                        <button onclick="abonarCuenta(${cuenta.ID_Cuenta}, ${cuenta.Saldo_Actual}, true)" class="bg-emerald-600 text-white px-3 py-2 rounded-lg font-black text-xs uppercase">Liquidar</button>
                    ` : ''}
                    <button onclick="verAuditoriaCuenta(${cuenta.ID_Cuenta}, ${cuenta.ID_Ticket_Origen})" class="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-black text-xs uppercase">Auditoría</button>
                </div>
                <div id="auditoria-cuenta-${cuenta.ID_Cuenta}" class="hidden bg-white border border-slate-200 rounded-lg p-3 text-xs"></div>
            </div>
        `;
    }).join('');
}

async function abonarCuenta(idCuenta, saldo, liquidar) {
    const input = document.getElementById(`abono-cuenta-${idCuenta}`);
    const metodo = document.getElementById(`metodo-cuenta-${idCuenta}`)?.value || 'EFECTIVO';
    const monto = liquidar ? Number(saldo) : Number(input?.value || 0);
    if (monto <= 0) return alert('Ingresa un monto de abono válido.');
    if (!confirm(`${liquidar ? '¿Liquidar' : '¿Registrar abono en'} la cuenta #${idCuenta} por Q${monto.toFixed(2)}?`)) return;

    const resultado = await window.posAPI.registrarAbonoCuenta({ id_cuenta: idCuenta, monto, metodo_pago: metodo });
    if (!resultado.success) return alert(`No se pudo registrar el abono: ${resultado.error}`);
    alert(resultado.estado === 'LIQUIDADA' ? 'Cuenta liquidada correctamente.' : `Abono registrado. Saldo: Q${Number(resultado.saldo).toFixed(2)}.`);
    
    // Imprimir Comprobante de Abono
    const shouldPrint = (localStorage.getItem('imprimir_ticket') !== 'false');
    if (shouldPrint && resultado.id_abono) {
        window.imprimirTicketDocumento({ 
            ticketId: resultado.id_abono,
            ticketType: 'ABONO_CXC'
        }).catch(err => console.error("Error imprimiendo abono:", err));
    }

    await cargarCuentasPorCobrar();
}

async function verAuditoriaCuenta(idCuenta, idTicket) {
    const container = document.getElementById(`auditoria-cuenta-${idCuenta}`);
    if (!container.classList.contains('hidden')) {
        container.classList.add('hidden');
        return;
    }
    const [detalles, abonos] = await Promise.all([
        window.posAPI.obtenerDetalleTicket(idTicket),
        window.posAPI.obtenerAbonosCuenta(idCuenta)
    ]);
    const lineas = detalles.map(item => `<div class="flex justify-between"><span>${item.cantidad}x ${item.descripcion}</span><strong>Q${Number(item.subtotal).toFixed(2)}</strong></div>`).join('');
    const pagos = abonos.length
        ? abonos.map(abono => `<div class="flex justify-between text-emerald-700"><span>${window.formatearFechaHora(abono.Fecha_Hora)} · ${abono.Metodo_Pago} · ${abono.Cajero}</span><strong>+ Q${Number(abono.Monto).toFixed(2)} · saldo Q${Number(abono.Saldo_Resultante).toFixed(2)}</strong></div>`).join('')
        : '<p class="text-slate-400">Sin abonos registrados.</p>';
    container.innerHTML = `<p class="font-black uppercase text-slate-500 mb-2">Productos del ticket</p>${lineas}<p class="font-black uppercase text-slate-500 mt-3 mb-2">Historial de abonos</p>${pagos}`;
    container.classList.remove('hidden');
}

async function liquidarPedido(idPedido, saldo) {
    if (!confirm(`¿Estás seguro de liquidar el pedido #${idPedido} por el saldo de Q${saldo.toFixed(2)}? \n\nEsto generará el ticket de venta final.`)) return;

    const selectElem = document.getElementById(`metodo-saldo-${idPedido}`);
    const methodClean = selectElem ? selectElem.value : 'EFECTIVO';

    try {
        const res = await window.posAPI.liquidarPedido({ id_pedido: idPedido, metodo_pago: methodClean });
        if (res.success) {
            alert(`Pedido #${idPedido} liquidado correctamente. Ticket de Saldo #${res.id_ticket} generado.`);
            
            // Imprimir Ticket Final (Este es un ticket normal, pero con una línea negativa que descuenta el anticipo)
            const checkbox = document.getElementById('cobro-imprimir-ticket');
            const shouldPrint = checkbox ? checkbox.checked : (localStorage.getItem('imprimir_ticket') !== 'false');
            if (shouldPrint) {
                window.imprimirTicketDocumento({
                    ticketId: res.id_ticket,
                    customTitle: `LIQ. PEDIDO #${idPedido}`
                });
            }

            cargarHistorialPedidos();
            
            if (typeof window.cargarTop20 === 'function') {
                await window.cargarTop20();
            }
        } else {
            alert("Error al liquidar el pedido:\n" + res.error);
        }
    } catch (err) {
        alert("Ocurrió un error al liquidar:\n" + err.message);
        console.error(err);
    }
}

// Exportar globalmente
window.abrirHistorialPedidos = abrirHistorialPedidos;
window.cerrarHistorialPedidos = cerrarHistorialPedidos;
window.cargarHistorialPedidos = cargarHistorialPedidos;
window.liquidarPedido = liquidarPedido;
window.activarTabPendientes = activarTabPendientes;
window.editarPedidoEnCarrito = editarPedidoEnCarrito;
window.recuperarCotizacion = recuperarCotizacion;
window.abonarCuenta = abonarCuenta;
window.verAuditoriaCuenta = verAuditoriaCuenta;
window.cambiarDiaPendientes = cambiarDiaPendientes;
window.seleccionarFechaPendientes = seleccionarFechaPendientes;
window.irHoyPendientes = irHoyPendientes;
window.programarRetencionCotizaciones = programarRetencionCotizaciones;
