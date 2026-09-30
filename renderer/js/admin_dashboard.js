window.loadAdminDashboard = async function () {
    const container = document.getElementById('dashboard-container');
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-center h-full w-full">
            <div class="text-center text-slate-400">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p class="font-bold text-sm tracking-widest uppercase">Cargando Métricas...</p>
            </div>
        </div>
    `;

    try {
        const metrics = await window.posAPI.obtenerMetricasDashboard();
        renderDashboard(container, metrics);
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
                <i class="fas fa-exclamation-triangle mr-2"></i> Error al cargar las métricas: ${err.message}
            </div>
        `;
    }
};

function renderDashboard(container, metrics) {
    const { topProductos, topServicios, ventasPorDia, resumenInventario, resumenDescuentos } = metrics;
    const stockLibre = window.stockNegativoPermitido?.() === true;

    // Calcular máximos para barras de progreso
    const maxProductoVentas = topProductos.length > 0 ? Math.max(...topProductos.map(p => p.total_vendido)) : 0;
    const maxServicioVentas = topServicios.length > 0 ? Math.max(...topServicios.map(s => s.total_vendido)) : 0;
    const maxDiaVentas = ventasPorDia.length > 0 ? Math.max(...ventasPorDia.map(d => d.total)) : 0;

    const formatMoney = (val) => `Q${Number(val || 0).toFixed(2)}`;

    let html = `
        <!-- Tarjetas Resumen Inventario -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div class="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xs font-bold uppercase tracking-widest text-blue-100">Total Productos</h3>
                    <i class="fas fa-box-open text-2xl text-blue-300/50"></i>
                </div>
                <p class="text-3xl font-black">${resumenInventario.totalProductos || 0}</p>
                <p class="text-[10px] text-blue-200 mt-2">Registrados en Sala</p>
            </div>

            ${stockLibre ? '' : `<div id="btn-bajo-stock" class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xs font-bold uppercase tracking-widest text-amber-100">Bajo Stock</h3>
                    <i class="fas fa-exclamation-triangle text-2xl text-amber-300/50"></i>
                </div>
                <p class="text-3xl font-black">${resumenInventario.bajoStock || 0}</p>
                <p class="text-[10px] text-amber-200 mt-2">Productos con cantidad &le; 5</p>
            </div>`}

            <div class="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xs font-bold uppercase tracking-widest text-emerald-100">Valor Inventario</h3>
                    <i class="fas fa-money-bill-wave text-2xl text-emerald-300/50"></i>
                </div>
                <p class="text-3xl font-black">${formatMoney(resumenInventario.valorTotal)}</p>
                <p class="text-[10px] text-emerald-200 mt-2">Costo total en Sala</p>
            </div>

            <button id="btn-dashboard-descuentos" class="bg-white border-2 border-red-200 rounded-lg p-5 text-left shadow-sm hover:bg-red-50 transition-colors">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xs font-black uppercase text-red-700">Descuentos hoy</h3>
                    <i class="fas fa-tags text-2xl text-red-300"></i>
                </div>
                <p class="text-3xl font-black text-red-700">Q${Number(resumenDescuentos?.total || 0).toFixed(2)}</p>
                <p class="text-[10px] font-bold text-slate-400 mt-2">${Number(resumenDescuentos?.cantidad || 0)} tickets · Ver auditoría</p>
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- Top Productos -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                <h3 class="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center">
                    <i class="fas fa-shopping-cart text-blue-500 mr-2"></i> Top 5 Productos
                </h3>
                <div class="flex-1 flex flex-col gap-3">
                    ${topProductos.length === 0 ? '<p class="text-xs text-slate-400 italic">No hay datos suficientes</p>' : ''}
                    ${topProductos.map(p => {
                        const pct = maxProductoVentas > 0 ? (p.total_vendido / maxProductoVentas) * 100 : 0;
                        return `
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between items-end text-xs">
                                <span class="font-bold text-slate-700 truncate pr-2" title="${p.nombre}">${p.nombre}</span>
                                <span class="font-black text-slate-900 shrink-0">${p.total_vendido} uds. <span class="text-[9px] text-slate-400 font-normal">(${formatMoney(p.ingresos)})</span></span>
                            </div>
                            <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div class="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" style="width: ${pct}%"></div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <!-- Top Servicios -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                <h3 class="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center">
                    <i class="fas fa-concierge-bell text-purple-500 mr-2"></i> Top 5 Servicios
                </h3>
                <div class="flex-1 flex flex-col gap-3">
                    ${topServicios.length === 0 ? '<p class="text-xs text-slate-400 italic">No hay datos suficientes</p>' : ''}
                    ${topServicios.map(s => {
                        const pct = maxServicioVentas > 0 ? (s.total_vendido / maxServicioVentas) * 100 : 0;
                        return `
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between items-end text-xs">
                                <span class="font-bold text-slate-700 truncate pr-2" title="${s.nombre}">${s.nombre}</span>
                                <span class="font-black text-slate-900 shrink-0">${s.total_vendido} uds. <span class="text-[9px] text-slate-400 font-normal">(${formatMoney(s.ingresos)})</span></span>
                            </div>
                            <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div class="h-full bg-purple-500 rounded-full transition-all duration-1000 ease-out" style="width: ${pct}%"></div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <!-- Ventas por Día (Gráfico Chart.js) -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col lg:col-span-2">
                <h3 class="text-sm font-black text-slate-700 uppercase tracking-widest mb-2 flex items-center">
                    <i class="fas fa-chart-line text-emerald-500 mr-2"></i> Ventas de los últimos 7 días activos
                </h3>
                <div class="flex-1 w-full relative" style="min-height: 200px;">
                    <canvas id="ventasChart"></canvas>
                </div>
            </div>

        </div>
    `;

    container.innerHTML = html;

    // Asignar evento click manualmente al botón de bajo stock
    const btnBajoStock = document.getElementById('btn-bajo-stock');
    if (btnBajoStock) {
        btnBajoStock.addEventListener('click', () => {
            window.verProductosBajoStock();
        });
    }

    document.getElementById('btn-dashboard-descuentos')?.addEventListener('click', () => abrirModalDescuentos());

    // Dibujar gráfico con Chart.js
    const ctx = document.getElementById('ventasChart');
    
    let ChartLib = typeof Chart !== 'undefined' ? Chart : undefined;
    if (!ChartLib && typeof window !== 'undefined' && window.Chart) ChartLib = window.Chart;
    if (!ChartLib && typeof require !== 'undefined') {
        try { ChartLib = require('./chart.umd.js'); } catch (e) {}
    }

    if (ctx && ChartLib && (ventasPorDia.length > 0 || metrics.gastosPorDia.length > 0)) {
        // Extraer labels unificando fechas de ventas y gastos
        const dateSet = new Set();
        ventasPorDia.forEach(d => dateSet.add(d.fecha));
        metrics.gastosPorDia.forEach(d => dateSet.add(d.fecha));
        const allDates = Array.from(dateSet).sort();
        
        const labels = allDates.map(d => d.substring(5)); // Ejemplo: "09-15"
        
        const dataVentas = allDates.map(date => {
            const v = ventasPorDia.find(d => d.fecha === date);
            return v ? v.total : 0;
        });
        
        const dataGastos = allDates.map(date => {
            const g = metrics.gastosPorDia.find(d => d.fecha === date);
            return g ? g.total : 0;
        });
        
        new ChartLib(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ingresos (Q)',
                        data: dataVentas,
                        backgroundColor: '#10b981', // emerald-500
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Gastos (Q)',
                        data: dataGastos,
                        backgroundColor: '#ef4444', // red-500
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': Q' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            callback: function(value) { return 'Q' + value; },
                            font: { size: 10 }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: 'bold' } }
                    }
                }
            }
        });
    }
}

