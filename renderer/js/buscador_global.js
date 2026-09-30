/**
 * buscador_global.js
 * Módulo para gestionar la búsqueda global de productos y atajos de teclado.
 */

let globalSearchRequestId = 0;

function normalizarTextoBusqueda(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function coincideBusquedaPorPalabras(query, ...campos) {
    const palabras = normalizarTextoBusqueda(query).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return true;
    const texto = normalizarTextoBusqueda(campos.join(' '));
    return palabras.every(palabra => texto.includes(palabra));
}

function searchGlobal(e) {
    const list = document.getElementById('global-suggestions');
    const items = list.querySelectorAll('.suggestion-item');

    if (e.key === 'ArrowDown') { e.preventDefault(); currentFocus++; addActive(items); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); currentFocus--; addActive(items); return; }
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        
        // Si el usuario seleccionó explícitamente con las flechas, usar esa opción
        if (currentFocus > -1 && items.length) {
            items[currentFocus].click();
            return;
        }

        // El lector conserva una ruta exacta inmediata, independiente de las sugerencias asíncronas.
        if (query) {
            const requestId = ++globalSearchRequestId;
            window.posAPI.buscarProductoGlobal(query).then(async res => {
                if (requestId !== globalSearchRequestId) return;
                if (res && res.sala) {
                    seleccionarProductoBuscado({
                        codigo: res.sala.Codigo,
                        descripcion: res.sala.Descripcion,
                        precio_venta: res.sala.Precio_Venta,
                        categoria: res.sala.Categoria || 'GENERAL',
                        stock: res.sala.Stock || 0
                    });
                    return;
                }

                const productos = await window.posAPI.buscarProductos(query);
                if (requestId === globalSearchRequestId && productos?.length) {
                    seleccionarProductoBuscado(productos[0]);
                }
            }).catch(err => console.error('Error en búsqueda exacta:', err));
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
            globalSearchRequestId++;
            suggestionsBox.classList.add('hidden');
            return;
        }
        const requestId = ++globalSearchRequestId;
        try {
            const productos = await window.posAPI.buscarProductos(query);
            if (requestId !== globalSearchRequestId || event.target.value.trim() !== query) return;
            suggestionsBox.innerHTML = productos?.length
                ? productos.map((producto, index) => {
                    const stockNum = Number(producto.stock) || 0;
                    const stockLibre = window.stockNegativoPermitido?.() === true;
                    let bgClass = "hover:bg-blue-50";
                    let stockColor = "text-slate-500";
                    
                    if (!stockLibre && stockNum <= 0) {
                        bgClass = "bg-red-50 hover:bg-red-100";
                        stockColor = "text-red-600 font-bold";
                    } else if (!stockLibre && stockNum < 12) {
                        bgClass = "bg-yellow-50 hover:bg-yellow-100";
                        stockColor = "text-orange-500 font-bold";
                    } else if (!stockLibre && stockNum < 23) {
                        bgClass = "bg-yellow-50 hover:bg-yellow-100";
                    }

                    const agotadoOverlay = !stockLibre && stockNum <= 0 ? '<span class="absolute right-1/4 top-1/2 -translate-y-1/2 text-red-600 font-black text-2xl uppercase pointer-events-none -rotate-12 border-4 border-red-500 rounded p-1 opacity-20">AGOTADO</span>' : '';

                    return `<div data-product-index="${index}"
                        class="suggestion-item p-3 border-b border-slate-200 flex justify-between items-center transition-colors cursor-pointer relative overflow-hidden ${bgClass}">
                        ${agotadoOverlay}
                        <div class="relative z-10"><p class="font-bold text-slate-800 text-xs uppercase">${escaparTextoBuscador(producto.descripcion)}</p>
                        <p class="text-[10px] ${stockColor}">Cód: ${escaparTextoBuscador(producto.codigo)} | Stock: ${stockNum}</p></div>
                        <span class="font-black text-blue-700 text-sm relative z-10">Q${(Number(producto.precio_venta) || 0).toFixed(2)}</span></div>`;
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
    const config = window.POS_CONFIG || await window.posAPI.getConfig();
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
window.normalizarTextoBusqueda = normalizarTextoBusqueda;
window.coincideBusquedaPorPalabras = coincideBusquedaPorPalabras;
