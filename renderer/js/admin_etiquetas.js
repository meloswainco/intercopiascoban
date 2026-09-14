/**
 * admin_etiquetas.js
 * Módulo para generar códigos de barra y exportarlos a PDF
 */

let listaEtiquetas = [];

let todoInventarioCache = [];

async function initEtiquetasAutocomplete() {
    try {
        const invSala = await window.posAPI.obtenerTodoInventario('SALA');
        const invBodega = await window.posAPI.obtenerTodoInventario('BODEGA');
        todoInventarioCache = [...invSala, ...invBodega];
    } catch (e) {
        console.error("Error al cargar inventario para etiquetas:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('etiquetas-search');
    if (!input) return;
    
    // Cargar inventario cuando se enfoca o se hace click en la pestaña
    document.getElementById('tab-etiquetas')?.addEventListener('click', initEtiquetasAutocomplete);
    
    // Contenedor de resultados
    let resultsContainer = document.getElementById('etiquetas-autocomplete-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'etiquetas-autocomplete-results';
        resultsContainer.className = "absolute top-full left-0 w-full bg-white shadow-xl border border-slate-200 rounded-xl max-h-60 overflow-y-auto z-50 hidden mt-1";
        input.parentElement.classList.add('relative');
        input.parentElement.appendChild(resultsContainer);
    }

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim().toUpperCase();
        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }

        const encontrados = todoInventarioCache.filter(p => 
            p.Codigo.toUpperCase().includes(query) || 
            p.Descripcion.toUpperCase().includes(query)
        ).slice(0, 20); // Máximo 20 resultados

        if (encontrados.length > 0) {
            resultsContainer.innerHTML = encontrados.map(p => `
                <div class="p-3 border-b hover:bg-indigo-50 cursor-pointer flex flex-col" 
                     onclick="seleccionarProductoEtiqueta('${p.Codigo.replace(/'/g, "\\'")}')">
                    <span class="font-bold text-xs uppercase text-slate-800">${p.Descripcion}</span>
                    <span class="text-[10px] text-slate-500 font-black">${p.Codigo} | Q${parseFloat(p.Precio || 0).toFixed(2)}</span>
                </div>
            `).join('');
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.innerHTML = `<div class="p-3 text-xs text-slate-500 italic text-center">No se encontraron resultados</div>`;
            resultsContainer.classList.remove('hidden');
        }
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
});

window.seleccionarProductoEtiqueta = function(codigo) {
    const producto = todoInventarioCache.find(p => p.Codigo === codigo);
    if (producto) {
        document.getElementById('etiquetas-search').value = producto.Descripcion;
        window.productoSeleccionadoEtiquetas = producto;
        document.getElementById('etiquetas-autocomplete-results').classList.add('hidden');
    }
};

async function buscarProductoEtiquetas() {
    const query = document.getElementById('etiquetas-search').value.trim().toUpperCase();
    if (!query) {
        alert("Escribe un código o descripción para buscar.");
        return;
    }

    try {
        if (todoInventarioCache.length === 0) {
            await initEtiquetasAutocomplete();
        }
        const encontrados = todoInventarioCache.filter(p => p.Codigo.toUpperCase().includes(query) || p.Descripcion.toUpperCase().includes(query));
        
        if (encontrados.length === 0) {
            alert("No se encontró ningún producto con ese código o descripción.");
            return;
        }

        // Si hay varios, seleccionamos el primero exacto o el primero que coincide.
        const exact = encontrados.find(p => p.Codigo.toUpperCase() === query || p.Descripcion.toUpperCase() === query);
        const producto = exact || encontrados[0];

        // Rellenar input con el nombre
        document.getElementById('etiquetas-search').value = producto.Descripcion;
        window.productoSeleccionadoEtiquetas = producto;
        
    } catch (e) {
        console.error("Error buscando producto para etiqueta:", e);
    }
}

function agregarEtiqueta() {
    if (!window.productoSeleccionadoEtiquetas) {
        // Tratar de usar lo que haya en el input como código literal
        const rawCode = document.getElementById('etiquetas-search').value.trim();
        if (!rawCode) {
            alert("Busca y selecciona un producto primero, o escribe un código.");
            return;
        }
        window.productoSeleccionadoEtiquetas = { Codigo: rawCode, Descripcion: "ETIQUETA PERSONALIZADA", Precio: null };
    }

    const prod = window.productoSeleccionadoEtiquetas;
    const qty = parseInt(document.getElementById('etiquetas-qty').value) || 1;
    
    for (let i = 0; i < qty; i++) {
        listaEtiquetas.push({...prod, uniqueId: Date.now() + Math.random()});
    }
    
    renderizarEtiquetas();
}

