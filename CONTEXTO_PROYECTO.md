# Contexto del proyecto Intercopias Coban

Actualizado: 2026-10-20

## Resumen

Sitio web estatico de Intercopias Coban, negocio de impresion, empastado, cursos y servicios para comercios. Las paginas principales son `index.html`, `cotizador.html`, `cursos.html`, `normas.html`, `tecnico.html` y `pos_landing.html`; tambien existen `privacidad.html` y `demo.html`.

La web se publica como sitio estatico mediante GitHub y Cloudflare, segun el propietario. No hay un proceso de build de frontend documentado. Las paginas usan HTML, Tailwind por CDN, `intercopias.css` y, en seis paginas principales, `intercopias.js`.

## Sistema visual

- Hoja de estilos compartida: `intercopias.css`.
- Tipografia: Montserrat para encabezados; Inter para texto de interfaz y cuerpo.
- Colores de marca: azul marino `#002347`, azul `#0058bc`, fondos claros y verde para WhatsApp.
- Navegacion, menu movil, enlace activo, scroll a anclas y variantes de contacto se manejan desde `intercopias.js`.
- Las paginas `cursos.html`, `normas.html`, `tecnico.html` y `pos_landing.html` fueron alineadas con la navbar, menu y footer comunes.
- En `index.html`, la tarjeta de Servicio Tecnico usa `Sopohome.jpg` como fondo y la tarjeta POS incorpora `posincologo.ico`.
- `normas.html` usa `ilusnorma.jpg` para comparar estilos APA, Gordillo y personalizado.

## Pagina POS

Archivo: `pos_landing.html`.

La pagina se reorganizo para llevar al visitante de la oferta a las funciones, despues a la prueba y finalmente a las condiciones y compra:

1. Hero con propuesta, captura, precio y contador.
2. Franja de datos clave.
3. Resumen de comercios atendidos.
4. Tres modos: cobro, pedido y cotizacion.
5. Seguimiento de pedidos, cotizaciones y saldos.
6. Inventario y catalogo.
7. Comprobantes, formatos de impresion y nota de SAT.
8. Casos de comercios en operacion.
9. Condiciones de licencia.
10. Cierre de preventa y CTA.

El copy se simplifico para priorizar claridad y hechos concretos. La pagina tiene alrededor de 1,025 palabras en el contenido principal tras la ultima revision. Evitar repetir ventajas entre el hero, la franja de datos, condiciones y cierre.

### Copy principal vigente

- Hero: «Cobra, cotiza y controla tu inventario desde el mostrador».
- Modos: «Tres tareas del mostrador, una sola pantalla».
- CTA del hero: «Solicitar licencia por WhatsApp».
- La seccion de comprobantes indica que el POS no se conecta directamente a SAT y que la App FEL oficial se puede usar sin costo.

### Oferta y hechos del producto

- Precio de preventa: Q550 hasta el 31 de octubre de 2026.
- Precio regular anunciado desde el 1 de noviembre de 2026: Q770.
- Ahorro anunciado: Q220.
- Licencia perpetua y hasta 15 computadoras.
- Modos de cobro, pedido y cotizacion desde el mismo modulo.
- El propietario confirma que se pueden ocultar botones predefinidos y crear botones personalizados para servicios de cada rubro. Ejemplos: cambio de aceite, carga de celular, cambio de pin de carga y recarga de saldo; entre los accesos que se pueden ocultar menciona escaneo y grabacion de CD.
- El modo pedido permite crear apartados/comandas; se liquida despues.
- Las cotizaciones pueden guardarse hasta 30 dias y no afectan stock, segun el copy actual.
- La pagina indica que las cajas son independientes y no se conectan entre si en tiempo real; el inventario principal se administra desde un equipo central.
- Importacion/exportacion Excel, lector de codigos, control de sala/bodega y formatos de comprobantes termicos 58/80 mm y carta/media carta aparecen como funciones.
- La pagina indica que el POS no tiene conexion directa con SAT; presenta la App FEL oficial como alternativa sin costo.

El contador muestra dias y horas, sin minutos. Al entrar en los ultimos cinco dias, cambia el rotulo del hero, barra, boton flotante y bloque final a «Ultimos 5 dias de preventa». La preventa vence el `2026-11-01T00:00:00-06:00` (medianoche de Guatemala, cierre del 31 de octubre). Al llegar la fecha, `pos_landing.html` cambia automaticamente a Q770: actualiza hero, barra, menu, CTA, flotante y meta description, y oculta el ahorro y los precios tachados. Antes de una nueva campana, actualizar fecha limite, precios y textos en el copy y en `updateAfterPreorder()`.

