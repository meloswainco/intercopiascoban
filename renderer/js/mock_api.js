// Mock API para versión Demo Sandbox

const mockData = {
    inventario_sala: [
      { Codigo: "PROD-321403", Descripcion: "Lapicero Bic Rojo", Categoria: "Libreria", Costo_Adquisicion: 1.4, Precio_Venta: 2.25, Stock: 23, Vendidos: 45 },
      { Codigo: "PROD-355074", Descripcion: "Lapicero Bic Negro", Categoria: "Libreria", Costo_Adquisicion: 1.4, Precio_Venta: 2.25, Stock: 24, Vendidos: 89 },
      { Codigo: "PROD-405122", Descripcion: "Lapiz Mongol", Categoria: "Libreria", Costo_Adquisicion: 1.6, Precio_Venta: 2.5, Stock: 12, Vendidos: 120 },
      { Codigo: "PROD-183297", Descripcion: "Folder Manila Carta", Categoria: "Libreria", Costo_Adquisicion: 1.25, Precio_Venta: 2, Stock: 122, Vendidos: 75 },
      { Codigo: "PROD-000005", Descripcion: "Cuaderno Espiral 100 Hojas", Categoria: "Libreria", Costo_Adquisicion: 8.0, Precio_Venta: 12.0, Stock: 50, Vendidos: 200 },
      { Codigo: "PROD-000006", Descripcion: "Borrador de Queso", Categoria: "Libreria", Costo_Adquisicion: 1.0, Precio_Venta: 2.0, Stock: 100, Vendidos: 150 },
      { Codigo: "PROD-000007", Descripcion: "Sacapuntas Metal", Categoria: "Libreria", Costo_Adquisicion: 2.5, Precio_Venta: 4.0, Stock: 80, Vendidos: 110 },
      { Codigo: "PROD-000008", Descripcion: "Marcador Permanente Negro", Categoria: "Libreria", Costo_Adquisicion: 3.5, Precio_Venta: 6.0, Stock: 40, Vendidos: 60 },
      { Codigo: "PROD-000009", Descripcion: "Marcador Fluorescente Amarillo", Categoria: "Libreria", Costo_Adquisicion: 4.0, Precio_Venta: 7.0, Stock: 45, Vendidos: 85 },
      { Codigo: "PROD-000010", Descripcion: "Pegamento en Barra 20g", Categoria: "Libreria", Costo_Adquisicion: 6.0, Precio_Venta: 10.0, Stock: 35, Vendidos: 40 },
      { Codigo: "PROD-000011", Descripcion: "Tijera Escolar", Categoria: "Libreria", Costo_Adquisicion: 5.0, Precio_Venta: 8.5, Stock: 25, Vendidos: 30 },
      { Codigo: "PROD-000012", Descripcion: "Papel Bond Carta (Resma)", Categoria: "Papeleria", Costo_Adquisicion: 30.0, Precio_Venta: 45.0, Stock: 10, Vendidos: 25 },
      { Codigo: "PROD-000013", Descripcion: "Papel Bond Oficio (Resma)", Categoria: "Papeleria", Costo_Adquisicion: 35.0, Precio_Venta: 50.0, Stock: 8, Vendidos: 15 },
      { Codigo: "PROD-000014", Descripcion: "Cartulina Blanca", Categoria: "Papeleria", Costo_Adquisicion: 1.5, Precio_Venta: 3.0, Stock: 150, Vendidos: 90 },
      { Codigo: "PROD-000015", Descripcion: "Silicon Liquido 100ml", Categoria: "Libreria", Costo_Adquisicion: 7.0, Precio_Venta: 12.0, Stock: 30, Vendidos: 55 },
      { Codigo: "PROD-000016", Descripcion: "Cinta Adhesiva Transparente", Categoria: "Libreria", Costo_Adquisicion: 4.0, Precio_Venta: 7.0, Stock: 60, Vendidos: 70 },
      { Codigo: "PROD-000017", Descripcion: "Regla Plastica 30cm", Categoria: "Libreria", Costo_Adquisicion: 2.0, Precio_Venta: 4.0, Stock: 55, Vendidos: 45 },
      { Codigo: "PROD-000018", Descripcion: "Corrector Liquido", Categoria: "Libreria", Costo_Adquisicion: 5.5, Precio_Venta: 9.0, Stock: 42, Vendidos: 35 },
      { Codigo: "PROD-000019", Descripcion: "Engrapadora Pequeña", Categoria: "Libreria", Costo_Adquisicion: 15.0, Precio_Venta: 25.0, Stock: 15, Vendidos: 10 },
      { Codigo: "PROD-000020", Descripcion: "Caja de Grapas", Categoria: "Libreria", Costo_Adquisicion: 3.0, Precio_Venta: 5.5, Stock: 50, Vendidos: 20 }
    ],
    grid_botones: [
      { id: "rafaga-imp-bn", label: "Imp. Negro", precio_base: 1, codigo_prod: "IMP-BN", categoria: "IMPRESION B/N", bloque: "RAFAGA", color: "#1e293b", icono: "fas fa-file-invoice", tiene_submenu: 0, submenus_json: "[]", orden: 1, activo: 1, comportamiento: "NORMAL" },
      { id: "rafaga-cop-bn", label: "Copia Negro", precio_base: 0.5, codigo_prod: "COP-BN", categoria: "COPIA B/N", bloque: "RAFAGA", color: "#0f172a", icono: "fas fa-copy", tiene_submenu: 0, submenus_json: "[]", orden: 3, activo: 1, comportamiento: "NORMAL" },
      { id: "frec-escaneo", label: "Escaneo", precio_base: 2, codigo_prod: "SER-ESC", categoria: "ESCANEO", bloque: "FRECUENTES", color: "#ffffff", icono: "", tiene_submenu: 0, submenus_json: "[]", orden: 1, activo: 1, comportamiento: "HYBRID_LONG_PRESS" },
      { id: "rafaga-empastado", label: "Empastado", precio_base: 25, codigo_prod: "EMP-BLA", categoria: "EMPASTADO", bloque: "RAFAGA", color: "#ffffff", icono: "", tiene_submenu: 1, submenus_json: "[{\"label\":\"Opcion 1\",\"precio\":25,\"codigo_prod\":\"EMP-1\"},{\"label\":\"Opcion 2\",\"precio\":30,\"codigo_prod\":\"EMP-2\"}]", orden: 5, activo: 1, comportamiento: "HYBRID_LONG_PRESS" },
      { id: "frec-gestiones", label: "Gestiones y Pagos", precio_base: 0, codigo_prod: "SER-GES", categoria: "GESTIONES", bloque: "FRECUENTES", color: "#2563eb", icono: "fas fa-file-invoice-dollar", tiene_submenu: 0, submenus_json: "[]", orden: 14, activo: 1, comportamiento: "MODAL_GESTION" }
    ],
    tickets_aparcados: []
  };
  
  // Exponer API simulada globalmente
  window.posAPI = {
    // Autenticación & Seguridad
    verifyAdminPassword: async () => true, // Siempre permite en demo
    
    // Configuraciones
    getConfig: async () => ({
        auth_setup_completado: '1',
        onboarding_completado: '1',
        pos_mode: 'autogestion',
        admin_name: 'DEMO ADMIN',
        nombre_negocio: 'INCO POS DEMO',
        tipo_negocio: 'DEMO',
        permitir_stock_negativo: '1'
    }),
    saveConfig: async () => true,
  
    // Inventario
    buscarProductos: async (query) => {
      const q = query.toLowerCase();
      const filtrados = mockData.inventario_sala.filter(p => 
        p.Codigo.toLowerCase().includes(q) || 
        p.Descripcion.toLowerCase().includes(q)
      );
      return filtrados.map(p => ({
          codigo: p.Codigo,
          descripcion: p.Descripcion,
          precio_venta: p.Precio_Venta,
          categoria: p.Categoria,
          stock: p.Stock
      }));
    },
    buscarProductoGlobal: async (codigo) => {
      const p = mockData.inventario_sala.find(p => p.Codigo === codigo);
      if (p) return { ...p, origen: 'SALA' };
      return null;
    },
    obtenerTodoInventario: async () => mockData.inventario_sala,
    obtenerCategoriasUnicas: async () => ["Libreria", "Papeleria"],
    obtenerTop20: async () => mockData.inventario_sala.slice(0, 20), // Top 20 simulado
  
    // Botones Rápida Venta
    obtenerBotonesGrid: async (soloActivos = false) => mockData.grid_botones,
  
    // Gestiones y Pagos
    obtenerServiciosGestion: async () => [
      { id: 1, nombre: 'Antecedentes penales', valor_boleta: 30, comision_pago: 10, valor_gestion: 15, activo: 1 },
      { id: 2, nombre: 'Antecedentes policiacos', valor_boleta: 30, comision_pago: 10, valor_gestion: 15, activo: 1 },
      { id: 3, nombre: 'Certificado RENAP', valor_boleta: 19, comision_pago: 10, valor_gestion: 15, activo: 1 }
    ],
  
    // Escalas de Precio
    obtenerEscalaPorProducto: async (codigo) => {
      if (codigo === 'IMP-BN') {
        return [
          { cantidad_minima: 1, cantidad_maxima: 10, precio_unitario: 1.00 },
          { cantidad_minima: 11, cantidad_maxima: 50, precio_unitario: 0.75 }
        ];
      }
      return [];
    },
    calcularPrecioEscala: async ({codigo_producto, cantidad, precio_base_fallback}) => {
      if (codigo_producto === 'IMP-BN' && cantidad > 10) return 0.75 * cantidad;
      return precio_base_fallback * cantidad;
    },
  
    // Tickets Aparcados
    aparcarTicket: async (data) => {
      mockData.tickets_aparcados.push({ id: Date.now(), ...data });
      return { success: true };
    },
    obtenerTicketsAparcados: async () => mockData.tickets_aparcados,
    eliminarTicketAparcado: async (id) => {
      mockData.tickets_aparcados = mockData.tickets_aparcados.filter(t => t.id !== id);
      return true;
    },
  
    // Ventas y Pedidos
    registrarVenta: async (ventaData) => {
      alert("¡Venta cobrada con éxito en Demo!");
      return { id: Math.floor(Math.random() * 1000) };
    },
    crearPedido: async (pedidoData) => {
      alert("¡Pedido creado en Demo!");
      return { id: Math.floor(Math.random() * 1000) };
    },
  
    // Impresión
    printSilent: async () => { console.log("Impresión simulada"); },
    getPrinters: async () => [{name: 'Impresora Demo 1', isDefault: true}]
  };
