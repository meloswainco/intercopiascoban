const btn = { label: 'Gestiones y Pagos', comportamiento: 'MODAL_GESTION' };
function argumentoInline(value) {
  return JSON.stringify(String(value ?? ''))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/'/g, '\\u0027')
    .replace(/"/g, '&quot;');
}
let onclickAction = `openGestionModal(${argumentoInline(btn.label)})`;
console.log(`<button onclick="${onclickAction}"></button>`);