## Contacto y atribucion

Numero de contacto: `(502) 8000 2944`; enlace telefonico: `tel:+50280002944`; enlace WhatsApp base: `https://wa.me/50280002944`.

`intercopias.js` adapta los enlaces WhatsApp en las seis paginas que lo cargan:

- Trafico normal: conserva el enlace a WhatsApp y agrega debajo «¿Prefieres llamar?» con el numero clicable.
- Cuando `utm_source=tiktok`: sustituye los enlaces WhatsApp por un CTA «Llama o escribe a: (502) 8000 2944» que abre el marcador telefonico. El boton flotante se oculta en anchos menores a 1024 px. La fuente UTM se conserva en `sessionStorage` al navegar por el sitio.
- El script envia `contact_cta_click` a `dataLayer`, con `contact_method`, `utm_source`, `utm_medium`, `utm_campaign`, `page_path` y `cta_label`.

Enlace recomendado para la bio general de TikTok:

`https://intercopias.com/?utm_source=tiktok&utm_medium=social&utm_campaign=perfil_bio`

Enlace para una publicacion especifica del POS:

`https://intercopias.com/pos_landing.html?utm_source=tiktok&utm_medium=social&utm_campaign=video_pos`

Google Tag Manager tiene ID `GTM-MKTSQDQZ` y se carga solo si se acepta la categoria de medicion. `contact_cta_click` llega a `dataLayer` unicamente con ese consentimiento. No se ha verificado que GTM convierta el evento en uno de GA4. Un clic no confirma que se haya enviado un mensaje, realizado una llamada o concretado una compra.

## Privacidad y consentimiento

- `privacidad.html` explica los datos tecnicos de visita, almacenamiento local, canales de contacto y proveedores externos.
- `intercopias.js` muestra el aviso de consentimiento en las seis paginas principales y permite aceptar opcionales, rechazarlos o configurar dos categorias: medicion (GTM) y medios externos (TikTok).
- Sin aceptar medicion, GTM no se descarga y los eventos de contacto no se envian al `dataLayer`. Sin aceptar medios externos, TikTok no se carga; el visitante puede activarlo pulsando el boton del video.
- La eleccion se guarda en `localStorage` (`inco_privacy_consent_v1`) y se puede cambiar desde el enlace del footer o desde la politica.
- La variante TikTok usa una marca de sesion en `sessionStorage`. `index.html` recuerda si se cerro el popup POS; `demo.html` guarda la preferencia local de imprimir ticket.
- Tailwind, Google Fonts y Font Awesome siguen solicitandose desde CDN antes de la eleccion. La politica lo revela; para bloquear toda solicitud externa hasta consentimiento, considerar servir estos recursos localmente.
- El texto legal es una base informativa, no una revision juridica. Confirmar responsable legal y retencion de datos antes de considerarlo definitivo.

## Criterios de copy

- Escribir en español claro y directo para comercios y emprendedores de Guatemala.
- Explicar la funcion y el resultado para el usuario; evitar superlativos y beneficios no demostrados.
- No inventar cifras, testimonios, garantias, disponibilidad, compatibilidad o condiciones comerciales.
- Mantener un CTA principal claro y las condiciones importantes cerca de la oferta.
- Para mejorar copy web, usar el skill `copywriting` en `.agents/skills/COpy marketing/SKILL COPY marketing.md`.

## Pendientes por confirmar

- Aclarar exactamente como opera el inventario entre las hasta 15 instalaciones y las cajas independientes. No prometer sincronizacion en tiempo real.
- Confirmar el alcance de soporte, requisitos minimos del equipo, metodo/plazo de pago y condiciones de activacion antes de agregarlos al copy.
- Configurar y probar en GTM/GA4 un trigger de evento personalizado para `contact_cta_click` y la separacion de metodos WhatsApp/telefono por UTM.
- Revisar la politica con la persona responsable del negocio o un asesor legal antes de publicarla como texto definitivo.
- Revisar las fechas y precios despues del 31 de octubre de 2026; el contador y varios textos son especificos de esta campana.
