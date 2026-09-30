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

    globalAdminName = config.admin_name || 'ADMIN';

    // Verificar si hay un turno abierto
    const estado = await window.posAPI.checkTurnoAbierto();
    if (estado.abierto && estado.turno && estado.turno.Nombre_Cajero !== 'CAJERO') {
        const cajeroActivo = estado.turno.Nombre_Cajero;
        let isAdmin = (cajeroActivo === globalAdminName);
        if (!isAdmin && window.posAPI.obtenerColaboradores) {
            const colaboradores = await window.posAPI.obtenerColaboradores();
            const colab = colaboradores.find(c => c.nombre === cajeroActivo);
            if (colab && colab.rol === 'ADMINISTRADOR') isAdmin = true;
        }
        
        localStorage.setItem('currentUser', cajeroActivo);
        window.currentUserIsAdmin = isAdmin;
        updateUserUI(cajeroActivo, isAdmin);
        
        // Bloquear pantalla inmediatamente (pausa) - COMENTADO PARA DEMO
        // pausarSesion();
        return;
    }

    showUsersModal();
}

async function guardarSetupInicial() {
    const name = document.getElementById('setup-admin-name').value.trim().toUpperCase();
    const pwd = document.getElementById('setup-admin-pwd').value;

    if (!name || !pwd) {
        alert("Por favor completa el nombre de administrador y la contraseña.");
        return;
    }

    const result = await window.posAPI.hashPassword(pwd, null);
    if (result.success) {
        await window.posAPI.saveConfig('admin_name', name);
        await window.posAPI.saveConfig('admin_pwd_hash', result.hash);
        await window.posAPI.saveConfig('admin_pwd_salt', result.salt);
        await window.posAPI.saveConfig('pos_mode', 'colaboradores');
        await window.posAPI.saveConfig('auth_setup_completado', '1');

        // Inicializar lista de usuarios con el admin
        localStorage.setItem('usersList', JSON.stringify([name]));

        document.getElementById('modal-setup-inicial').classList.add('hidden');
        initUsers();
    } else {
        alert("Error al guardar la seguridad: " + result.error);
    }
}

let adminAuthCancelCallback = null;
function requestAdminPassword(callback, onCancel) {
    if (window.currentUserIsAdmin) {
        if (callback) callback();
        return;
    }
    
    adminAuthCallback = callback;
    adminAuthCancelCallback = onCancel || null;
    currentAuthUser = null;
    document.getElementById('auth-admin-pwd').value = '';
    
    document.querySelector('#modal-admin-auth h3').innerText = 'Acceso Restringido';
    document.querySelector('#modal-admin-auth p').innerText = 'Ingresa contraseña de administrador';

    document.getElementById('modal-admin-auth').classList.remove('hidden');
    setTimeout(() => document.getElementById('auth-admin-pwd').focus(), 100);
}

let currentAuthUser = null;
function requestUserPassword(user, callback) {
    adminAuthCallback = callback;
    currentAuthUser = user;
    document.getElementById('auth-admin-pwd').value = '';
    
    document.querySelector('#modal-admin-auth h3').innerText = `Autenticación`;
    document.querySelector('#modal-admin-auth p').innerText = `Ingresa contraseña de ${user}`;

    document.getElementById('modal-admin-auth').classList.remove('hidden');
    setTimeout(() => document.getElementById('auth-admin-pwd').focus(), 100);
}

function cancelarAuthAdmin() {
    document.getElementById('modal-admin-auth').classList.add('hidden');
    adminAuthCallback = null;
    currentAuthUser = null;
    const onCancel = adminAuthCancelCallback;
    adminAuthCancelCallback = null;
    if (typeof onCancel === 'function') onCancel();
}

