/**
 * admin_reportes.js
 * Módulo para gestionar los reportes de ventas locales y en SQL.
 */

function renderAdminHistoryList() {
    const history = JSON.parse(localStorage.getItem('reportHistory') || "[]");
    const dailyLog = JSON.parse(localStorage.getItem('dailyLog') || "[]");

    let html = '';
    if (dailyLog.length > 0) {
        html += `<button onclick="renderAdminDetail('hoy')" class="w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 p-3 rounded-lg font-bold text-xs mb-2 transition-colors flex justify-between items-center">
            <span>HOY (En curso)</span> <i class="fas fa-clock text-blue-400"></i>
        </button>`;
    }

    history.slice().reverse().forEach((rep, idx) => {
        html += `<button onclick="renderAdminDetail(${idx})" class="w-full text-left bg-white hover:bg-slate-50 border p-3 rounded-lg font-bold text-xs text-slate-600 mb-2 transition-colors">
            <div class="flex justify-between items-center mb-1">
                <span class="text-slate-800">${rep.dateStr}</span>
                <span class="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">${rep.user}</span>
            </div>
            <div class="text-[10px] text-slate-400">Total: Q${rep.totalCash.toFixed(2)} (${rep.count} trans.)</div>
        </button>`;
    });

    document.getElementById('admin-history-list').innerHTML = html;
    if (dailyLog.length > 0) renderAdminDetail('hoy');
    else if (history.length > 0) renderAdminDetail(0);
    else document.getElementById('admin-detail-content').innerHTML = '<p class="text-slate-400 text-sm text-center mt-10 font-bold">No hay reportes.</p>';
}

function renderAdminDetail(indexId) {
    let data;
    if (indexId === 'hoy') {
        const log = JSON.parse(localStorage.getItem('dailyLog') || "[]");
        let breakdown = {};
        let payments = { 'EFECTIVO': 0, 'TRANSFERENCIA': 0, 'TARJETA': 0, 'CREDITO': 0 };
        let total = 0;
        log.forEach(sale => {
            total += sale.total;
            let method = sale.metodoPago || 'EFECTIVO';
            if (!payments[method]) payments[method] = 0;
            payments[method] += sale.total;
            sale.items.forEach(item => {
                let cat = item.categoria || (item.nombre.includes("ORDEN ST") ? "TECNICO" : "VARIOS");
                if (!breakdown[cat]) breakdown[cat] = 0;
                breakdown[cat] += (item.precioUnit * item.cant);
            });
        });
        data = { dateStr: new Date().toLocaleDateString() + " (EN CURSO)", user: localStorage.getItem('currentUser') || 'N/A', totalCash: total, count: log.length, breakdown: breakdown, payments: payments };
    } else {
        const history = JSON.parse(localStorage.getItem('reportHistory') || "[]");
        data = history[history.length - 1 - indexId];
    }

    document.getElementById('admin-detail-title').innerText = `Reporte del ${data.dateStr} - Cajero: ${data.user}`;
    let html = `<div class="mb-6"><div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ingresos</div><div class="text-4xl font-black text-blue-900 tracking-tighter">Q ${data.totalCash.toFixed(2)}</div><div class="text-xs font-bold text-slate-500 mt-1">${data.count} transacciones</div></div>`;

    if (data.payments) {
        html += `<div class="flex gap-2 mb-6">`;
        const icons = { 'EFECTIVO': '💵', 'TRANSFERENCIA': '📱', 'TARJETA': '💳', 'CREDITO': '🤝' };
        Object.keys(data.payments).forEach(p => {
            if (data.payments[p] > 0) {
                html += `<div class="bg-white p-2 rounded-lg border flex-1 text-center shadow-sm"><div class="text-[9px] font-bold text-slate-400 uppercase">${icons[p] || ''} ${p}</div><div class="font-black text-slate-700 text-sm">Q${data.payments[p].toFixed(2)}</div></div>`;
            }
        });
        html += `</div>`;
    }

    html += `<div class="space-y-2">`;
    const sorted = Object.keys(data.breakdown).sort();
    sorted.forEach(cat => {
        if (data.breakdown[cat] > 0) {
            html += `<div class="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                <span class="font-bold text-xs text-slate-700">${cat}</span>
                <span class="font-black text-sm text-blue-800">Q ${data.breakdown[cat].toFixed(2)}</span>
            </div>`;
        }
    });
    html += `</div>`;
    document.getElementById('admin-detail-content').innerHTML = html;
}

