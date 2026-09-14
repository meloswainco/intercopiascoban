/**
 * admin_auth.js
 * Módulo para gestionar la autenticación de usuarios y administradores.
 */

let adminAuthCallback = null;
let globalAdminName = "ADMIN";

async function initUsers() {
    if (!window.posAPI) return;
    const config = await window.posAPI.getConfig();

    if (config.auth_setup_completado !== '1') {
        document.getElementById('modal-setup-inicial').classList.remove('hidden');
        return;
    }

    const posMode = config.pos_mode || 'autogestion';
    globalAdminName = config.admin_name || 'ADMIN';
    window.currentUserIsAdmin = posMode === 'autogestion';
    document.querySelectorAll('.admin-users-only').forEach(el => el.classList.toggle('hidden', posMode !== 'colaboradores'));

    if (posMode === 'autogestion') {
        selectUser(globalAdminName, true);
    } else {
        showUsersModal();
    }
}

async function guardarSetupInicial() {
    const name = document.getElementById('setup-admin-name').value.trim().toUpperCase();
    const pwd = document.getElementById('setup-admin-pwd').value;
    const mode = document.getElementById('setup-pos-mode').value;

    if (!name || !pwd) {
        alert("Por favor completa el nombre de administrador y la contraseña.");
        return;
    }

    const result = await window.posAPI.hashPassword(pwd, null);
    if (result.success) {
        await window.posAPI.saveConfig('admin_name', name);
        await window.posAPI.saveConfig('admin_pwd_hash', result.hash);
        await window.posAPI.saveConfig('admin_pwd_salt', result.salt);
        await window.posAPI.saveConfig('pos_mode', mode);
        await window.posAPI.saveConfig('auth_setup_completado', '1');

        // Inicializar lista de usuarios con el admin
        localStorage.setItem('usersList', JSON.stringify([name]));

        document.getElementById('modal-setup-inicial').classList.add('hidden');
        initUsers();
    } else {
        alert("Error al guardar la seguridad: " + result.error);
    }
}

function requestAdminPassword(callback) {
    if (window.currentUserIsAdmin) {
        if (callback) callback();
        return;
    }
    
    adminAuthCallback = callback;
    document.getElementById('auth-admin-pwd').value = '';
    document.getElementById('modal-admin-auth').classList.remove('hidden');
    setTimeout(() => document.getElementById('auth-admin-pwd').focus(), 100);
}

function cancelarAuthAdmin() {
    document.getElementById('modal-admin-auth').classList.add('hidden');
    adminAuthCallback = null;
}

async function confirmarAuthAdmin() {
    const pwd = document.getElementById('auth-admin-pwd').value;
    if (!pwd) return;

    const result = await window.posAPI.verifyAdminPassword(pwd);
    if (result.success && result.valid) {
        document.getElementById('modal-admin-auth').classList.add('hidden');
        if (adminAuthCallback) adminAuthCallback();
        adminAuthCallback = null;
    } else {
        alert("Contraseña incorrecta.");
        document.getElementById('auth-admin-pwd').select();
    }
}

async function showUsersModal() {
    document.getElementById('modal-usuarios').classList.remove('hidden');
    await renderUsersList();
}

async function renderUsersList() {
    const colaboradores = window.posAPI && window.posAPI.obtenerColaboradores
        ? await window.posAPI.obtenerColaboradores()
        : [];
    const users = [
        { nombre: globalAdminName, admin: true },
        ...colaboradores.filter(usuario => usuario.activo).map(usuario => ({ nombre: usuario.nombre, admin: false }))
    ];
    const container = document.getElementById('users-list-container');
    container.innerHTML = users.map(u => `
        <button onclick='selectUser(${JSON.stringify(u.nombre)}, ${u.admin})' class="w-full text-left bg-slate-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 text-slate-700 font-bold py-4 rounded-xl transition-all text-sm uppercase tracking-wider shadow-sm flex items-center justify-between px-6 mb-2">
            <span>${u.nombre} ${u.admin ? '<i class="fas fa-star text-amber-400 ml-2"></i>' : ''}</span> <i class="fas fa-chevron-right text-slate-300"></i>
        </button>
    `).join('');
}

function selectUser(user, isAdmin = false) {
    localStorage.setItem('currentUser', user);
    window.currentUserIsAdmin = isAdmin;
    document.getElementById('modal-usuarios').classList.add('hidden');
    updateUserUI(user, isAdmin);
}

function addNewUser() {
    alert('Los colaboradores se agregan desde Administración.');
}

function updateUserUI(user, isAdmin = false) {
    window.currentUserIsAdmin = isAdmin;
    const roleStr = isAdmin ? "Administrador" : "Cajero";
    document.getElementById('ui-current-username').innerText = user;
    document.getElementById('ui-current-role').innerText = roleStr;
}

// Exportar variables y funciones globales si es necesario para otros scripts inline
window.initUsers = initUsers;
window.guardarSetupInicial = guardarSetupInicial;
window.requestAdminPassword = requestAdminPassword;
window.cancelarAuthAdmin = cancelarAuthAdmin;
window.confirmarAuthAdmin = confirmarAuthAdmin;
window.showUsersModal = showUsersModal;
window.renderUsersList = renderUsersList;
window.selectUser = selectUser;
window.addNewUser = addNewUser;
window.updateUserUI = updateUserUI;
