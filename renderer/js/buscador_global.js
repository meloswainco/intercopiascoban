/**
 * buscador_global.js
 * Módulo para gestionar la búsqueda global de productos y atajos de teclado.
 */

function searchGlobal(e) {
    const list = document.getElementById('global-suggestions');
    const items = list.querySelectorAll('.suggestion-item');

    if (e.key === 'ArrowDown') { e.preventDefault(); currentFocus++; addActive(items); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); currentFocus--; addActive(items); return; }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (items.length) {
            const selectedIndex = currentFocus > -1 ? currentFocus : 0;
            items[selectedIndex]?.click();
        }
        return;
    }
    if (e.key === 'Escape') { list.classList.add('hidden'); return; }

    // Solo resetear el foco si el usuario escribe
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') {
        currentFocus = -1;
    }
}

function addActive(x) {
    if (!x) return false; removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    x[currentFocus].classList.add("suggestion-active");
    x[currentFocus].scrollIntoView({ block: "nearest" });
}

function removeActive(x) { 
    for (var i = 0; i < x.length; i++) { 
        x[i].classList.remove("suggestion-active"); 
    } 
}

function resetSearch() { 
    document.getElementById('main-search').value = ''; 
    document.getElementById('global-suggestions').classList.add('hidden'); 
    currentFocus = -1; 
}

function escaparTextoBuscador(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
}

function setupGlobalSearch() {
    const searchInput = document.getElementById('main-search');
    if (!searchInput || searchInput.dataset.searchReady === '1') return;
    searchInput.dataset.searchReady = '1';
    searchInput.addEventListener('input', async event => {
        const query = event.target.value.trim();
        const suggestionsBox = document.getElementById('global-suggestions');
        if (!suggestionsBox) return;
        if (!query) {
            suggestionsBox.classList.add('hidden');
            return;
        }
        try {
            const productos = await window.posAPI.buscarProductos(query);
            suggestionsBox.innerHTML = productos?.length
                ? productos.map((producto, index) => {
                    const sinStock = Number(producto.stock) <= 0;
                    return `<div data-product-index="${index}"
                        class="suggestion-item p-3 border-b border-slate-100 flex justify-between items-center hover:bg-blue-50 transition-colors cursor-pointer">
                        <div><p class="font-bold text-slate-800 text-xs uppercase">${escaparTextoBuscador(producto.descripcion)}</p>
                        <p class="text-[10px] ${sinStock ? 'text-red-600 font-bold' : 'text-slate-500'}">Cód: ${escaparTextoBuscador(producto.codigo)} | Stock: ${Number(producto.stock) || 0}${sinStock ? ' (STOCK CRÍTICO)' : ''}</p></div>
                        <span class="font-black text-blue-700 text-sm">Q${(Number(producto.precio_venta) || 0).toFixed(2)}</span></div>`;
                }).join('')
                : '<div class="p-3 text-xs text-slate-400 font-bold">No se encontraron productos en SQLite.</div>';
            suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const producto = productos[Number(item.dataset.productIndex)];
                    if (producto) seleccionarProductoBuscado(producto);
                });
            });
            currentFocus = -1;
            suggestionsBox.classList.remove('hidden');
        } catch (error) {
            console.error('Error buscando productos:', error);
        }
    });
}

async function seleccionarProductoBuscado(producto) {
    const { codigo, descripcion, precio_venta: precio, categoria, stock } = producto;
    const config = await window.posAPI.getConfig();
    if (config.permitir_stock_negativo !== '1' && Number(stock) <= 0) {
        alert('No se puede vender este producto. El stock es crítico y no está permitido vender en negativo.');
        return;
    }
    window.addCartItem({
        codigo, descripcion, cantidad: 1,
        precio_unitario: Number(precio) || 0,
        subtotal: Number(precio) || 0,
        categoria: categoria || 'GENERAL'
    });
    resetSearch();
    document.getElementById('main-search')?.blur();
}

window.searchGlobal = searchGlobal;
window.addActive = addActive;
window.removeActive = removeActive;
window.resetSearch = resetSearch;
window.setupGlobalSearch = setupGlobalSearch;
window.seleccionarProductoBuscado = seleccionarProductoBuscado;