function enviarReporteZ(data) {
    // Reporte Z manejado localmente
}

let reportesTurnosSql = [];

async function renderAdminHistorySql() {
    if (!window.posAPI) return;
    reportesTurnosSql = await window.posAPI.obtenerReportesTurnos();
    const container = document.getElementById('admin-history-list');
    if (!container) return;
    if (reportesTurnosSql.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm text-center mt-10 font-bold">No hay reportes SQL.</p>';
        document.getElementById('admin-detail-content').innerHTML = '';
        return;
    }
    container.innerHTML = reportesTurnosSql.map((reporte, index) => `
        <button onclick="renderAdminDetailSql(${index})" class="w-full text-left bg-white hover:bg-slate-50 border p-3 rounded-lg font-bold text-xs text-slate-600 mb-2 transition-colors">
            <div class="flex justify-between items-center mb-1"><span class="text-slate-800">Turno #${reporte.id_sesion}</span><span class="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">${reporte.estado}</span></div>
            <div class="text-[10px] text-slate-400">${reporte.cajero} | Total Q${Number(reporte.total || 0).toFixed(2)}</div>
            <div class="text-[10px] text-red-500">Descuento Q${Number(reporte.descuento || 0).toFixed(2)} | Terceros Q${Number(reporte.terceros || 0).toFixed(2)}</div>
        </button>`).join('');
    renderAdminDetailSql(0);
}

function renderAdminDetailSql(index) {
    const reporte = reportesTurnosSql[index];
    if (!reporte) return;
    const money = value => Number(value || 0).toFixed(2);
    document.getElementById('admin-detail-title').innerText = `Turno #${reporte.id_sesion} - ${reporte.cajero}`;
    document.getElementById('admin-detail-content').innerHTML = `
        <div class="space-y-3">
            <div class="text-xs font-bold text-slate-500">Desde: ${reporte.desde || '--'}<br>Hasta: ${reporte.hasta || 'EN CURSO'}</div>
            <div class="text-4xl font-black text-blue-900">Q ${money(reporte.total)}</div>
            <div class="text-xs font-bold text-slate-500">${reporte.transacciones || 0} transacciones</div>
            <div class="grid grid-cols-2 gap-2">
                <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-lg"><div class="text-[9px] font-black uppercase text-emerald-700">Efectivo</div><div class="font-black">Q ${money(reporte.efectivo)}</div></div>
                <div class="bg-slate-50 border p-3 rounded-lg"><div class="text-[9px] font-black uppercase text-slate-500">No efectivo</div><div class="font-black">Q ${money(reporte.no_efectivo)}</div></div>
                <div class="bg-red-50 border border-red-200 p-3 rounded-lg"><div class="text-[9px] font-black uppercase text-red-700">Descuento general</div><div class="font-black">Q ${money(reporte.descuento)}</div></div>
                <div class="bg-amber-50 border border-amber-200 p-3 rounded-lg"><div class="text-[9px] font-black uppercase text-amber-700">Pagos de terceros</div><div class="font-black">Q ${money(reporte.terceros)}</div></div>
            </div>
        </div>`;
}

// Exportar globalmente
window.renderAdminHistoryList = renderAdminHistoryList;
window.renderAdminDetail = renderAdminDetail;
window.enviarReporteZ = enviarReporteZ;
window.renderAdminHistorySql = renderAdminHistorySql;
window.renderAdminDetailSql = renderAdminDetailSql;
window.reportesTurnosSql = reportesTurnosSql;
