/**
 * cobro_caja.js
 * Módulo para gestionar el proceso final de cobro, ingreso de efectivo y cálculo de vuelto.
 */

let totalVentaActual = 0;

function abrirModalCobro() {
    // Si cart no está definido globalmente, tratar de buscarlo o abortar
    if (typeof cart === 'undefined' || cart.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const isCotizacion = document.getElementById('toggle-cotizacion') && document.getElementById('toggle-cotizacion').checked;
    const isPedido = document.getElementById('toggle-pedido') && document.getElementById('toggle-pedido').checked;

    if (isCotizacion) {
        if (typeof window.procesarCobroVenta === 'function') window.procesarCobroVenta();
        return;
    }

    const paymentMethod = document.getElementById('payment-method')?.value || 'EFECTIVO';
    // Si no es efectivo Y no es pedido, pasamos directo
    if (paymentMethod !== 'EFECTIVO' && !isPedido) {
        if (typeof window.procesarCobroVenta === 'function') window.procesarCobroVenta();
        return;
    }

    const total = cart.reduce((acc, i) => acc + (typeof i.subtotal !== 'undefined' ? i.subtotal : ((i.precioUnit || i.price || 0) * (i.cant || i.cantidad || i.qty || 1))), 0);
    
    totalVentaActual = (typeof redondearCaja === 'function') ? redondearCaja(total) : total;
    window.totalVentaActual = totalVentaActual;

    document.getElementById('cobro-total-display').innerText = `Q${totalVentaActual.toFixed(2)}`;
    document.getElementById('input-efectivo-recibido').value = '';
    document.getElementById('cobro-vuelto-display').innerText = 'Q0.00';
    document.getElementById('cobro-vuelto-display').classList.remove('text-red-500');
    document.getElementById('cobro-vuelto-display').classList.add('text-blue-600');

    // Manejo de UI de Modo Pedido
    const camposPedido = document.getElementById('cobro-campos-pedido');
    const labelEfectivo = document.querySelector('label[for="input-efectivo-recibido"]') || document.getElementById('label-efectivo-recibido');
    
    if (isPedido) {
        if (camposPedido) camposPedido.classList.remove('hidden');
        if (labelEfectivo) labelEfectivo.innerText = "Anticipo / Monto Recibido";
        const nom = document.getElementById('pedido-cliente-nombre');
        const tel = document.getElementById('pedido-cliente-telefono');
        if (nom) nom.value = '';
        if (tel) tel.value = '';
    } else {
        if (camposPedido) camposPedido.classList.add('hidden');
        if (labelEfectivo) labelEfectivo.innerText = "Efectivo Recibido";
    }

    const printCheckbox = document.getElementById('cobro-imprimir-ticket');
    if (printCheckbox) {
        const val = localStorage.getItem('imprimir_ticket');
        if (val !== null) printCheckbox.checked = val === 'true';
    }

    document.getElementById('modal-cobro').classList.remove('hidden');
    setTimeout(() => {
        if (isPedido) {
            document.getElementById('pedido-cliente-nombre')?.focus();
        } else {
            document.getElementById('input-efectivo-recibido')?.focus();
        }
    }, 100);
}

function cerrarModalCobro() {
    document.getElementById('modal-cobro').classList.add('hidden');
    if (document.getElementById('main-search')) document.getElementById('main-search').focus();
}

function calcularVuelto(e) {
    const inputElement = document.getElementById('input-efectivo-recibido');
    
    if (inputElement.validity.badInput) return;

    const inputVal = inputElement.value;
    const displayVuelto = document.getElementById('cobro-vuelto-display');
    const isPedido = document.getElementById('toggle-pedido') && document.getElementById('toggle-pedido').checked;

    if (inputVal === '') {
        displayVuelto.innerText = isPedido ? `Q${totalVentaActual.toFixed(2)} (SALDO)` : 'Q0.00 (EXACTO)';
        displayVuelto.classList.remove('text-red-500');
        displayVuelto.classList.add('text-blue-600');
    } else {
        const recibido = parseFloat(inputVal) || 0;
        const vuelto = recibido - totalVentaActual;
        if (vuelto < 0) {
            displayVuelto.innerText = isPedido ? `Q${Math.abs(vuelto).toFixed(2)} (SALDO)` : `-Q${Math.abs(vuelto).toFixed(2)} (FALTA)`;
            displayVuelto.classList.remove('text-blue-600');
            displayVuelto.classList.add('text-red-500');
        } else {
            displayVuelto.innerText = `Q${vuelto.toFixed(2)}`;
            displayVuelto.classList.remove('text-red-500');
            displayVuelto.classList.add('text-blue-600');
        }
    }

    if (e && e.key === 'Enter') {
        confirmarVentaFinal();
    }
}

function confirmarVentaFinal() {
    const inputElement = document.getElementById('input-efectivo-recibido');
    if (inputElement.validity.badInput) {
        alert("El monto ingresado no es válido.");
        return;
    }
    
    const inputVal = inputElement.value;
    const recibido = parseFloat(inputVal) || 0;
    const isPedido = document.getElementById('toggle-pedido') && document.getElementById('toggle-pedido').checked;

    if (!isPedido && inputVal !== '' && recibido < totalVentaActual) {
        alert("El efectivo recibido es menor al total de la venta.");
        return;
    }

    if (isPedido) {
        const nom = document.getElementById('pedido-cliente-nombre')?.value.trim();
        const tel = document.getElementById('pedido-cliente-telefono')?.value.trim();
        if (!nom || !tel) {
            alert("Para generar un pedido, el Nombre del Cliente y el Teléfono son obligatorios.");
            return;
        }
        window.datosPedidoTemp = { nombre: nom, telefono: tel, anticipo: recibido };
    }

    cerrarModalCobro();

    if (typeof window.procesarCobroVenta === 'function') window.procesarCobroVenta();
}

// Exportar globalmente
window.totalVentaActual = totalVentaActual;
window.abrirModalCobro = abrirModalCobro;
window.cerrarModalCobro = cerrarModalCobro;
window.calcularVuelto = calcularVuelto;
window.confirmarVentaFinal = confirmarVentaFinal;
