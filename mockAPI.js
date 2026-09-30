// mockAPI.js - Intercepta las llamadas IPC de Electron y devuelve datos en memoria
(function() {
    console.log("Mock API inicializada para versión web estática.");

    // Estado en memoria
    const state = {
        config: {
            nombre_negocio: "Taller Jacinto",
            tipo_negocio: "",
            simbolo_moneda: "Q",
            onboarding_completado: "1",
            auth_setup_completado: "1",
            tipo_impresora: "TERMICA"
        },
        botones: [
            // Ráfaga (Mitad)
            { id: 'rafaga-imp-bn', label: 'Imp. Negro', precio_base: 1.00, codigo_prod: 'IMP-BN', categoria: 'IMPRESION B/N', bloque: 'RAFAGA', color: '#1e293b', icono: 'fas fa-file-invoice', tiene_submenu: 0, submenus_json: '[]', orden: 1, activo: 1, comportamiento: 'NORMAL' },
            { id: 'rafaga-imp-col', label: 'Imp. Color', precio_base: 2.00, codigo_prod: 'IMP-COL', categoria: 'IMPRESION COLOR', bloque: 'RAFAGA', color: '#1e293b', icono: 'fas fa-eye', tiene_submenu: 0, submenus_json: '[]', orden: 2, activo: 1, comportamiento: 'NORMAL' },
            { id: 'rafaga-cop-bn', label: 'Copia Negro', precio_base: 0.50, codigo_prod: 'COP-BN', categoria: 'COPIA B/N', bloque: 'RAFAGA', color: '#0f172a', icono: 'fas fa-copy', tiene_submenu: 0, submenus_json: '[]', orden: 3, activo: 1, comportamiento: 'NORMAL' },
            { id: 'rafaga-empastado', label: 'Empastado', precio_base: 25.00, codigo_prod: 'EMP-BLA', categoria: 'EMPASTADO', bloque: 'RAFAGA', color: '#1e293b', icono: '', tiene_submenu: 1, submenus_json: JSON.stringify([
                { label: 'Opcion 1', precio: 25.00, codigo_prod: 'EMP-1' },
                { label: 'Opcion 2', precio: 30.00, codigo_prod: 'EMP-2' }
            ]), orden: 5, activo: 1, comportamiento: 'HYBRID_LONG_PRESS' },

            // Frecuentes (Mitad)
            { id: 'frec-escaneo', label: 'Escaneo', precio_base: 2.00, codigo_prod: 'SER-ESC', categoria: 'ESCANEO', bloque: 'FRECUENTES', color: '#ffffff', icono: '', tiene_submenu: 0, submenus_json: '[]', orden: 1, activo: 1, comportamiento: 'HYBRID_LONG_PRESS' },
            { id: 'frec-apa', label: 'Normas APA', precio_base: 0.00, codigo_prod: 'SER-APA', categoria: 'NORMAS APA', bloque: 'FRECUENTES', color: '#ffffff', icono: 'fas fa-book', tiene_submenu: 0, submenus_json: '[]', orden: 2, activo: 1, comportamiento: 'MANUAL_FULL' },
            { id: 'frec-lev', label: 'Lev. Texto', precio_base: 15.00, codigo_prod: 'SER-LEV', categoria: 'LEV.TEXTO', bloque: 'FRECUENTES', color: '#ffffff', icono: '', tiene_submenu: 1, submenus_json: JSON.stringify([
                { label: 'Levantado de texto', precio: 15.00, codigo_prod: 'LEV-SIMP' }
            ]), orden: 3, activo: 1, comportamiento: 'HYBRID_LONG_PRESS' },
            { id: 'frec-ciber', label: 'Ciber', precio_base: 5.00, codigo_prod: 'SER-CIB', categoria: 'TIEMPO CIBER', bloque: 'FRECUENTES', color: '#ffffff', icono: 'fas fa-desktop', tiene_submenu: 0, submenus_json: '[]', orden: 6, activo: 1, comportamiento: 'MANUAL_PRICE' },
            { id: 'frec-gestiones', label: 'Gestiones y Pagos', precio_base: 0.00, codigo_prod: 'SER-GES', categoria: 'GESTIONES', bloque: 'FRECUENTES', color: '#2563eb', icono: 'fas fa-file-invoice-dollar', tiene_submenu: 0, submenus_json: '[]', orden: 14, activo: 1, comportamiento: 'MODAL_GESTION' },
            { id: 'frec-aceite', label: 'Cambio de Aceite', precio_base: 0.00, codigo_prod: 'SER-ACEITE', categoria: 'TALLER', bloque: 'FRECUENTES', color: '#f59e0b', icono: 'fas fa-oil-can', tiene_submenu: 1, submenus_json: JSON.stringify([
                { label: 'Moto', precio: 75.00, codigo_prod: 'ACE-MOTO' },
                { label: 'Carro', precio: 150.00, codigo_prod: 'ACE-CARRO' }
            ]), orden: 15, activo: 1, comportamiento: 'NORMAL' }
        ],
        productos: [
            { Codigo: 'IMP-BN', Descripcion: 'Impresión Blanco y Negro', Categoria: 'IMPRESION B/N', Costo_Adquisicion: 0.10, Precio_Venta: 1.00, Stock: 1000, Vendidos: 500 },
            { Codigo: 'IMP-COL', Descripcion: 'Impresión a Color', Categoria: 'IMPRESION COLOR', Costo_Adquisicion: 0.50, Precio_Venta: 2.00, Stock: 500, Vendidos: 200 },
            { Codigo: 'COP-BN', Descripcion: 'Copia Blanco y Negro', Categoria: 'COPIA B/N', Costo_Adquisicion: 0.10, Precio_Venta: 0.50, Stock: 2000, Vendidos: 800 },
            { Codigo: 'SER-ESC', Descripcion: 'Escaneo de Documento', Categoria: 'ESCANEO', Costo_Adquisicion: 0, Precio_Venta: 2.00, Stock: 1, Vendidos: 100 },
            { Codigo: 'LAPIZ-01', Descripcion: 'Lápiz Mongol No. 2', Categoria: 'LIBRERIA', Costo_Adquisicion: 1.00, Precio_Venta: 2.50, Stock: 50, Vendidos: 20 },
            { Codigo: 'CUAD-01', Descripcion: 'Cuaderno 100 hojas', Categoria: 'LIBRERIA', Costo_Adquisicion: 5.00, Precio_Venta: 12.00, Stock: 30, Vendidos: 15 }
        ],
        pedidos: [],
        cotizaciones: [],
        tickets_aparcados: [],
        ventas_historial: [],
        escalas_precio: [
            { codigo_producto: 'IMP-BN', cantidad_minima: 1, cantidad_maxima: 10, precio_unitario: 1.00, activo: 1 },
            { codigo_producto: 'IMP-BN', cantidad_minima: 11, cantidad_maxima: 50, precio_unitario: 0.75, activo: 1 },
            { codigo_producto: 'IMP-BN', cantidad_minima: 51, cantidad_maxima: 9999, precio_unitario: 0.50, activo: 1 }
        ]
    };

    let nextTicketId = 1;

    window.posAPI = {
        // Configuraciones
        getConfig: async () => state.config,
        saveConfig: async (clave, valor) => {
            state.config[clave] = valor;
            return { success: true };
        },
        readHtmlFile: async (path) => {
            try {
                const response = await fetch(path);
                return await response.text();
            } catch (e) {
                console.error("Mock: Error fetching HTML file", e);
                return "";
            }
        },
        refocusWindow: async () => true,
        seleccionarImagen: async () => null,
        
        // Auth
        verifyAdminPassword: async () => ({ success: true, valid: true }),
        verifyUserPassword: async () => ({ success: true, valid: true }),
        
        // Inventario y Botones
        obtenerBotonesGrid: async (soloActivos) => {
            const botones = soloActivos ? state.botones.filter(b => b.activo === 1) : state.botones;
            return botones.map(b => {
                let submenusParsed = [];
                if (b.submenus_json) {
                    try { submenusParsed = JSON.parse(b.submenus_json); } catch(e){}
                }
                return { ...b, submenus: submenusParsed };
            });
        },
        guardarBotonGrid: async (btn) => {
            const index = state.botones.findIndex(b => b.id === btn.id);
            if (index >= 0) state.botones[index] = { ...state.botones[index], ...btn };
            else state.botones.push(btn);
            return { success: true };
        },
        buscarProductos: async (query) => {
            const lowerQuery = query.toLowerCase();
            return state.productos.filter(p => 
                p.Descripcion.toLowerCase().includes(lowerQuery) || 
                p.Codigo.toLowerCase().includes(lowerQuery)
            ).map(p => ({ codigo: p.Codigo, descripcion: p.Descripcion, categoria: p.Categoria, precio_venta: p.Precio_Venta, stock: p.Stock }));
        },
        obtenerTopCategorias: async () => ["IMPRESION B/N", "IMPRESION COLOR", "LIBRERIA"],
        obtenerTop20: async (cat) => {
            return state.productos
                .filter(p => !cat || p.Categoria === cat)
                .sort((a, b) => b.Vendidos - a.Vendidos)
                .slice(0, 20);
        },
        obtenerCategoriasUnicas: async () => ["IMPRESION B/N", "IMPRESION COLOR", "COPIA B/N", "ESCANEO", "LIBRERIA"],
        obtenerTodoInventario: async () => state.productos,
        
        // Aparcados
        aparcarTicket: async (data) => {
            const id = Date.now();
            state.tickets_aparcados.push({
                ID_Aparcado: id,
                Fecha_Hora: new Date().toLocaleString(),
                Datos_JSON: data.datos_json
            });
            return { success: true };
        },
        obtenerTicketsAparcados: async () => state.tickets_aparcados,
        eliminarTicketAparcado: async (id) => {
            state.tickets_aparcados = state.tickets_aparcados.filter(t => t.ID_Aparcado !== id);
            return { success: true };
        },
        
        // Pedidos & Cotizaciones
        crearPedido: async (pedido) => {
            const id = nextTicketId++;
            state.pedidos.push({ ID_Pedido: id, ...pedido, Estado: 'PENDIENTE', Fecha: new Date().toISOString().split('T')[0] });
            return { success: true, insertId: id };
        },
        obtenerPedidosPendientes: async () => state.pedidos.filter(p => p.Estado === 'PENDIENTE'),
        obtenerCotizaciones: async () => state.cotizaciones,
        
        calcularPrecioEscala: async (codigo_producto, cantidad, precio_base_fallback) => {
            const escalas_arr = state.escalas_precio || [];
            const escalas = escalas_arr.filter(e => e.codigo_producto === codigo_producto && e.activo === 1);
            if (escalas.length > 0) {
                const escala = escalas.find(e => cantidad >= e.cantidad_minima && cantidad <= e.cantidad_maxima);
                if (escala) return { escala_aplicada: true, precio_unitario: escala.precio_unitario };
                
                const maxEscala = escalas.reduce((prev, current) => (prev.cantidad_maxima > current.cantidad_maxima) ? prev : current);
                if (cantidad > maxEscala.cantidad_maxima) return { escala_aplicada: true, precio_unitario: maxEscala.precio_unitario };
            }
            return { escala_aplicada: false, precio_unitario: precio_base_fallback };
        },
        
        // Ventas e Historial
        registrarVenta: async (venta) => {
            const id = nextTicketId++;
            if (venta.tipo_documento === 'COTIZACION') {
                state.cotizaciones.push({ ID_Ticket: id, ...venta, Fecha: new Date().toISOString().split('T')[0] });
            } else {
                state.ventas_historial.push({ ID_Ticket: id, ...venta, Fecha: new Date().toISOString().split('T')[0] });
            }
            return { success: true, ticketId: id };
        },
        obtenerFechasHistorialTickets: async () => [new Date().toISOString().split('T')[0]],
        obtenerHistorialTickets: async (fecha) => state.ventas_historial,
        obtenerDetalleTicket: async (id) => [],
        anularYClonarTicket: async (id) => ({ success: true, ticketId: null }),
        
        // Reportes & Admin
        generarCorteZ: async () => ({ ventas: 15, efectivo: 1500, no_efectivo: 0, gastos: 0, total: 1500, desgloses: [], gastos_detalle: [], user: 'Admin' }),
        obtenerKardex: async () => [],
        buscarProductoGlobal: async (q) => window.posAPI.buscarProductos(q),
        actualizarPedido: async () => ({ success: true }),
        checkTurnoAbierto: async () => ({ success: true, abierto: true, cajero: 'ADMIN', turno: { Nombre_Cajero: 'ADMIN' } }),
        obtenerTurnoActual: async () => ({ ID_Sesion: 1, Nombre_Cajero: 'ADMIN', Estado_Turno: 'ABIERTO' }),
        
        // Otros mocks vitales
        obtenerServiciosGestion: async () => [
            { id: 1, nombre: 'Antecedentes Penales', valor_boleta: 30.00, valor_gestion: 10.00, comision_pago: 5.00, activo: 1 },
            { id: 2, nombre: 'Antecedentes Policiacos', valor_boleta: 30.00, valor_gestion: 10.00, comision_pago: 5.00, activo: 1 },
            { id: 3, nombre: 'Certificado de Nacimiento (RENAP)', valor_boleta: 15.00, valor_gestion: 10.00, comision_pago: 5.00, activo: 1 },
            { id: 4, nombre: 'Pago de Energía Eléctrica', valor_boleta: null, valor_gestion: 0.00, comision_pago: 5.00, activo: 1 }
        ],
        obtenerMetricasDashboard: async () => ({
            ventasDelDia: 1500,
            gananciaEstimada: 500,
            ticketsEmitidos: 25,
            efectivoCaja: 1500,
            gastosRegistrados: 0
        }),
        obtenerColaboradores: async () => [],
        getPrinters: async () => [],
        printSilent: async () => ({ success: true })
    };
})();
