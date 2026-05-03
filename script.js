// IMPORTAÇÃO DO FIREBASE (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDf8Gm0oEhN2XHNdajds8QcMQQvJE-yBGY",
  authDomain: "compras-babdf.firebaseapp.com",
  projectId: "compras-babdf",
  storageBucket: "compras-babdf.firebasestorage.app",
  messagingSenderId: "553863233795",
  appId: "1:553863233795:web:246c4339845caacfcd2936",
  measurementId: "G-GXCEG18C84"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const comprasCol = collection(db, "compras");

// ESTADO DA APLICAÇÃO
let currentUser = null;
let currentItems = [];
let isEditing = false;
let editId = null;
let unsubscribeSnapshot = null;

// ELEMENTOS DO DOM
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const mainNav = document.getElementById('mainNav');
const authNav = document.getElementById('authNav');

// Forms Auth
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTabs = document.querySelectorAll('.auth-tab');

// Navbar e UI
const btnLogout = document.getElementById('btnLogout');
const btnThemeToggles = document.querySelectorAll('.theme-toggle');
const toastContainer = document.getElementById('toastContainer');

// App Elements
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const filterMonth = document.getElementById('filterMonth');
const filterMonthDashboard = document.getElementById('filterMonthDashboard');
const filterCategory = document.getElementById('filterCategory');
const filterStatus = document.getElementById('filterStatus');
const btnCopyNextMonth = document.getElementById('btnCopyNextMonth');
const btnExportWhatsapp = document.getElementById('btnExportWhatsapp');

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupMonthFilters();
});

// ==========================================
// TEMA E UI
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);

    btnThemeToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcons(newTheme);
        });
    });
}

function updateThemeIcons(theme) {
    btnThemeToggles.forEach(btn => {
        btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================

// Tabs Auth
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.getAttribute('data-tab');
        if (target === 'login') {
            loginForm.style.display = 'flex';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'flex';
        }
    });
});

// Listener Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado
        currentUser = user;
        authSection.style.display = 'none';
        authNav.style.display = 'none';
        appSection.style.display = 'block';
        mainNav.style.display = 'flex';
        listenToData();
    } else {
        // Usuário deslogado
        currentUser = null;
        authSection.style.display = 'block';
        authNav.style.display = 'flex';
        appSection.style.display = 'none';
        mainNav.style.display = 'none';
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
        }
        currentItems = [];
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = loginForm.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login realizado com sucesso!');
        loginForm.reset();
    } catch (error) {
        console.error("Erro Login:", error);
        showToast('Erro ao fazer login. Verifique as credenciais.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Entrar';
    }
});

// Registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const btn = registerForm.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('Conta criada com sucesso!');
        registerForm.reset();
    } catch (error) {
        console.error("Erro Registro:", error);
        showToast('Erro ao criar conta. Tente uma senha mais forte.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Criar Conta';
    }
});

// Logout
btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showToast('Você saiu da conta.');
    } catch (error) {
        showToast('Erro ao sair da conta.', 'error');
    }
});

// ==========================================
// APP LOGIC (COMPRAS)
// ==========================================

function setupMonthFilters() {
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7);
    
    const months = [];
    for(let i = -3; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push(d.toISOString().slice(0, 7));
    }

    const options = months.map(m => `<option value="${m}" ${m === currentMonthStr ? 'selected' : ''}>${m}</option>`).join('');
    filterMonth.innerHTML = options;
    filterMonthDashboard.innerHTML = options;
    
    document.getElementById('mesReferencia').value = currentMonthStr;
}

function listenToData() {
    if (!currentUser) return;

    const q = query(
        comprasCol, 
        where("userId", "==", currentUser.uid),
        orderBy("dataCriacao", "desc")
    );

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        currentItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render();
    }, (error) => {
        console.error("Erro no onSnapshot:", error);
        // Ocultar erros de permissão iniciais se as regras ainda não estiverem propagadas
        if(error.code !== 'permission-denied') {
            showToast('Erro ao carregar dados.', 'error');
        }
    });
}

