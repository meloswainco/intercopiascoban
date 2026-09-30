/**
 * PrintManager.js
 * Punto único de impresión. Cada documento sale por el canal configurado en Administración:
 * TERMICA → ESC/POS (main.js / PrinterService) · TINTA → plantilla HTML en #ink-ticket-print-area.
 */
class PrintManager {
    static _config = {};
    static _cola = Promise.resolve();

    static get moneda() {
        return this._config.simbolo_moneda || window.MONEDA || 'Q';
    }

    static get escapar() {
        return typeof escaparHtml === 'function' ? escaparHtml : (valor) => String(valor ?? '');
    }

    static get config() {
        return this._config;
    }

    static get logo() {
        return document.getElementById('print-logo-img');
    }

    static get printArea() {
        return document.getElementById('ink-ticket-print-area');
    }

    static async cargarConfig() {
        try {
            const config = await window.posAPI.getConfig();
            window.POS_CONFIG = { ...(window.POS_CONFIG || {}), ...config };
            this._config = config || {};
        } catch (err) {
            this._config = window.POS_CONFIG || {};
        }
        return this._config;
    }

    static esTinta() {
        return this._config.tipo_impresora === 'TINTA';
    }

    // Serializa todos los trabajos: webContents.print y el puerto ESC/POS no toleran trabajos simultáneos.
    static encolar(nombre, tarea) {
        const ejecutar = async () => {
            let resultado;
            try {
                await this.cargarConfig();
                resultado = await tarea();
                resultado = resultado && typeof resultado === 'object' ? resultado : { success: true };
            } catch (err) {
                console.error(`[Impresión] ${nombre}:`, err);
                resultado = { success: false, error: err?.message || String(err) };
            }
            if (!resultado.success && !/cancel/i.test(resultado.error || '')) this.avisarFallo(nombre, resultado.error);
            return resultado;
        };
        const resultado = this._cola.then(ejecutar, ejecutar);
        this._cola = resultado.catch(() => {});
        return resultado;
    }

    // Aviso no bloqueante: la operación (venta, orden, etc.) ya quedó guardada aunque la impresión falle.
    static avisarFallo(nombre, error) {
        console.error(`[Impresión] ${nombre}:`, error);
        const aviso = document.createElement('div');
        aviso.className = 'no-print fixed bottom-4 right-4 z-[10000] max-w-sm bg-red-600 text-white text-xs font-bold rounded-xl shadow-2xl px-4 py-3';
        aviso.textContent = `No se pudo imprimir (${nombre}): ${error || 'error desconocido'}. El registro sí quedó guardado.`;
        document.body.appendChild(aviso);
        setTimeout(() => aviso.remove(), 7000);
    }

