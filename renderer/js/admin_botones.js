let adminFrecuentesData = [];
        async function loadAdminFrecuentes() {
            const botones = await window.posAPI.obtenerBotonesGrid(false);
            const rafagaData = botones.filter(b => b.bloque === 'RAFAGA' && b.id !== 'frec-ajuste');
            const frecuentesData = botones.filter(b => b.bloque === 'FRECUENTES' && b.categoria !== 'PERSONALIZADO' && b.id !== 'frec-ajuste');
            adminFrecuentesData = [...rafagaData, ...frecuentesData];
            
            const renderRow = (b) => {
                let submenuHTML = '';
                if (b.tiene_submenu && Array.isArray(b.submenus)) {
                    try {
                        const domId = b.id.replace(/\s+/g, '_');
                        if (b.submenus.length > 0) {
                            submenuHTML = `
                                <div class="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <p class="text-[10px] font-bold text-slate-500 mb-2 uppercase">Opciones (Submenús):</p>
                                    ${b.submenus.map((sub, index) => `
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center">
                                                <i class="fas fa-level-up-alt fa-rotate-90 text-slate-400 mr-2 text-xs"></i>
                                                <span class="text-xs font-bold text-slate-600 uppercase">${sub.label}</span>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <label class="text-[9px] font-bold text-slate-400">Q</label>
                                                <input type="number" id="frec-subprecio-${domId}-${index}" value="${parseFloat(sub.precio || 0).toFixed(2)}" step="0.01" class="w-20 p-1 border rounded text-center font-bold text-blue-600 outline-none text-xs">
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `;
                        }
                    } catch (e) { console.error("Error parsing submenus_json for", b.id); }
                }

                const domId = b.id.replace(/\s+/g, '_');
                return `
                <div class="bg-white p-4 rounded-xl border flex flex-col mb-3">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-bold text-slate-800 uppercase text-xs">${b.label}</p>
                            <p class="text-[10px] text-slate-400 font-bold">${b.codigo_prod}</p>
                        </div>
                        <div class="flex items-center gap-4">
                            ${!b.tiene_submenu ? `
                            <div class="flex flex-col items-center">
                                <label class="text-[9px] font-bold text-slate-400 mb-1">PRECIO Q</label>
                                <input type="number" id="frec-precio-${domId}" value="${parseFloat(b.precio_base).toFixed(2)}" step="0.01" class="w-20 p-2 border rounded-lg text-center font-bold text-blue-600 outline-none">
                            </div>
                            ` : `<div class="flex flex-col items-center"><span class="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">VARIOS PRECIOS</span><input type="hidden" id="frec-precio-${domId}" value="${b.precio_base}"></div>`}
                            <div class="flex flex-col items-center">
                                <label class="text-[9px] font-bold text-slate-400 mb-1">VISIBLE</label>
                                <input type="checkbox" id="frec-activo-${domId}" ${b.activo ? 'checked' : ''} class="w-5 h-5 accent-blue-600">
                            </div>
                        </div>
                    </div>
                    ${submenuHTML}
                </div>
                `;
            };

            const container = document.getElementById('admin-frecuentes-list');
            container.innerHTML = `
                <div class="mb-4 mt-2"><h5 class="font-black text-slate-500 uppercase text-[10px] border-b pb-1">Zona Ráfaga</h5></div>
                ${rafagaData.map(renderRow).join('')}
                <div class="mb-4 mt-6"><h5 class="font-black text-slate-500 uppercase text-[10px] border-b pb-1">Servicios Frecuentes</h5></div>
                ${frecuentesData.map(renderRow).join('')}
            `;
        }

        async function guardarAdminFrecuentes() {
            let successCount = 0;
            for (const b of adminFrecuentesData) {
                try {
                    const domId = b.id.replace(/\s+/g, '_');
                    const precioInput = document.getElementById(`frec-precio-${domId}`);
                    const activoInput = document.getElementById(`frec-activo-${domId}`);
                    const newPrecio = precioInput ? parseFloat(precioInput.value) || 0 : b.precio_base;
                    const newActivo = activoInput ? activoInput.checked : b.activo;
                    await window.posAPI.actualizarPrecioBoton(b.id, newPrecio);
                    await window.posAPI.actualizarVisibilidadBoton(b.id, newActivo);
                    
                    if (b.tiene_submenu && Array.isArray(b.submenus)) {
                        try {
                            const submenus = b.submenus;
                            for (let i = 0; i < submenus.length; i++) {
                                const input = document.getElementById(`frec-subprecio-${domId}-${i}`);
                                if (input) {
                                    submenus[i].precio = parseFloat(input.value) || 0;
                                }
                            }
                            await window.posAPI.actualizarSubmenusBoton(b.id, JSON.stringify(submenus));
                        } catch (e) { console.error("Error al guardar submenus", e); }
                    }
                    
                    successCount++;
                } catch(err) {
                    console.error("Error al guardar boton frecuente", b.id, err);
                }
            }
            alert(`Se guardaron los botones frecuentes correctamente.`);
            cargarBotonesGrid();
        }

        let adminEscalasData = [];
        async function loadAdminEscalas() {
            const escalas = await window.posAPI.obtenerEscalasPrecio();
            adminEscalasData = escalas;
            
            const container = document.getElementById('admin-escalas-list');
            const grupos = {};
            escalas.forEach(e => {
                if(!grupos[e.codigo_producto]) grupos[e.codigo_producto] = [];
                grupos[e.codigo_producto].push(e);
            });

            let html = '';
            for (const prod in grupos) {
                html += `<div class="bg-white rounded-xl border p-4">
                    <h5 class="font-black text-blue-900 text-sm uppercase mb-3 border-b pb-2">${prod}</h5>
                    <div class="grid grid-cols-4 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">
                        <div>Rango Inicial</div>
                        <div>Rango Final</div>
                        <div>Precio (Q)</div>
                        <div>Estado</div>
                    </div>
                `;
                
                grupos[prod].forEach(e => {
                    html += `
                        <div class="grid grid-cols-4 gap-2 items-center mb-2">
                            <input type="number" readonly value="${e.cantidad_minima}" class="bg-slate-50 p-2 border rounded-lg text-center font-bold text-slate-600 outline-none cursor-not-allowed">
                            <input type="number" readonly value="${e.cantidad_maxima}" class="bg-slate-50 p-2 border rounded-lg text-center font-bold text-slate-600 outline-none cursor-not-allowed">
                            <input type="number" id="escala-precio-${e.id}" value="${parseFloat(e.precio_unitario).toFixed(2)}" step="0.01" class="p-2 border rounded-lg text-center font-bold text-green-600 outline-none">
                            <div class="flex justify-center"><input type="checkbox" id="escala-activo-${e.id}" ${e.activo ? 'checked' : ''} class="w-5 h-5 accent-blue-600"></div>
                        </div>
                    `;
                });
                html += `</div>`;
            }
            container.innerHTML = html;
        }

        async function guardarAdminEscalas() {
            for (const e of adminEscalasData) {
                const newPrecio = parseFloat(document.getElementById(`escala-precio-${e.id}`).value) || 0;
                const newActivo = document.getElementById(`escala-activo-${e.id}`).checked;
                e.precio_unitario = newPrecio;
                e.activo = newActivo ? 1 : 0;
                await window.posAPI.guardarEscalaPrecio(e);
            }
            alert("Escalas de precio actualizadas correctamente.");
        }

        let adminPersonalizadosData = [];
        async function loadAdminPersonalizados() {
            const botones = await window.posAPI.obtenerBotonesGrid(false);
            adminPersonalizadosData = botones.filter(b => b.categoria === 'PERSONALIZADO');
            
            const container = document.getElementById('admin-personalizados-list');
            container.innerHTML = adminPersonalizadosData.map(b => {
                let submenusHtml = '';
                if (b.tiene_submenu) {
                    const subs = b.submenus || [];
                    for(let i=0; i<8; i++) {
                        const sub = subs[i] || { label: '', precio: 0 };
                        const domId = b.id.replace(/\s+/g, '_');
                        submenusHtml += `
                            <div class="flex items-center gap-2 mb-2 ml-4">
                                <span class="text-[10px] font-bold text-slate-400">Sub ${i+1}:</span>
                                <input type="text" id="cust-sub-label-${domId}-${i}" value="${sub.label}" placeholder="Nombre sub-servicio" class="flex-1 p-2 border rounded-lg font-bold text-xs uppercase outline-none">
                                <input type="number" id="cust-sub-precio-${domId}-${i}" value="${parseFloat(sub.precio || 0).toFixed(2)}" step="0.01" class="w-24 p-2 border rounded-lg text-center font-bold text-blue-600 outline-none">
                            </div>
                        `;
                    }
                }

                const domId = b.id.replace(/\s+/g, '_');
                return `
                <div class="bg-white p-4 rounded-xl border flex flex-col mb-4">
                    <div class="flex items-center justify-between border-b pb-3 mb-3">
                        <div class="flex-1 mr-4">
                            <label class="text-[9px] font-bold text-slate-400 mb-1 block">NOMBRE DEL BOTÓN</label>
                            <input type="text" id="cust-label-${domId}" value="${b.label}" class="w-full p-2 border rounded-lg font-bold text-sm uppercase text-slate-800 outline-none">
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex flex-col items-center ${b.tiene_submenu ? 'opacity-50' : ''}">
                                <label class="text-[9px] font-bold text-slate-400 mb-1">PRECIO Q</label>
                                <input type="number" id="cust-precio-${domId}" value="${parseFloat(b.precio_base).toFixed(2)}" step="0.01" ${b.tiene_submenu ? 'disabled' : ''} class="w-20 p-2 border rounded-lg text-center font-bold text-blue-600 outline-none">
                            </div>
                            <div class="flex flex-col items-center">
                                <label class="text-[9px] font-bold text-slate-400 mb-1">VISIBLE</label>
                                <input type="checkbox" id="cust-activo-${domId}" ${b.activo ? 'checked' : ''} class="w-5 h-5 accent-blue-600">
                            </div>
                        </div>
                    </div>
                    ${b.tiene_submenu ? `
                        <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Sub-productos (Dejar vacío para omitir)</h5>
                        ${submenusHtml}
                    ` : ''}
                </div>
            `}).join('');
        }

        async function guardarAdminPersonalizados() {
            let successCount = 0;
            for (const b of adminPersonalizadosData) {
                try {
                    const domId = b.id.replace(/\s+/g, '_');
                    const newLabel = document.getElementById(`cust-label-${domId}`).value.trim();
                    const newPrecio = parseFloat(document.getElementById(`cust-precio-${domId}`).value) || 0;
                    const newActivo = document.getElementById(`cust-activo-${domId}`).checked;
                    
                    b.label = newLabel || b.id;
                    b.precio_base = newPrecio;
                    b.activo = newActivo ? 1 : 0;

                    if (b.tiene_submenu) {
                        const newSubs = [];
                        for(let i=0; i<8; i++) {
                            const subLabelInput = document.getElementById(`cust-sub-label-${domId}-${i}`);
                            const subPrecioInput = document.getElementById(`cust-sub-precio-${domId}-${i}`);
                            if (subLabelInput && subPrecioInput) {
                                const sLabel = subLabelInput.value.trim();
                                const sPrecio = parseFloat(subPrecioInput.value) || 0;
                                if (sLabel) {
                                    newSubs.push({ label: sLabel, precio: sPrecio, codigo_prod: b.codigo_prod + '-' + (i+1) });
                                }
                            }
                        }
                        b.submenus = newSubs;
                    }
                    
                    await window.posAPI.guardarBotonGrid(b);
                    successCount++;
                } catch(e) {
                    console.error("Error al guardar boton personalizado", b.id, e);
                }
            }
            alert(`Se guardó la configuración de botones personalizables.`);
            cargarBotonesGrid();
        }

        let adminGestionesData = [];

        function escaparAdminHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, character => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[character]));
        }

        async function loadAdminGestiones() {
            adminGestionesData = await window.posAPI.obtenerServiciosGestion(false);
            renderAdminGestiones();
        }

        function renderAdminGestiones() {
            const container = document.getElementById('admin-gestiones-list');
            if (!container) return;
            container.innerHTML = adminGestionesData.map((servicio, index) => {
                const key = servicio.id || `nuevo-${index}`;
                return `
                    <div class="bg-white border rounded-xl p-3" data-gestion-key="${escaparAdminHtml(key)}">
                        <div class="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                            <div class="md:col-span-2">
                                <label class="text-[9px] font-black text-slate-400 uppercase">Servicio</label>
                                <input id="gestion-nombre-${key}" value="${escaparAdminHtml(servicio.nombre)}" class="w-full p-2 border rounded-lg text-xs font-bold uppercase">
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-slate-400 uppercase">Boleta Q</label>
                                <input id="gestion-boleta-${key}" type="number" step="0.01" value="${servicio.valor_boleta ?? ''}" placeholder="Vacío" class="w-full p-2 border rounded-lg text-xs font-bold">
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-slate-400 uppercase">Comisión Q</label>
                                <input id="gestion-comision-${key}" type="number" step="0.01" value="${servicio.comision_pago ?? 0}" class="w-full p-2 border rounded-lg text-xs font-bold">
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-slate-400 uppercase">Gestión Q</label>
                                <input id="gestion-valor-${key}" type="number" step="0.01" value="${servicio.valor_gestion ?? 0}" class="w-full p-2 border rounded-lg text-xs font-bold">
                            </div>
                            <div class="flex items-center gap-2">
                                <label class="text-[9px] font-black text-slate-400 uppercase">Activo</label>
                                <input id="gestion-activo-${key}" type="checkbox" ${servicio.activo ? 'checked' : ''} class="w-5 h-5 accent-blue-600">
                                ${servicio.id ? `<button onclick="eliminarServicioGestion(${servicio.id})" class="text-red-500 hover:text-red-700 p-2" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                            </div>
                        </div>
                    </div>`;
            }).join('');
        }

        function agregarServicioGestion() {
            adminGestionesData.push({
                id: null,
                nombre: 'Nuevo servicio',
                valor_boleta: null,
                comision_pago: 0,
                valor_gestion: 0,
                activo: 1
            });
            renderAdminGestiones();
        }

        async function guardarAdminGestiones() {
            const guardados = [];
            for (let index = 0; index < adminGestionesData.length; index++) {
                const servicio = adminGestionesData[index];
                const key = servicio.id || `nuevo-${index}`;
                const nombre = document.getElementById(`gestion-nombre-${key}`).value.trim();
                if (!nombre) continue;
                const boletaInput = document.getElementById(`gestion-boleta-${key}`).value;
                const resultado = await window.posAPI.guardarServicioGestion({
                    id: servicio.id,
                    nombre,
                    valor_boleta: boletaInput === '' ? null : parseFloat(boletaInput) || 0,
                    comision_pago: parseFloat(document.getElementById(`gestion-comision-${key}`).value) || 0,
                    valor_gestion: parseFloat(document.getElementById(`gestion-valor-${key}`).value) || 0,
                    activo: document.getElementById(`gestion-activo-${key}`).checked
                });
                if (!resultado.success) {
                    alert(`No se pudo guardar "${nombre}": ${resultado.error}`);
                    return;
                }
                guardados.push(resultado);
            }
            alert(`Catálogo guardado: ${guardados.length} servicio(s).`);
            await loadAdminGestiones();
        }

        async function eliminarServicioGestion(id) {
            if (!confirm('¿Eliminar este servicio del catálogo?')) return;
            const resultado = await window.posAPI.eliminarServicioGestion(id);
            if (!resultado.success) {
                alert(`No se pudo eliminar: ${resultado.error}`);
                return;
            }
            await loadAdminGestiones();
        }

        let adminColaboradoresData = [];

        async function loadAdminColaboradores() {
            adminColaboradoresData = await window.posAPI.obtenerColaboradores();
            renderAdminColaboradores();
        }

        function renderAdminColaboradores() {
            const container = document.getElementById('admin-usuarios-list');
            if (!container) return;
            container.innerHTML = adminColaboradoresData.map((usuario, index) => {
                const key = usuario.id || `nuevo-${index}`;
                return `
                    <div class="bg-white border rounded-xl p-3">
                        <div class="flex items-end gap-3">
                            <div class="flex-1">
                                <label class="text-[9px] font-black text-slate-400 uppercase">Nombre del colaborador</label>
                                <input id="colaborador-nombre-${key}" value="${escaparAdminHtml(usuario.nombre)}" class="w-full p-2 border rounded-lg text-xs font-bold uppercase">
                            </div>
                            <label class="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase pb-2">
                                <input id="colaborador-activo-${key}" type="checkbox" ${usuario.activo ? 'checked' : ''} class="w-5 h-5 accent-blue-600"> Activo
                            </label>
                            ${usuario.id ? `<button onclick="eliminarColaborador(${usuario.id})" class="text-red-500 hover:text-red-700 p-2 pb-2" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>`;
            }).join('');
        }

        function agregarColaborador() {
            adminColaboradoresData.push({ id: null, nombre: 'Nuevo colaborador', activo: 1 });
            renderAdminColaboradores();
        }

        async function guardarAdminColaboradores() {
            for (let index = 0; index < adminColaboradoresData.length; index++) {
                const usuario = adminColaboradoresData[index];
                const key = usuario.id || `nuevo-${index}`;
                const nombre = document.getElementById(`colaborador-nombre-${key}`).value.trim();
                if (!nombre) continue;
                const resultado = await window.posAPI.guardarColaborador({
                    id: usuario.id,
                    nombre,
                    activo: document.getElementById(`colaborador-activo-${key}`).checked
                });
                if (!resultado.success) {
                    alert(`No se pudo guardar "${nombre}": ${resultado.error}`);
                    return;
                }
            }
            alert('Colaboradores guardados correctamente.');
            await loadAdminColaboradores();
        }

        async function eliminarColaborador(id) {
            if (!confirm('¿Eliminar este colaborador?')) return;
            const resultado = await window.posAPI.eliminarColaborador(id);
            if (!resultado.success) {
                alert(`No se pudo eliminar: ${resultado.error}`);
                return;
            }
            await loadAdminColaboradores();
        }

        window.loadAdminGestiones = loadAdminGestiones;
        window.agregarServicioGestion = agregarServicioGestion;
        window.guardarAdminGestiones = guardarAdminGestiones;
        window.eliminarServicioGestion = eliminarServicioGestion;
        window.loadAdminColaboradores = loadAdminColaboradores;
        window.agregarColaborador = agregarColaborador;
        window.guardarAdminColaboradores = guardarAdminColaboradores;
        window.eliminarColaborador = eliminarColaborador;

        