function render() {
    const month = filterMonth.value;
    const category = filterCategory.value;
    const status = filterStatus.value;

    const filtered = currentItems.filter(item => {
        const matchMonth = item.mesReferencia === month;
        const matchCat = category === 'all' || item.categoria === category;
        const matchStatus = status === 'all' || item.status === status;
        return matchMonth && matchCat && matchStatus;
    });

    renderTable(filtered);
    updateDashboard(currentItems.filter(item => item.mesReferencia === filterMonthDashboard.value));
}

function renderTable(items) {
    productsList.innerHTML = items.map(item => `
        <tr class="animate-fade-in">
            <td>
                <span class="status-badge ${item.status.toLowerCase()}">${item.status}</span>
            </td>
            <td>
                <strong>${item.nome}</strong>
                ${item.observacao ? `<br><small class="text-muted">${item.observacao}</small>` : ''}
            </td>
            <td>${item.categoria}</td>
            <td>${item.quantidade} ${item.unidade}</td>
            <td>R$ ${Number(item.valor).toFixed(2)}</td>
            <td><strong>R$ ${(item.quantidade * item.valor).toFixed(2)}</strong></td>
            <td>
                <div class="actions">
                    <button onclick="toggleStatus('${item.id}', '${item.status}')" class="btn-icon btn-check" title="Alternar Status">
                        <i class="fas ${item.status === 'Comprado' ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button onclick="editItem('${item.id}')" class="btn-icon btn-edit" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteItem('${item.id}')" class="btn-icon btn-delete" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (items.length === 0) {
        productsList.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">Nenhum item encontrado para este mês.</td></tr>';
    }
}

function updateDashboard(items) {
    const totalPrevisto = items.reduce((acc, item) => acc + (item.quantidade * item.valor), 0);
    const totalComprado = items.filter(i => i.status === 'Comprado').reduce((acc, item) => acc + (item.quantidade * item.valor), 0);
    const totalPendente = totalPrevisto - totalComprado;

    const catGasto = {};
    items.forEach(item => {
        catGasto[item.categoria] = (catGasto[item.categoria] || 0) + (item.quantidade * item.valor);
    });
    const maiorCat = Object.entries(catGasto).sort((a, b) => b[1] - a[1])[0];

    document.getElementById('totalPrevisto').innerText = `R$ ${totalPrevisto.toFixed(2)}`;
    document.getElementById('totalComprado').innerText = `R$ ${totalComprado.toFixed(2)}`;
    document.getElementById('totalPendente').innerText = `R$ ${totalPendente.toFixed(2)}`;
    document.getElementById('maiorGastoCategoria').innerText = maiorCat ? maiorCat[0] : '-';
}

// SALVAR / EDITAR ITEM
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const btn = document.getElementById('btnSave');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    const data = {
        nome: document.getElementById('nome').value,
        categoria: document.getElementById('categoria').value,
        quantidade: Number(document.getElementById('quantidade').value),
        unidade: document.getElementById('unidade').value,
        valor: Number(document.getElementById('valor').value),
        mesReferencia: document.getElementById('mesReferencia').value,
        status: document.getElementById('status').value,
        observacao: document.getElementById('observacao').value,
        dataCriacao: isEditing ? (currentItems.find(i => i.id === editId)?.dataCriacao || new Date().toISOString()) : new Date().toISOString(),
        userId: currentUser.uid // Vincular ao usuário atual
    };

    try {
        if (isEditing) {
            await updateDoc(doc(db, "compras", editId), data);
            showToast('Produto atualizado com sucesso!');
            resetForm();
        } else {
            await addDoc(comprasCol, data);
            showToast('Produto adicionado com sucesso!');
            productForm.reset();
            setupMonthFilters(); 
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        showToast('Erro ao salvar os dados.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// ALTERNAR STATUS
window.toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pendente' ? 'Comprado' : 'Pendente';
    try {
        await updateDoc(doc(db, "compras", id), { status: newStatus });
        showToast(`Marcado como ${newStatus}`);
    } catch(err) {
        showToast('Erro ao atualizar status', 'error');
    }
};

// EDITAR ITEM
window.editItem = (id) => {
    const item = currentItems.find(i => i.id === id);
    if (!item) return;

    document.getElementById('productId').value = item.id;
    document.getElementById('nome').value = item.nome;
    document.getElementById('categoria').value = item.categoria;
    document.getElementById('quantidade').value = item.quantidade;
    document.getElementById('unidade').value = item.unidade;
    document.getElementById('valor').value = item.valor;
    document.getElementById('mesReferencia').value = item.mesReferencia;
    document.getElementById('status').value = item.status;
    document.getElementById('observacao').value = item.observacao || '';

    isEditing = true;
    editId = id;
    document.getElementById('btnSave').innerHTML = '<i class="fas fa-save"></i> Atualizar Produto';
    document.getElementById('btnCancel').style.display = 'inline-flex';
    document.getElementById('cadastro').scrollIntoView({ behavior: 'smooth' });
};

// EXCLUIR ITEM
window.deleteItem = async (id) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
        try {
            await deleteDoc(doc(db, "compras", id));
            showToast('Item excluído com sucesso');
        } catch(err) {
            showToast('Erro ao excluir item', 'error');
        }
    }
};

// CANCELAR EDIÇÃO
document.getElementById('btnCancel').addEventListener('click', resetForm);

function resetForm() {
    productForm.reset();
    isEditing = false;
    editId = null;
    document.getElementById('btnSave').innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
    document.getElementById('btnCancel').style.display = 'none';
    setupMonthFilters();
}

// COPIAR PARA PRÓXIMO MÊS (Apenas Pendentes ou Todos)
btnCopyNextMonth.addEventListener('click', async () => {
    const currentMonth = filterMonth.value;
    const itemsToCopy = currentItems.filter(item => item.mesReferencia === currentMonth);

    if (itemsToCopy.length === 0) {
        showToast('Não há itens neste mês para copiar.', 'error');
        return;
    }

    const [year, month] = currentMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1); 
    const nextMonthStr = nextDate.toISOString().slice(0, 7);

    if (confirm(`Deseja copiar os ${itemsToCopy.length} itens deste mês para ${nextMonthStr}? (Eles entrarão como Pendentes)`)) {
        try {
            const btn = btnCopyNextMonth;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Copiando...';

            for (const item of itemsToCopy) {
                const { id, dataCriacao, ...rest } = item;
                await addDoc(comprasCol, {
                    ...rest,
                    mesReferencia: nextMonthStr,
                    status: 'Pendente',
                    dataCriacao: new Date().toISOString()
                });
            }
            showToast('Itens copiados com sucesso!');
            filterMonth.value = nextMonthStr;
            render();
            
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-copy"></i> Copiar pendentes para o próximo mês';
        } catch (error) {
            console.error("Erro ao copiar:", error);
            showToast('Erro ao copiar itens.', 'error');
            btnCopyNextMonth.disabled = false;
        }
    }
});

// ==========================================
// EXPORTAR PARA WHATSAPP
// ==========================================
btnExportWhatsapp.addEventListener('click', () => {
    const month = filterMonth.value;
    const items = currentItems.filter(item => item.mesReferencia === month);
    
    if(items.length === 0) {
        showToast('Não há itens para exportar neste mês.', 'error');
        return;
    }

    let message = `*🛒 Lista de Compras (${month})*\n\n`;
    
    const categorias = [...new Set(items.map(i => i.categoria))];
    
    let totalGeral = 0;

    categorias.forEach(cat => {
        message += `*_${cat}_*\n`;
        const itemsCat = items.filter(i => i.categoria === cat);
        
        itemsCat.forEach(item => {
            const check = item.status === 'Comprado' ? '✅' : '⏳';
            const valTotal = (item.quantidade * item.valor);
            totalGeral += valTotal;
            message += `${check} ${item.nome} - ${item.quantidade}${item.unidade} (R$ ${valTotal.toFixed(2)})\n`;
        });
        message += `\n`;
    });

    message += `*💰 Total Estimado: R$ ${totalGeral.toFixed(2)}*\n`;

    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
});


// EVENTOS DE FILTRO
filterMonth.addEventListener('change', render);
filterMonthDashboard.addEventListener('change', render);
filterCategory.addEventListener('change', render);
filterStatus.addEventListener('change', render);
