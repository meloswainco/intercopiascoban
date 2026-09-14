/**
 * admin_tickets_aparcados.js
 * Módulo para gestionar el sistema de aparcar (minimizar) y recuperar tickets.
 * Se encarga de guardar y recuperar tickets de SQLite temporalmente.
 */

let heldTickets = [];

/**
 * Aparca el ticket activo actual guardándolo en SQLite y limpiando el panel.
 */
async function parkCurrentTicket() {
  if (!cart || cart.length === 0) {
    alert("No hay artículos en la orden para suspender.");
    return;
  }

  try {
    const aparcados = await window.posAPI.obtenerTicketsAparcados();
    if (aparcados.length >= 5) {
      alert("Límite de tickets en espera alcanzado (Máximo 5).");
      return;
    }
  } catch (e) {
    console.error("Error verificando límite de aparcados:", e);
  }

  const clienteElem = document.getElementById('bill-cliente');
  const nitElem = document.getElementById('bill-nit');
  const cliente = (clienteElem && clienteElem.value.trim()) || 'CF';
  const nit = (nitElem && nitElem.value.trim()) || 'CF';

  try {
    // 1. Guardar orden completa de forma asíncrona en SQLite
    const resultado = await window.posAPI.aparcarTicket({ cliente, nit, items: cart });
    if (!resultado || !resultado.success) {
      throw new Error(resultado?.error || 'No se pudo guardar el ticket aparcado.');
    }

    // 2. Limpiar panel de cobro y carrito activo en memoria
    if (typeof window.vaciarCarrito === 'function') {
      window.vaciarCarrito();
    } else {
      cart = [];
      window.renderCartUI();
    }

    if (clienteElem) clienteElem.value = '';
    if (nitElem) nitElem.value = '';
    const activeLabel = document.getElementById('active-ticket-label');
    if (activeLabel) activeLabel.innerText = '';

    // 3. Actualizar la UI de tickets aparcados
    await cargarTicketsAparcados();
  } catch (err) {
    alert("Error al aparcar ticket en SQLite: " + err.message);
  }
}

// Alias para compatibilidad con código existente
const aparcarTicketActual = parkCurrentTicket;

/**
 * Carga todos los tickets aparcados guardados en SQLite y los renderiza en la UI.
 */
async function cargarTicketsAparcados() {
  const bar = document.getElementById('tickets-aparcados-bar');
  if (!bar) return;

  try {
    heldTickets = await window.posAPI.obtenerTicketsAparcados();

    if (!heldTickets || heldTickets.length === 0) {
      bar.innerHTML = '';
      return;
    }

    bar.innerHTML = heldTickets.map((t, index) => {
      const cantItems = t.items.reduce((acc, i) => acc + (i.cantidad || 1), 0);
      const total = t.items.reduce((acc, i) => acc + (i.subtotal || (i.cantidad * i.precio_unitario)), 0);
      return `
        <button onclick="unparkTicket(${t.id})"
          class="bg-white border-l-4 border-amber-500 shadow-xl hover:bg-amber-50 p-3 rounded-lg flex items-center justify-between w-64 transition-all active:scale-95 group">
          <div class="flex items-center gap-3">
              <div class="bg-amber-100 text-amber-600 rounded-full h-8 w-8 flex items-center justify-center font-black">
                  ${index + 1}
              </div>
              <div class="text-left">
                  <p class="text-[10px] font-black text-slate-700 uppercase leading-tight tracking-tight">${t.cliente}</p>
                  <p class="text-[9px] font-bold text-slate-400">${cantItems} items</p>
              </div>
          </div>
          <div class="text-right">
              <p class="text-xs font-black text-blue-900">Q${total.toFixed(2)}</p>
              <p class="text-[8px] font-bold text-amber-500 uppercase group-hover:underline">Recuperar</p>
          </div>
        </button>
      `;
    }).join('');
  } catch (err) {
    console.error("Error al obtener tickets aparcados desde SQLite:", err);
  }
}

/**
 * Recupera un ticket aparcado de SQLite.
 * Si el ticket activo actual tiene items, primero lo auto-aparca.
 */
async function unparkTicket(id) {
  try {
    // 1. Obtener la lista actualizada de tickets aparcados desde SQLite
    const aparcados = await window.posAPI.obtenerTicketsAparcados();
    const tToUnpark = aparcados.find(t => t.id === id);

    if (!tToUnpark) {
      alert("El ticket seleccionado ya no existe.");
      await cargarTicketsAparcados();
      return;
    }

    // 2. Regla de auto-aparcado: Si el ticket actual en el panel tiene artículos, auto-aparcar primero
    if (cart && cart.length > 0) {
      if (aparcados.length >= 5) {
        alert("Límite de tickets en espera alcanzado (Máximo 5). Finaliza o elimina uno antes de cambiar de ticket.");
        return;
      }
      const clienteElem = document.getElementById('bill-cliente');
      const nitElem = document.getElementById('bill-nit');
      const cAct = (clienteElem && clienteElem.value.trim()) || 'CF';
      const nAct = (nitElem && nitElem.value.trim()) || 'CF';

      const resultado = await window.posAPI.aparcarTicket({ cliente: cAct, nit: nAct, items: cart });
      if (!resultado || !resultado.success) {
        throw new Error(resultado?.error || 'No se pudo aparcar la orden activa.');
      }
    }

    // 3. Cargar datos del ticket recuperado en el panel y carrito
    cart = tToUnpark.items || [];
    window.renderCartUI();

    const clienteElem = document.getElementById('bill-cliente');
    const nitElem = document.getElementById('bill-nit');
    if (clienteElem) clienteElem.value = tToUnpark.cliente || 'CF';
    if (nitElem) nitElem.value = tToUnpark.nit || 'CF';

    const activeLabel = document.getElementById('active-ticket-label');
    if (activeLabel) activeLabel.innerText = `Ticket #${tToUnpark.id}`;

    // 4. Eliminar el registro recuperado de SQLite
    await window.posAPI.eliminarTicketAparcado(id);

    // 5. Refrescar la barra visual de tickets aparcados
    await cargarTicketsAparcados();
  } catch (err) {
    alert("Error al recuperar el ticket desde SQLite: " + err.message);
  }
}

// Exportar al scope global
window.parkCurrentTicket = parkCurrentTicket;
window.aparcarTicketActual = parkCurrentTicket;
window.cargarTicketsAparcados = cargarTicketsAparcados;
window.unparkTicket = unparkTicket;
window.recuperarTicketAparcado = unparkTicket;
