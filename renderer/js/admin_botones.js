let adminFrecuentesData = [];
        window.toggleRafagaZone = async function(isChecked) {
            const val = isChecked ? '1' : '0';
            if (window.POS_CONFIG) window.POS_CONFIG.hide_rafaga_zone = val;
            await window.posAPI.saveConfig('hide_rafaga_zone', val);
            if (typeof window.cargarBotonesGrid === 'function') window.cargarBotonesGrid();
            loadAdminFrecuentes();
        };

        window.toggleTecnicoZone = async function(isChecked) {
            const val = isChecked ? '1' : '0';
            if (window.POS_CONFIG) window.POS_CONFIG.hide_tecnico_zone = val;
            await window.posAPI.saveConfig('hide_tecnico_zone', val);
            if (typeof window.applyNavVisibility === 'function') window.applyNavVisibility();
        };

        async function loadAdminFrecuentes() {
            const toggleEl = document.getElementById('toggle-hide-rafaga');
            if (toggleEl) toggleEl.checked = (window.POS_CONFIG && window.POS_CONFIG.hide_rafaga_zone === '1');
            
            const toggleTecnicoEl = document.getElementById('toggle-hide-tecnico');
            if (toggleTecnicoEl) toggleTecnicoEl.checked = (window.POS_CONFIG && window.POS_CONFIG.hide_tecnico_zone === '1');

            const botones = await window.posAPI.obtenerBotonesGrid(false);
            const rafagaData = botones.filter(b => b.bloque === 'RAFAGA');
            const frecuentesData = botones.filter(b => b.bloque === 'FRECUENTES' && b.categoria !== 'PERSONALIZADO');
            adminFrecuentesData = [...rafagaData, ...frecuentesData];
            
            const renderRow = (b) => {
                let submenuHTML = '';
                if (b.tiene_submenu && Array.isArray(b.submenus)) {
                    try {
                        const domId = b.id.replace(/\s+/g, '_');
                        if (b.submenus.length > 0) {
                            submenuHTML = `
                                <div class="mt-4 p-4 rounded-xl shadow-sm" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid var(--color-primary);">
                                    <div class="flex items-center gap-2 mb-4">
                                        <i class="fas fa-sitemap text-blue-600"></i>
                                        <p class="text-[10px] font-black text-slate-800 uppercase tracking-widest">Opciones (Submenús):</p>
                                    </div>
                                    <div class="space-y-3">
                                    ${b.submenus.map((sub, index) => `
                                        <div class="flex items-center gap-3 w-full">
                                            <span class="text-[10px] font-black text-muted shrink-0 w-14 text-right"><i class="fas fa-level-up-alt fa-rotate-90 mr-1 text-slate-300"></i> Opc ${index+1}:</span>
                                            <input type="text" id="frec-sublabel-${domId}-${index}" value="${(b.comportamiento === 'HYBRID_LONG_PRESS' && index === 0) ? 'Predeterminado (Click Normal)' : escaparHtml(sub.label)}" class="flex-1 p-2 border border-border rounded-lg text-xs font-bold ${(b.comportamiento === 'HYBRID_LONG_PRESS' && index === 0) ? 'text-muted bg-app cursor-not-allowed' : 'text-main bg-surface focus:border-primary'} outline-none transition-colors" ${(b.comportamiento === 'HYBRID_LONG_PRESS' && index === 0) ? 'readonly' : 'placeholder="Nombre de la opción (vacío para ocultar)"'}>
                                            <div class="flex items-center gap-1 shrink-0">
                                                <label class="text-[10px] font-black text-muted">${window.MONEDA || '$'}</label>
                                                <input type="number" id="frec-subprecio-${domId}-${index}" value="${parseFloat(sub.precio || 0).toFixed(2)}" step="0.01" class="w-24 p-2 border border-border bg-surface rounded-lg text-center font-bold text-primary outline-none focus:border-primary transition-colors">
                                            </div>
                                        </div>
                                    `).join('')}
                                    </div>
                                </div>
                            `;
                        }
                    } catch (e) { console.error("Error parsing submenus_json for", b.id); }
                }

                const domId = b.id.replace(/\s+/g, '_');
                const isHiddenGlobal = window.POS_CONFIG && window.POS_CONFIG.hide_rafaga_zone === '1' && (b.bloque === 'RAFAGA' || (b.bloque === 'FRECUENTES' && b.categoria !== 'PERSONALIZADO'));
                const opacityClass = isHiddenGlobal ? 'opacity-40 pointer-events-none grayscale' : '';
                const displayActivo = isHiddenGlobal ? false : b.activo;
                const inputIdActivo = isHiddenGlobal ? '' : `id="frec-activo-${domId}"`;
                const inputIdPrecio = isHiddenGlobal ? '' : `id="frec-precio-${domId}"`;

                return `
                <div class="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col mb-3 relative ${opacityClass}">
                    ${isHiddenGlobal ? '<div class="absolute inset-0 z-10 flex items-center justify-center"><div class="bg-black text-white px-3 py-1 font-black tracking-widest uppercase rounded-lg text-[9px]">OCULTO GLOBALMENTE</div></div>' : ''}
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-bold text-main text-xs uppercase">${b.label}</p>
                            <p class="text-[10px] text-muted font-bold">${b.codigo_prod}</p>
                        </div>
                        <div class="flex items-center gap-4">
                            ${!b.tiene_submenu ? `
                            <div class="flex flex-col items-center">
                                <label class="text-[9px] font-bold text-muted mb-1">PRECIO ${window.MONEDA || '$'}</label>
                                <input type="number" ${inputIdPrecio} value="${parseFloat(b.precio_base).toFixed(2)}" step="0.01" class="w-20 p-2 border border-border bg-app rounded-lg text-center font-bold text-primary outline-none focus:border-primary transition-colors">
                            </div>
                            ` : `<div class="flex flex-col items-center"><span class="text-[9px] font-bold text-muted bg-surface-alt px-2 py-1 rounded border border-border">VARIOS PRECIOS</span><input type="hidden" ${inputIdPrecio} value="${b.precio_base}"></div>`}
                            <div class="flex flex-col items-center">
                                <label class="text-[9px] font-bold text-muted mb-1">VISIBLE</label>
                                <input type="checkbox" ${inputIdActivo} ${displayActivo ? 'checked' : ''} class="w-5 h-5 accent-primary">
                            </div>
                        </div>
                    </div>
                    ${submenuHTML}
                </div>
                `;
            };

            const renderRafagaRow = (b) => {
                const domId = b.id.replace(/\s+/g, '_');
                const isHiddenGlobal = window.POS_CONFIG && window.POS_CONFIG.hide_rafaga_zone === '1' && b.bloque === 'RAFAGA';
                const opacityClass = isHiddenGlobal ? 'opacity-40 pointer-events-none grayscale' : '';
                const displayActivo = isHiddenGlobal ? false : b.activo;
                const inputIdActivo = isHiddenGlobal ? '' : `id="frec-activo-${domId}"`;

                return `
                <div class="bg-surface p-3 rounded-xl border border-border flex flex-col justify-between items-center text-center shadow-sm relative ${opacityClass}">
                    ${isHiddenGlobal ? '<div class="absolute inset-0 z-10 flex items-center justify-center"><div class="bg-black text-white px-2 py-1 font-black tracking-widest uppercase rounded-md text-[8px] text-center leading-tight">OCULTO<br>GLOBALMENTE</div></div>' : ''}
                    <div>
                        <p class="font-black text-main text-xs mb-1 uppercase">${b.label}</p>
                        <p class="text-[9px] text-muted font-bold mb-3">${b.codigo_prod}</p>
                    </div>
                    <div class="flex flex-col items-center">
                        <label class="text-[9px] font-bold text-muted mb-1">MOSTRAR</label>
                        <input type="checkbox" ${inputIdActivo} ${displayActivo ? 'checked' : ''} class="w-5 h-5 accent-primary">
                    </div>
                </div>
                `;
            };

            const container = document.getElementById('admin-frecuentes-list');
            const rafagaEscalas = rafagaData.filter(b => !b.tiene_submenu);
            const rafagaPersonalizables = rafagaData.filter(b => b.tiene_submenu);
            
            container.innerHTML = `
                <div class="mb-4 mt-2"><h5 class="font-black text-slate-500 uppercase text-[10px] border-b pb-1">Zona Ráfaga (Escalas)</h5></div>
                <div class="grid grid-cols-2 gap-3 mb-6">
                    ${rafagaEscalas.map(renderRafagaRow).join('')}
                </div>
                <div class="mb-4 mt-2"><h5 class="font-black text-slate-500 uppercase text-[10px] border-b pb-1">Zona Ráfaga (Submenús)</h5></div>
                ${rafagaPersonalizables.map(renderRow).join('')}
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
                                const inputPrecio = document.getElementById(`frec-subprecio-${domId}-${i}`);
                                const inputLabel = document.getElementById(`frec-sublabel-${domId}-${i}`);
                                if (inputPrecio) {
                                    submenus[i].precio = parseFloat(inputPrecio.value) || 0;
                                }
                                if (inputLabel && (i > 0 || b.comportamiento !== 'HYBRID_LONG_PRESS')) {
                                    submenus[i].label = inputLabel.value.trim();
                                }
                            }
                            await window.posAPI.actualizarSubmenusBoton(b.id, JSON.stringify(submenus));
                            if (submenus.length > 0) {
                                await window.posAPI.actualizarPrecioBoton(b.id, submenus[0].precio);
                            }
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
                grupos[prod].sort((a, b) => a.cantidad_minima - b.cantidad_minima);
                // Asegurar que el primero inicie en 1 y los siguientes dependan del anterior
                let prevMax = 0;
                grupos[prod].forEach((e, idx) => {
                    if (idx === 0) e.cantidad_minima = 1;
                    else e.cantidad_minima = prevMax + 1;
                    prevMax = e.cantidad_maxima;
                });

                html += `<div class="bg-surface rounded-xl border border-border shadow-sm p-4 mb-4">
                    <div class="flex items-center gap-2 mb-3 border-b border-border pb-2">
                        <i class="fas fa-tags text-primary"></i>
                        <h5 class="font-black text-main text-sm uppercase">${prod}</h5>
                    </div>
                    <div class="mt-4 p-4 rounded-xl shadow-sm" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid var(--color-primary);">
                        <div class="grid grid-cols-4 gap-2 text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 px-2">
                            <div>Rango Inicial</div>
                            <div>Rango Final</div>
                            <div>Precio (Q)</div>
                            <div class="text-center">Estado</div>
                        </div>
                        <div class="space-y-2">
                `;
                
                grupos[prod].forEach(e => {
                    html += `
                            <div class="flex items-center gap-3 w-full mb-3">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-level-up-alt fa-rotate-90 text-slate-300"></i>
                                    <input type="number" id="escala-min-${e.id}" data-min-prod="${prod}" class="w-24 p-2 bg-surface text-center font-black text-slate-400 outline-none rounded-lg border border-slate-200" value="${e.cantidad_minima}" readonly>
                                </div>
                                <input type="number" id="escala-max-${e.id}" data-max-prod="${prod}" class="flex-1 p-2 bg-surface text-center font-bold text-slate-800 outline-none rounded-lg border border-slate-200" value="${e.cantidad_maxima}" oninput="window.recalcScales('${prod}')">
                                <div class="flex items-center gap-1 shrink-0 pl-2">
                                    <label class="text-[10px] font-black text-slate-500 mr-1">Q</label>
                                    <input type="number" id="escala-precio-${e.id}" value="${parseFloat(e.precio_unitario).toFixed(2)}" step="0.01" class="w-24 p-2 bg-surface text-center font-bold text-blue-600 outline-none rounded-lg border border-slate-200">
                                </div>
                                <div class="flex justify-center shrink-0 w-12 h-full items-center pl-2">
                                    <input type="checkbox" id="escala-activo-${e.id}" ${e.activo ? 'checked' : ''} class="w-5 h-5 accent-primary">
                                </div>
                            </div>
                    `;
                });
                html += `
                        </div>
                    </div>
                </div>`;
            }
            container.innerHTML = html;
        }

        window.recalcScales = function(prod) {
            const inputsMax = document.querySelectorAll(`input[data-max-prod="${prod}"]`);
            const inputsMin = document.querySelectorAll(`input[data-min-prod="${prod}"]`);
            
            for (let i = 0; i < inputsMax.length; i++) {
                if (i === 0) {
                    inputsMin[i].value = 1;
                } else {
                    const prevMax = parseInt(inputsMax[i-1].value) || 0;
                    inputsMin[i].value = prevMax + 1;
                }
            }
        };

        async function guardarAdminEscalas() {
            for (const e of adminEscalasData) {
                const newMin = parseInt(document.getElementById(`escala-min-${e.id}`).value) || 0;
                const newMax = parseInt(document.getElementById(`escala-max-${e.id}`).value) || 0;
                const newPrecio = parseFloat(document.getElementById(`escala-precio-${e.id}`).value) || 0;
                const newActivo = document.getElementById(`escala-activo-${e.id}`).checked;
                e.cantidad_minima = newMin;
                e.cantidad_maxima = newMax;
                e.precio_unitario = newPrecio;
                e.activo = newActivo ? 1 : 0;
                await window.posAPI.guardarEscalaPrecio(e);
            }
            
            // Sincronizar el precio base del botón asociado en botones_grid
            const botones = await window.posAPI.obtenerBotonesGrid(false);
            const rafagaBotones = botones.filter(b => b.bloque === 'RAFAGA');
            for (const btn of rafagaBotones) {
                // Buscar la escala base (la que empieza en 1) que esté activa
                const escalaBase = adminEscalasData.find(e => e.codigo_producto === btn.codigo_prod && e.cantidad_minima === 1 && e.activo);
                if (escalaBase) {
                    btn.precio_base = escalaBase.precio_unitario;
                    await window.posAPI.guardarBotonGrid(btn);
                }
            }
            
            alert("Escalas de precio actualizadas correctamente.");
            if (typeof window.cargarBotonesGrid === 'function') {
                window.cargarBotonesGrid();
            }
        }

        let adminPersonalizadosData = [];
        async function loadAdminPersonalizados() {
            const botones = await window.posAPI.obtenerBotonesGrid(false);
            adminPersonalizadosData = botones.filter(b => b.categoria === 'PERSONALIZADO');
            
            // Agrupar: primero botones con submenú, luego botones simples, y alfabéticamente por ID
            adminPersonalizadosData.sort((a, b) => {
                if (a.tiene_submenu !== b.tiene_submenu) {
                    return b.tiene_submenu ? -1 : 1;
                }
                return a.id.localeCompare(b.id);
            });
            
            const container = document.getElementById('admin-personalizados-list');
            container.innerHTML = adminPersonalizadosData.map(b => {
                let submenusHtml = '';
                if (b.tiene_submenu) {
                    const subs = b.submenus || [];
                    for(let i=0; i<8; i++) {
                        const sub = subs[i] || { label: '', precio: 0 };
                        const domId = b.id.replace(/\s+/g, '_');
                        submenusHtml += `
                                <div class="flex items-center gap-3 w-full mb-3">
                                    <span class="text-[10px] font-black text-slate-500 shrink-0 w-12 text-right"><i class="fas fa-level-up-alt fa-rotate-90 mr-1 text-slate-300"></i> Sub ${i+1}:</span>
                                    <input type="text" id="cust-sub-label-${domId}-${i}" value="${sub.label}" placeholder="Nombre sub-servicio" class="flex-1 p-2 bg-surface font-bold text-slate-800 text-xs outline-none rounded-lg border border-slate-200">
                                    <div class="flex items-center gap-1 shrink-0 pl-2">
                                        <label class="text-[10px] font-black text-slate-500">Q</label>
                                        <input type="number" id="cust-sub-precio-${domId}-${i}" value="${parseFloat(sub.precio || 0).toFixed(2)}" step="0.01" class="w-24 p-2 bg-surface text-center font-bold text-blue-600 outline-none rounded-lg border border-slate-200">
                                    </div>
                                </div>
                        `;
                    }
                }

                const domId = b.id.replace(/\s+/g, '_');
                return `
                <div class="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col mb-4">
                    <div class="flex items-center justify-between border-b border-border pb-3 mb-3">
                        <div class="flex-1 mr-4">
                            <label class="text-[9px] font-bold text-muted mb-1 block">NOMBRE DEL BOTÓN</label>
                            <input type="text" id="cust-label-${domId}" value="${b.label}" class="w-full p-2 border border-border bg-app rounded-lg font-bold text-sm text-main outline-none focus:border-primary transition-colors uppercase">
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex flex-col items-center ${b.tiene_submenu ? 'opacity-50' : ''}">
                                <label class="text-[9px] font-bold text-muted mb-1">PRECIO Q</label>
                                <input type="number" id="cust-precio-${domId}" value="${parseFloat(b.precio_base).toFixed(2)}" step="0.01" ${b.tiene_submenu ? 'disabled' : ''} class="w-20 p-2 border border-border bg-app rounded-lg text-center font-bold text-primary outline-none focus:border-primary transition-colors disabled:bg-surface-alt disabled:text-muted">
                            </div>
                            <div class="flex flex-col items-center">
                                <label class="text-[9px] font-bold text-muted mb-1">VISIBLE</label>
                                <input type="checkbox" id="cust-activo-${domId}" ${b.activo ? 'checked' : ''} class="w-5 h-5 accent-primary">
                            </div>
                        </div>
                    </div>
                    ${b.tiene_submenu ? `
                        <div class="mt-4 p-4 rounded-xl shadow-sm" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid var(--color-primary);">
                            <div class="flex items-center gap-2 mb-4">
                                <i class="fas fa-sitemap text-blue-600"></i>
                                <h5 class="text-[10px] font-black text-slate-800 uppercase tracking-widest">Sub-productos (Dejar vacío para omitir)</h5>
                            </div>
                            <div class="space-y-2">
                                ${submenusHtml}
                            </div>
                        </div>
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
                    <div class="bg-surface border border-border shadow-sm rounded-xl p-3 mb-2" data-gestion-key="${escaparAdminHtml(key)}">
                        <div class="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                            <div class="md:col-span-2">
                                <label class="text-[9px] font-black text-muted uppercase mb-1 block">Servicio</label>
                                <input id="gestion-nombre-${key}" value="${escaparAdminHtml(servicio.nombre)}" class="w-full p-2 border border-border bg-app text-main rounded-lg text-xs font-bold uppercase outline-none focus:border-primary transition-colors">
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-muted uppercase mb-1 block">Boleta Q</label>
                                <input id="gestion-boleta-${key}" type="number" step="0.01" value="${servicio.valor_boleta ?? ''}" placeholder="Vacío" class="w-full p-2 border border-border bg-app text-main rounded-lg text-xs font-bold outline-none focus:border-primary transition-colors">
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-muted uppercase mb-1 block">Comisión Q</label>
                                <input id="gestion-comision-${key}" type="number" step="0.01" value="${servicio.comision_pago ?? 0}" class="w-full p-2 border border-border bg-app text-main rounded-lg text-xs font-bold outline-none focus:border-primary transition-colors">
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-muted uppercase mb-1 block">Gestión Q</label>
                                <input id="gestion-valor-${key}" type="number" step="0.01" value="${servicio.valor_gestion ?? 0}" class="w-full p-2 border border-border bg-app text-main rounded-lg text-xs font-bold outline-none focus:border-primary transition-colors">
                            </div>
                            <div class="flex items-center gap-2 pb-2">
                                <label class="text-[9px] font-black text-muted uppercase">Activo</label>
                                <input id="gestion-activo-${key}" type="checkbox" ${servicio.activo ? 'checked' : ''} class="w-5 h-5 accent-primary">
                                ${servicio.id ? `<button onclick="eliminarServicioGestion(${servicio.id})" class="text-danger hover:text-danger-hover p-2 ml-2" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
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
                    <div class="bg-surface border border-border rounded-xl p-3">
                        <div class="flex items-end gap-3">
                            <div class="flex-1">
                                <label class="text-[9px] font-black text-muted uppercase">Nombre</label>
                                <input id="colaborador-nombre-${key}" value="${escaparAdminHtml(usuario.nombre)}" class="w-full p-2 border border-border bg-app text-main outline-none focus:border-primary rounded-lg text-xs font-bold uppercase">
                            </div>
                            <div class="flex-1">
                                <label class="text-[9px] font-black text-muted uppercase">Clave ${usuario.id ? '(Opcional)' : '(Req)'}</label>
                                <input type="password" id="colaborador-pwd-${key}" placeholder="${usuario.id ? 'Dejar vacío = no cambiar' : 'Nueva clave'}" class="w-full p-2 border border-border bg-app text-main outline-none focus:border-primary rounded-lg text-xs font-bold">
                            </div>
                            <div class="w-1/4">
                                <label class="text-[9px] font-black text-muted uppercase">Rol</label>
                                <select id="colaborador-rol-${key}" class="w-full p-2 border border-border bg-app text-main outline-none focus:border-primary rounded-lg text-xs font-bold uppercase">
                                    <option value="CAJERO" ${usuario.rol !== 'ADMINISTRADOR' ? 'selected' : ''}>Cajero</option>
                                    <option value="ADMINISTRADOR" ${usuario.rol === 'ADMINISTRADOR' ? 'selected' : ''}>Administrador</option>
                                </select>
                            </div>
                            <label class="flex items-center gap-2 text-[9px] font-black text-muted uppercase pb-2">
                                <input id="colaborador-activo-${key}" type="checkbox" ${usuario.activo ? 'checked' : ''} class="w-5 h-5 accent-primary"> Activo
                            </label>
                            ${usuario.id ? `<button onclick="eliminarColaborador(${usuario.id})" class="text-danger hover:text-danger-hover p-2 pb-2" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>`;
            }).join('');
        }

        function agregarColaborador() {
            adminColaboradoresData.push({ id: null, nombre: 'Nuevo colaborador', rol: 'CAJERO', activo: 1 });
            renderAdminColaboradores();
        }

        async function guardarAdminColaboradores() {
            for (let index = 0; index < adminColaboradoresData.length; index++) {
                const usuario = adminColaboradoresData[index];
                const key = usuario.id || `nuevo-${index}`;
                const nombre = document.getElementById(`colaborador-nombre-${key}`).value.trim();
                const rol = document.getElementById(`colaborador-rol-${key}`).value;
                const pwd = document.getElementById(`colaborador-pwd-${key}`).value;
                if (!nombre) continue;
                
                let pin_acceso = null;
                if (pwd) {
                    const hashRes = await window.posAPI.hashPassword(pwd, null);
                    if (hashRes.success) {
                        pin_acceso = `${hashRes.salt}:${hashRes.hash}`;
                    }
                } else if (!usuario.id) {
                    alert(`La contraseña es obligatoria para el nuevo usuario "${nombre}".`);
                    return;
                }

                const resultado = await window.posAPI.guardarColaborador({
                    id: usuario.id,
                    nombre,
                    rol,
                    activo: document.getElementById(`colaborador-activo-${key}`).checked,
                    pin_acceso
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

        