function renderizarEtiquetas() {
    const container = document.getElementById('etiquetas-grid');
    container.innerHTML = '';
    
    listaEtiquetas.forEach((prod, index) => {
        const div = document.createElement('div');
        div.className = "etiqueta-item bg-white p-2 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center relative group w-48 shrink-0";
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.className = "absolute -top-2 -right-2 text-white bg-red-500 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition shadow cursor-pointer z-10 flex items-center justify-center text-[10px]";
        deleteBtn.onclick = () => {
            listaEtiquetas.splice(index, 1);
            renderizarEtiquetas();
        };

        const title = document.createElement('p');
        title.className = "text-[10px] font-black uppercase text-center mb-1 truncate w-full px-2";
        title.innerText = prod.Descripcion;
        
        const barcodeContainer = document.createElement('div');
        barcodeContainer.innerHTML = `<svg id="barcode-preview-${index}"></svg>`;
        
        const price = document.createElement('p');
        price.className = "text-xs font-black mt-1 text-slate-800";
        price.innerText = prod.Precio ? `Q${parseFloat(prod.Precio).toFixed(2)}` : '';

        div.appendChild(deleteBtn);
        div.appendChild(title);
        div.appendChild(barcodeContainer);
        if (prod.Precio) div.appendChild(price);
        container.appendChild(div);

        // Generar barcode usando JsBarcode global (incluido en Index.html)
        if (typeof JsBarcode !== 'undefined') {
            try {
                let codeToRender = prod.Codigo;
                if (!codeToRender || codeToRender.trim() === '') {
                    codeToRender = '0000000000';
                }
                // Convertir el código a ASCII válido o usar fallback
                JsBarcode(`#barcode-preview-${index}`, codeToRender, {
                    format: "CODE128",
                    width: 1.5,
                    height: 40,
                    displayValue: true,
                    fontSize: 12,
                    margin: 0
                });
            } catch (err) {
                console.warn("Código de barras no soportado por CODE128:", prod.Codigo, err);
                try {
                    // Fallback a un texto simple si falla el código de barras
                    document.getElementById(`barcode-preview-${index}`).outerHTML = `<div class="font-mono text-xs text-center border px-2 py-1 bg-slate-100">${prod.Codigo}</div>`;
                } catch(e){}
            }
        }
    });
}

function limpiarEtiquetas() {
    listaEtiquetas = [];
    document.getElementById('etiquetas-search').value = '';
    document.getElementById('etiquetas-qty').value = '1';
    window.productoSeleccionadoEtiquetas = null;
    renderizarEtiquetas();
}

async function exportarEtiquetasPDF() {
    if (listaEtiquetas.length === 0) {
        alert("Agrega al menos una etiqueta a la lista antes de exportar.");
        return;
    }

    const format = document.getElementById('etiquetas-format').value;
    
    // Clonar el grid y ponerlo en el body para evitar problemas de visibilidad de los contenedores padre
    const originalGrid = document.getElementById('etiquetas-grid');
    const printGrid = originalGrid.cloneNode(true);
    printGrid.id = 'print-grid';
    document.body.appendChild(printGrid);

    // Inyectar estilo temporal para impresión
    const style = document.createElement('style');
    style.id = 'print-labels-style';
    
    if (format === 'rollo') {
        style.innerHTML = `
            @media print {
                @page { size: 58mm 40mm !important; margin: 0 !important; }
                body > *:not(#print-grid):not(style) { display: none !important; }
                body { background: white; margin: 0; padding: 0; }
                #print-grid {
                    position: absolute; left: 0; top: 0;
                    display: flex; flex-direction: column; width: 58mm; padding:0; margin:0;
                    gap: 0; background: white;
                }
                #print-grid .etiqueta-item {
                    width: 58mm !important; height: 40mm !important;
                    page-break-after: always;
                    border: none !important;
                    margin: 0 !important;
                    padding: 2mm !important;
                    display: flex !important; flex-direction: column; align-items: center; justify-content: center;
                    background: white;
                }
                #print-grid .etiqueta-item button { display: none !important; }
            }
        `;
    } else {
        style.innerHTML = `
            @media print {
                @page { size: letter !important; margin: 10mm !important; }
                body > *:not(#print-grid):not(style) { display: none !important; }
                body { background: white; margin: 0; padding: 0; }
                #print-grid {
                    position: absolute; left: 0; top: 0;
                    display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 5mm !important;
                    width: 100%; background: white;
                }
                #print-grid .etiqueta-item {
                    border: 1px solid #000 !important;
                    padding: 2mm !important;
                    page-break-inside: avoid;
                    width: auto !important; height: auto !important;
                    background: white;
                }
                #print-grid .etiqueta-item button { display: none !important; }
            }
        `;
    }
    
    document.head.appendChild(style);

    try {
        const res = await window.posAPI.exportToPDF({ format });
        if (res.success && !res.canceled) {
            alert(`✅ PDF generado correctamente en:\n${res.filePath}`);
            limpiarEtiquetas();
        } else if (res.canceled) {
            console.log("Exportación cancelada por el usuario.");
        } else {
            throw new Error(res.error);
        }
    } catch (e) {
        alert("Error al exportar PDF: " + e.message);
    } finally {
        if (document.getElementById('print-labels-style')) {
            document.head.removeChild(document.getElementById('print-labels-style'));
        }
        if (document.getElementById('print-grid')) {
            document.body.removeChild(document.getElementById('print-grid'));
        }
    }
}