    static async imprimirHtmlTinta() {
        const mediaCarta = this._config.formato_tinta === 'MEDIA_CARTA';
        document.getElementById('print-page-style')?.remove();
        const style = document.createElement('style');
        style.id = 'print-page-style';
        style.innerHTML = `@media print { @page { margin: 10mm !important; } }`;
        document.head.appendChild(style);
        document.body.classList.remove('printing-sales', 'printing-quotation', 'printing-report', 'printing-tech');
        document.body.classList.add('printing-ink');
        this.printArea.classList.toggle('ink-half-letter', mediaCarta);

        try {
            await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 150)));
            const impresora = this._config.impresora_seleccionada;
            const res = impresora
                ? await window.posAPI.printSilent(impresora)
                : await window.posAPI.printWithDialog();
            return res || { success: true };
        } finally {
            document.body.classList.remove('printing-ink');
            style.remove();
        }
    }

    static cabeceraTinta(titulo, lineasDerecha) {
        return `
            <div class="ink-header">
                ${this.logo?.src ? `<img src="${this.logo.src}" alt="">` : ''}
                <div>
                    <small>${this.escapar(this._config.tipo_negocio || 'COMPROBANTE')}</small>
                    <h1>${this.escapar(this._config.nombre_negocio || 'Negocio INCO')}</h1>
                    <p>${this.escapar(this._config.slogan || '')}</p>
                    <p>${this._config.whatsapp ? `WhatsApp: ${this.escapar(this._config.whatsapp)}` : ''}</p>
                </div>
                <aside>
                    <strong>${this.escapar(titulo)}</strong>
                    ${lineasDerecha.filter(Boolean).map(linea => `<span>${this.escapar(linea)}</span>`).join('')}
                </aside>
            </div>`;
    }

    // ---- API pública ----
    static imprimirDocumento(datos) {
        return this.encolar('Documento', () => this.esTinta()
            ? this._documentoTinta(datos)
            : window.posAPI.printDocument({ type: 'VENTA', data: datos }));
    }

    static imprimirOrdenTecnica(datos) {
        return this.encolar('Orden técnica', () => this.esTinta()
            ? this._ordenTecnicaTinta(datos)
            : window.posAPI.printDocument({ type: 'TECH', data: datos }));
    }

    static imprimirCorteZ(zData) {
        return this.encolar('Corte Z', () => this.esTinta()
            ? this._corteZTinta(zData)
            : window.posAPI.printDocument({ type: 'Z', data: zData }));
    }

    // ---- Plantillas de tinta ----
    static async _documentoTinta(datosImpresion) {
        const resultado = await window.posAPI.getDocumentPrintData(datosImpresion);
        if (!resultado?.success) return resultado || { success: false, error: 'No se pudo preparar el documento.' };

        const { documento, detalles } = resultado;
        const tipo = datosImpresion.ticketType || 'TICKET';
        const esPedido = tipo === 'PEDIDO';
        const esAbono = tipo === 'ABONO_CXC';
        const esCotizacion = documento.Tipo_Documento === 'COTIZACION';
        
        const identificador = esAbono ? documento.ID_Abono : (esPedido ? documento.ID_Pedido : documento.ID_Ticket);
        const titulo = datosImpresion.customTitle || (esAbono ? 'COMPROBANTE DE ABONO' : (esPedido ? 'PEDIDO PENDIENTE' : (esCotizacion ? 'COTIZACIÓN' : 'COMPROBANTE DE VENTA')));
        const fecha = esAbono ? documento.Fecha_Hora : `${documento.Fecha || ''} ${documento.Hora || ''}`;
        
        const lineas = detalles.filter((item) => item.Categoria !== 'ANTICIPO').map((item) => {
            const esDescuento = item.Categoria === 'DESCUENTO' || item.Codigo_Producto === 'DESCUENTO';
            const descripcion = esDescuento ? `DESCUENTO: ${item.Motivo_Descuento || item.Descripcion}` : item.Descripcion;
            return `<tr><td>${Number(item.Cantidad || 0)}</td><td>${this.escapar(descripcion)}</td><td>${this.moneda}${Number(item.Precio_Unitario || 0).toFixed(2)}</td><td>${esDescuento ? '-' : ''}${this.moneda}${Math.abs(Number(item.Subtotal || 0)).toFixed(2)}</td></tr>`;
        }).join('') || '<tr><td colspan="4">Sin líneas de detalle.</td></tr>';
        
        const anticipos = detalles.filter((item) => item.Categoria === 'ANTICIPO').reduce((acumulado, item) => acumulado + Math.abs(Number(item.Subtotal || 0)), 0);
        const total = esAbono ? Number(documento.Monto || 0) : Number(esPedido ? documento.Total : documento.Total_Documento || 0);
        
        const resumen = esCotizacion
            ? `<p class="ink-total"><span>Total cotizado</span><strong>${this.moneda}${total.toFixed(2)}</strong></p>`
            : esAbono
            ? `<p><span>Monto abonado</span><strong>${this.moneda}${total.toFixed(2)}</strong></p><p><span>Saldo restante</span><strong>${this.moneda}${Number(documento.Saldo_Actual || 0).toFixed(2)}</strong></p>`
            : `${anticipos ? `<p><span>Total parcial</span><strong>${this.moneda}${(total + anticipos).toFixed(2)}</strong></p><p><span>Anticipo previo</span><strong>-${this.moneda}${anticipos.toFixed(2)}</strong></p>` : ''}<p class="ink-total"><span>${esPedido ? 'Total del pedido' : 'Total a pagar'}</span><strong>${this.moneda}${total.toFixed(2)}</strong></p>${esPedido ? `<p><span>Saldo pendiente</span><strong>${this.moneda}${Number(documento.Saldo || 0).toFixed(2)}</strong></p>` : ''}${!esPedido && !esAbono && !datosImpresion.reimpresion && datosImpresion.recibido !== undefined ? `<p><span>Efectivo recibido</span><strong>${this.moneda}${Number(datosImpresion.recibido).toFixed(2)}</strong></p><p><span>Cambio</span><strong>${this.moneda}${Number(datosImpresion.cambio || 0).toFixed(2)}</strong></p>` : ''}`;
        
        this.printArea.innerHTML = `
            ${this.cabeceraTinta(titulo, [`No. ${identificador}`, fecha, datosImpresion.reimpresion ? 'REIMPRESIÓN' : ''])}
            <div class="ink-meta">
                <div><small>Cliente</small><strong>${this.escapar(documento.Cliente || 'Consumidor Final')}</strong></div>
                <div><small>NIT</small><strong>${this.escapar(documento.NIT || 'CF')}</strong></div>
                <div><small>${esCotizacion ? 'Cotizado por' : 'Cajero'}</small><strong>${this.escapar(documento.Cajero || localStorage.getItem('currentUser') || 'SISTEMA')}</strong></div>
                <div><small>Pago</small><strong>${this.escapar(esCotizacion ? '—' : (documento.Metodo_Pago || 'EFECTIVO'))}</strong></div>
            </div>
            <table>
                <thead><tr><th>Cant.</th><th>Descripción</th><th>P. unit.</th><th>Importe</th></tr></thead>
                <tbody>${lineas}</tbody>
            </table>
            <div class="ink-summary">${resumen}</div>
            <div class="ink-footer">
                ${this.escapar(this.config.mensaje_final || 'Gracias por su compra')}
                <small>${esCotizacion
                    ? 'Precios sujetos a cambio sin previo aviso. Este documento no es un comprobante de pago.'
                    : 'Comprobante de control interno. Exija su Factura Electrónica (FEL).'}</small>
            </div>`;

        return this.imprimirHtmlTinta();
    }

    static async _ordenTecnicaTinta(data) {
        const lineas = `
            <tr>
                <td colspan="4">
                    <strong>Falla reportada:</strong> ${this.escapar(data.falla)}
                </td>
            </tr>
            ${data.reco ? `<tr><td colspan="4"><strong>Recomendación:</strong> ${this.escapar(data.reco)}</td></tr>` : ''}
        `;

        const resumen = `
            <p><span>Total estimado</span><strong>${this.moneda}${parseFloat(data.total || 0).toFixed(2)}</strong></p>
            <p><span>Anticipo</span><strong>${this.moneda}${parseFloat(data.anticipo || 0).toFixed(2)}</strong></p>
            <p class="ink-total"><span>Saldo Pendiente</span><strong>${this.moneda}${parseFloat(data.saldo || 0).toFixed(2)}</strong></p>
        `;

        this.printArea.innerHTML = `
            ${this.cabeceraTinta('ORDEN TÉCNICA', [`No. ${data.idOrden}`, data.fechaAhora])}
            <div class="ink-meta">
                <div><small>Cliente</small><strong>${this.escapar(data.cliente)}</strong></div>
                <div><small>Teléfono</small><strong>${this.escapar(data.tel || 'No indicado')}</strong></div>
                <div><small>Recepcionista</small><strong>${this.escapar(localStorage.getItem('currentUser') || 'SISTEMA')}</strong></div>
                <div><small>Equipo</small><strong>${this.escapar(data.equipo)}</strong></div>
            </div>
            <table>
                <thead><tr><th colspan="4" style="text-align:left;">Detalles del Servicio</th></tr></thead>
                <tbody>${lineas}</tbody>
            </table>
            <div class="ink-summary">${resumen}</div>
            <div class="ink-footer">
                ${this.escapar(this.config.mensaje_final || 'Gracias por su preferencia')}
                <small>Diagnóstico 24-48 hrs. 30 días de garantía en mano de obra. Equipos abandonados más de 90 días serán desechados.</small>
                <small style="margin-top:28px;">_______________________<br>Firma Cliente</small>
            </div>
        `;

        return this.imprimirHtmlTinta();
    }

    static async _corteZTinta(z) {
        const m = (valor) => `${this.moneda}${Number(valor || 0).toFixed(2)}`;
        const fecha = (valor) => window.formatearFechaHora(valor);
        const fila = (concepto, importe) => `<tr><td colspan="3">${this.escapar(concepto)}</td><td>${importe}</td></tr>`;
        const diferencia = Number(z.diferencia_caja || 0);
        const textoDiferencia = diferencia === 0 ? 'CUADRE EXACTO' : `${diferencia < 0 ? 'FALTANTE' : 'SOBRANTE'} ${m(Math.abs(diferencia))}`;

        const filas = z.es_ciego
            ? fila('Pagos de terceros', m(z.total_terceros)) + fila('Dinero en caja (contado)', m(z.efectivo_ingresado))
            : [
                fila('Transacciones registradas', Number(z.total_ventas || 0)),
                ...(z.por_metodo || []).map(x => fila(`Pago ${x.metodo_pago} (${x.cantidad})`, m(x.total))),
                ...(z.por_categoria || []).map(c => fila(`Área ${c.Categoria || c.categoria}`, m(c.total))),
                Number(z.total_cobros_cuentas || 0) > 0 ? fila('Cobros de cuentas por cobrar', m(z.total_cobros_cuentas)) : '',
                ...(z.lista_gastos || []).map(g => fila(`Gasto: ${g.Descripcion}`, `-${m(g.Monto)}`)),
                fila('Pagos de terceros', m(z.total_terceros))
            ].join('');

        const resumen = z.es_ciego ? '' : `
            <p><span>Gran total</span><strong>${m(z.gran_total)}</strong></p>
            <p><span>No efectivo</span><strong>${m(z.total_no_efectivo)}</strong></p>
            <p><span>Gastos</span><strong>-${m(z.total_gastos)}</strong></p>
            <p class="ink-total"><span>Efectivo esperado</span><strong>${m(z.efectivo_esperado)}</strong></p>
            <p><span>Dinero en caja</span><strong>${m(z.efectivo_ingresado)}</strong></p>
            <p><span>Diferencia</span><strong>${textoDiferencia}</strong></p>`;

        this.printArea.innerHTML = `
            ${this.cabeceraTinta(z.es_ciego ? 'CORTE Z (A CIEGAS)' : 'CORTE DE CAJA (Z)', [`Desde: ${fecha(z.desde)}`, `Hasta: ${fecha(z.hasta)}`])}
            <div class="ink-meta">
                <div><small>Usuario</small><strong>${this.escapar(z.usuario || 'N/A')}</strong></div>
                <div><small>Terminal</small><strong>${this.escapar(this.config.terminal_id || 'CAJA_1')}</strong></div>
                <div><small>Impreso</small><strong>${this.escapar(window.formatearFechaHora(new Date()))}</strong></div>
                <div><small>Fecha operativa</small><strong>${this.escapar(z.fecha || '')}</strong></div>
            </div>
            <table>
                <thead><tr><th colspan="3" style="text-align:left;">Concepto</th><th>Importe</th></tr></thead>
                <tbody>${filas}</tbody>
            </table>
            <div class="ink-summary">${resumen}</div>
            <div class="ink-footer">
                <small style="margin-top:28px;">_______________________<br>Firma Responsable</small>
            </div>`;

        return this.imprimirHtmlTinta();
    }
}

window.PrintManager = PrintManager;
window.imprimirTicketDocumento = (datos) => PrintManager.imprimirDocumento(datos);
window.imprimirOrdenTecnica = (datos) => PrintManager.imprimirOrdenTecnica(datos);
window.imprimirCorteZDocumento = (zData) => PrintManager.imprimirCorteZ(zData);