let fechaDescuentosDashboard = window.fechaLocalISO();

function escaparDashboard(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
}

async function abrirModalDescuentos(fecha = window.fechaLocalISO()) {
    fechaDescuentosDashboard = fecha;
    let modal = document.getElementById('modal-dashboard-descuentos');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-dashboard-descuentos';
        modal.className = 'fixed inset-0 z-[210] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    modal.innerHTML = '<div class="bg-white rounded-lg w-full max-w-5xl h-[85vh] flex items-center justify-center text-slate-400 font-bold">Cargando descuentos...</div>';

    const resultado = await window.posAPI.obtenerTicketsConDescuento(fechaDescuentosDashboard);
    const tickets = resultado?.success ? resultado.data : [];
    const totalDescuento = tickets.reduce((acc, ticket) => acc + Number(ticket.descuento || 0), 0);
    const totalNeto = tickets.reduce((acc, ticket) => acc + Number(ticket.total || 0), 0);
    const fechaTitulo = window.formatearFechaLarga(fechaDescuentosDashboard);

    modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div class="p-5 border-b flex justify-between items-center">
                <div>
                    <h2 class="font-black text-slate-800 uppercase"><i class="fas fa-tags text-red-600 mr-2"></i>Tickets con descuento</h2>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mt-1">${escaparDashboard(fechaTitulo)}</p>
                </div>
                <button onclick="cerrarModalDescuentosDashboard()" class="w-10 h-10 text-slate-400 hover:text-red-600"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-3 bg-slate-50 border-b flex items-center justify-between gap-3">
                <button onclick="navegarDescuentosDashboard(-1)" class="w-10 h-10 bg-white border rounded-lg" title="Día anterior"><i class="fas fa-chevron-left"></i></button>
                <div class="flex items-center gap-3">
                    <input type="date" value="${fechaDescuentosDashboard}" onchange="abrirModalDescuentos(this.value)" class="p-2 border rounded-lg text-xs font-black">
                    <button onclick="abrirModalDescuentos()" class="px-3 py-2 bg-white border rounded-lg text-[10px] font-black uppercase text-blue-700">Hoy</button>
                </div>
                <button onclick="navegarDescuentosDashboard(1)" class="w-10 h-10 bg-white border rounded-lg" title="Día siguiente"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="grid grid-cols-3 gap-3 p-4 border-b">
                <div class="bg-slate-50 border rounded-lg p-3"><p class="text-[9px] font-black text-slate-400 uppercase">Tickets</p><p class="text-xl font-black text-slate-800">${tickets.length}</p></div>
                <div class="bg-red-50 border border-red-200 rounded-lg p-3"><p class="text-[9px] font-black text-red-500 uppercase">Total descontado</p><p class="text-xl font-black text-red-700">Q${totalDescuento.toFixed(2)}</p></div>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3"><p class="text-[9px] font-black text-blue-500 uppercase">Total neto cobrado</p><p class="text-xl font-black text-blue-800">Q${totalNeto.toFixed(2)}</p></div>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-2">
                ${tickets.length ? tickets.map(ticket => `
                    <div class="border border-slate-200 rounded-lg p-3 bg-white">
                        <div class="flex justify-between items-center gap-4">
                            <div>
                                <p class="font-black text-slate-800 text-sm">Ticket #${ticket.id} · ${escaparDashboard(ticket.hora)}</p>
                                <p class="text-[10px] font-bold text-slate-500">${escaparDashboard(ticket.cliente || 'CF')} · ${escaparDashboard(ticket.cajero || '')} · ${escaparDashboard(ticket.terminal || 'CAJA_1')}</p>
                                <p class="text-xs font-bold text-red-700 mt-1">Motivo: ${escaparDashboard(ticket.motivo || 'Sin justificación registrada')}</p>
                            </div>
                            <div class="text-right shrink-0">
                                <p class="font-black text-red-600">-Q${Number(ticket.descuento).toFixed(2)}</p>
                                <p class="text-xs font-black text-blue-900">Neto Q${Number(ticket.total).toFixed(2)}</p>
                                <button onclick="verDetalleDescuentoDashboard(${ticket.id})" class="text-[10px] font-black text-blue-600 uppercase mt-1">Ver ticket</button>
                            </div>
                        </div>
                        <div id="detalle-descuento-${ticket.id}" class="hidden border-t mt-3 pt-3 text-xs"></div>
                    </div>
                `).join('') : '<p class="text-center text-slate-400 font-bold text-xs uppercase py-10">No hubo descuentos este día.</p>'}
            </div>
        </div>`;
}

async function navegarDescuentosDashboard(dias) {
    const fecha = window.sumarDiasFecha(fechaDescuentosDashboard, dias);
    await abrirModalDescuentos(window.fechaLocalISO(fecha));
}

async function verDetalleDescuentoDashboard(idTicket) {
    const container = document.getElementById(`detalle-descuento-${idTicket}`);
    if (!container) return;
    if (!container.classList.contains('hidden')) return container.classList.add('hidden');
    const items = await window.posAPI.obtenerDetalleTicket(idTicket);
    container.innerHTML = items.map(item => `
        <div class="flex justify-between py-1 ${item.categoria === 'DESCUENTO' ? 'text-red-600 font-bold' : 'text-slate-600'}">
            <span>${Number(item.cantidad)}x ${escaparDashboard(item.descripcion)}</span><span>Q${Number(item.subtotal).toFixed(2)}</span>
        </div>`).join('') || '<p class="text-slate-400">Sin detalle.</p>';
    container.classList.remove('hidden');
}

function cerrarModalDescuentosDashboard() {
    document.getElementById('modal-dashboard-descuentos')?.classList.add('hidden');
}

window.abrirModalDescuentos = abrirModalDescuentos;
window.navegarDescuentosDashboard = navegarDescuentosDashboard;
window.verDetalleDescuentoDashboard = verDetalleDescuentoDashboard;
window.cerrarModalDescuentosDashboard = cerrarModalDescuentosDashboard;

window.verProductosBajoStock = async function() {
    if (window.stockNegativoPermitido?.()) return;
    try {
        const res = await window.posAPI.obtenerTodoInventario('SALA');
        if (!res) return;
        
        const bajos = (Array.isArray(res) ? res : []).filter(p => p.Stock <= 5);
        
        let modal = document.getElementById('modal-bajo-stock');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-bajo-stock';
            document.body.appendChild(modal);
        }
        modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 hidden';

        let listaHtml = bajos.length > 0 
            ? bajos.map(p => `
                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-800 text-sm">${p.Descripcion}</span>
                        <span class="text-[10px] text-slate-500">COD: ${p.Codigo}</span>
                    </div>
                    <div class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-black text-sm border border-amber-200">
                        ${p.Stock} uds.
                    </div>
                </div>
              `).join('')
            : '<p class="text-center text-slate-500 py-6 text-sm italic">No hay productos con bajo stock.</p>';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh] animate-fade-in-up">
                <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-5 flex justify-between items-center text-white">
                    <h2 class="font-black text-lg tracking-wide"><i class="fas fa-exclamation-triangle mr-2"></i> Productos con Bajo Stock</h2>
                    <button onclick="document.getElementById('modal-bajo-stock').classList.add('hidden')" class="hover:bg-black/20 w-8 h-8 flex items-center justify-center rounded-full transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-5 flex-1 overflow-y-auto flex flex-col gap-3">
                    ${listaHtml}
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    } catch (err) {
        console.error('Error al obtener bajo stock:', err);
    }
};