async function confirmarAuthAdmin() {
    const pwd = document.getElementById('auth-admin-pwd').value;
    if (!pwd) return;

    let result;
    if (currentAuthUser) {
        result = await window.posAPI.verifyUserPassword(currentAuthUser, pwd);
    } else {
        result = await window.posAPI.verifyAdminPassword(pwd);
    }

    if (result.success && result.valid) {
        document.getElementById('modal-admin-auth').classList.add('hidden');
        if (adminAuthCallback) adminAuthCallback(true);
        adminAuthCallback = null;
        currentAuthUser = null;
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
        ...colaboradores.filter(usuario => usuario.activo).map(usuario => ({ nombre: usuario.nombre, admin: (usuario.rol === 'ADMINISTRADOR') }))
    ];
    const container = document.getElementById('users-list-container');
    container.innerHTML = users.map(u => `
        <button onclick='selectUser(${JSON.stringify(u.nombre)}, ${u.admin})' class="w-full text-left bg-slate-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 text-slate-700 font-bold py-4 rounded-xl transition-all text-sm uppercase tracking-wider shadow-sm flex items-center justify-between px-6 mb-2">
            <span>${u.nombre} ${u.admin ? '<i class="fas fa-star text-amber-400 ml-2"></i>' : ''}</span> <i class="fas fa-chevron-right text-slate-300"></i>
        </button>
    `).join('');
}

function selectUser(user, isAdmin = false, bypassPassword = false) {
    if (!bypassPassword) {
        requestUserPassword(user, (isValid) => {
            if (isValid) {
                localStorage.setItem('currentUser', user);
                window.currentUserIsAdmin = isAdmin;
                document.getElementById('modal-usuarios').classList.add('hidden');
                updateUserUI(user, isAdmin);
            }
        });
    } else {
        localStorage.setItem('currentUser', user);
        window.currentUserIsAdmin = isAdmin;
        document.getElementById('modal-usuarios').classList.add('hidden');
        updateUserUI(user, isAdmin);
    }
}

function addNewUser() {
    alert('Los colaboradores se agregan desde Administración.');
}

function updateUserUI(user, isAdmin = false) {
    window.currentUserIsAdmin = isAdmin;
    const roleStr = isAdmin ? "Administrador" : "Cajero";
    document.getElementById('ui-current-username').innerText = user;
    document.getElementById('ui-current-role').innerText = roleStr;
    if (window.posAPI && window.posAPI.setCajero) {
        window.posAPI.setCajero(user);
    }
}

function pausarSesion() {
    const user = localStorage.getItem('currentUser');
    if (!user) return;
    document.getElementById('lock-screen-user').innerText = user;
    document.getElementById('lock-screen-pwd').value = '';
    document.getElementById('modal-lock-screen').classList.remove('hidden');
    setTimeout(() => document.getElementById('lock-screen-pwd').focus(), 100);
}

async function desbloquearSesion() {
    const user = localStorage.getItem('currentUser');
    const pwd = document.getElementById('lock-screen-pwd').value;
    
    const res = await window.posAPI.verifyUserPassword(user, pwd);
    
    if (res.success && res.valid) {
        document.getElementById('modal-lock-screen').classList.add('hidden');
        document.getElementById('lock-screen-pwd').value = '';
    } else if (res.success && res.valid === false && res.error === 'Contraseña no configurada') {
        if (pwd === '') {
            document.getElementById('modal-lock-screen').classList.add('hidden');
        } else {
            alert('Este usuario no tiene contraseña configurada. Deja el campo en blanco y presiona Reanudar.');
        }
    } else {
        alert('Contraseña incorrecta');
        document.getElementById('lock-screen-pwd').value = '';
        document.getElementById('lock-screen-pwd').focus();
    }
}

// Exportar variables y funciones globales si es necesario para otros scripts inline
window.initUsers = initUsers;
window.guardarSetupInicial = guardarSetupInicial;
window.requestAdminPassword = requestAdminPassword;
window.requestUserPassword = requestUserPassword;
window.cancelarAuthAdmin = cancelarAuthAdmin;
window.confirmarAuthAdmin = confirmarAuthAdmin;
window.showUsersModal = showUsersModal;
window.renderUsersList = renderUsersList;
window.selectUser = selectUser;
window.addNewUser = addNewUser;
window.updateUserUI = updateUserUI;
window.pausarSesion = pausarSesion;
window.desbloquearSesion = desbloquearSesion;
