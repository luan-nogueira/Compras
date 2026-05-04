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
    setDoc,
    getDoc,
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
const categoriasCol = collection(db, "categorias");
const orcamentosCol = collection(db, "orcamentos");

// ESTADO DA APLICAÇÃO
let currentUser = null;
let currentItems = [];
let currentCategories = [];
let currentBudget = 0;
let isEditing = false;
let editId = null;
let unsubscribeSnapshot = null;
let unsubscribeCats = null;

// ID do dono da lista (Modo Família)
const urlParams = new URLSearchParams(window.location.search);
const viewUserId = urlParams.get('view');
let listOwnerId = null;

// ELEMENTOS DO DOM
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const mainNav = document.getElementById('mainNav');
const authNav = document.getElementById('authNav');
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('.section');

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('SW registrado com sucesso!', reg);
        }).catch(err => {
            console.log('Erro ao registrar SW:', err);
        });
    });
}

// Forms Auth
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTabs = document.querySelectorAll('.auth-tab');

// Navbar e UI
const btnLogout = document.getElementById('btnLogout');
const btnThemeToggles = document.querySelectorAll('.theme-toggle');
const toastContainer = document.getElementById('toastContainer');

// Modal Configurações
const settingsModal = document.getElementById('settingsModal');
const btnSettings = document.getElementById('btnSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const shareLinkInput = document.getElementById('shareLinkInput');
const btnCopyShareLink = document.getElementById('btnCopyShareLink');

// Modal Confirmação
const confirmModal = document.getElementById('confirmModal');
const btnCancelConfirm = document.getElementById('btnCancelConfirm');
const btnConfirmAction = document.getElementById('btnConfirmAction');
let itemToDelete = null;

// App Elements
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const filterMonth = document.getElementById('filterMonth');
const filterCategory = document.getElementById('filterCategory');
const filterStatus = document.getElementById('filterStatus');
const btnCopyNextMonth = document.getElementById('btnCopyNextMonth');
const btnExportWhatsapp = document.getElementById('btnExportWhatsapp');
const selectCategoriaForm = document.getElementById('categoria');
const inputBudget = document.getElementById('inputBudget');
const totalPrevistoEl = document.getElementById('totalPrevisto');
const totalCompradoEl = document.getElementById('totalComprado');
const balanceValueEl = document.getElementById('balanceValue');
const balanceLabelEl = document.getElementById('balanceLabel');
const balanceCardEl = document.getElementById('balanceCard');

// Categorias Padrões
const defaultCategories = ["Alimentação", "Higiene", "Limpeza", "Bebidas", "Hortifruti", "Outros"];

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupMonthFilters();
    initAuthOrVisitor();
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

// Navegação entre seções
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        navigateToSection(targetId);
    });
});

function navigateToSection(id) {
    // Atualiza links
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Atualiza seções
    sections.forEach(section => {
        if (section.id === id) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
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
// CONFIGURAÇÕES MODAL E COMPARTILHAMENTO
// ==========================================
if (btnSettings) {
    btnSettings.addEventListener('click', () => {
        if (!currentUser || !listOwnerId) return;
        const currentUrl = window.location.origin + window.location.pathname;
        shareLinkInput.value = `${currentUrl}?view=${listOwnerId}`;
        settingsModal.classList.add('active');
    });
}

if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
}

if (btnCopyShareLink) {
    btnCopyShareLink.addEventListener('click', () => {
        navigator.clipboard.writeText(shareLinkInput.value).then(() => {
            showToast('Link copiado para a área de transferência!');
        }).catch(err => {
            showToast('Erro ao copiar o link', 'error');
        });
    });
}

// ==========================================
// AUTENTICAÇÃO E VISITANTE (Modo Família)
// ==========================================
function initAuthOrVisitor() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            
            // Define de quem é a lista sendo acessada
            if (viewUserId) {
                listOwnerId = viewUserId;
                if (viewUserId !== user.uid) {
                    showToast('Modo Família: Acesso Compartilhado');
                }
            } else {
                listOwnerId = user.uid;
            }

            // Garante que toda a UI está visível (Acesso Total para o Grupo)
            document.querySelector('a[href="#cadastro"]').style.display = 'block';
            if(btnSettings) btnSettings.style.display = 'inline-flex';
            document.getElementById('cadastro').style.display = 'block';
            document.getElementById('btnCopyNextMonth').style.display = 'inline-flex';
            
            authSection.style.display = 'none';
            authNav.style.display = 'none';
            appSection.style.display = 'block';
            mainNav.style.display = 'flex';
            
            // Navega para a aba Lista por padrão
            navigateToSection('lista');
            
            listenToCategories();
            listenToData();
            loadBudget();
        } else {
            currentUser = null;
            listOwnerId = null;
            
            authSection.style.display = 'block';
            authNav.style.display = 'flex';
            appSection.style.display = 'none';
            mainNav.style.display = 'none';
            
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            if (unsubscribeCats) unsubscribeCats();
            currentItems = [];
            currentCategories = [];
        }
    });
}

// Tabs Auth & Login & Register logic
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

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
        showToast('Login realizado com sucesso!');
        loginForm.reset();
    } catch (error) {
        showToast('Erro ao fazer login.', 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = 'Entrar';
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = registerForm.querySelector('button');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
    try {
        await createUserWithEmailAndPassword(auth, document.getElementById('regEmail').value, document.getElementById('regPassword').value);
        showToast('Conta criada com sucesso!');
        registerForm.reset();
    } catch (error) {
        showToast('Erro ao criar conta.', 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = 'Criar Conta';
    }
});

if(btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try { await signOut(auth); showToast('Você saiu da conta.'); } 
        catch (error) { showToast('Erro ao sair da conta.', 'error'); }
    });
}

// ==========================================
// CATEGORIAS PERSONALIZADAS
// ==========================================
function listenToCategories() {
    if (!currentUser || !listOwnerId) return;
    const q = query(categoriasCol, where("userId", "==", listOwnerId));
    unsubscribeCats = onSnapshot(q, (snapshot) => {
        const customCats = snapshot.docs.map(doc => doc.data().nome);
        currentCategories = [...defaultCategories, ...customCats];
        renderCategorySelects();
    });
}

function renderCategorySelects() {
    const currentFilterVal = filterCategory.value;
    filterCategory.innerHTML = `<option value="all">Todas Categorias</option>` + 
        currentCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    filterCategory.value = currentCategories.includes(currentFilterVal) ? currentFilterVal : 'all';

    const currentFormVal = selectCategoriaForm.value;
    selectCategoriaForm.innerHTML = `<option value="">Selecione...</option>` + 
        currentCategories.map(c => `<option value="${c}">${c}</option>`).join('') +
        `<option value="nova" style="font-weight: bold; color: var(--primary-color);">+ Adicionar Nova...</option>`;
    selectCategoriaForm.value = currentCategories.includes(currentFormVal) ? currentFormVal : '';
}

selectCategoriaForm.addEventListener('change', async (e) => {
    if (e.target.value === 'nova') {
        const novaCat = prompt('Digite o nome da nova categoria:');
        if (novaCat && novaCat.trim().length > 0) {
            try {
                await addDoc(categoriasCol, {
                    nome: novaCat.trim(),
                    userId: listOwnerId
                });
                showToast('Categoria adicionada!');
                selectCategoriaForm.value = '';
            } catch (err) {
                showToast('Erro ao criar categoria', 'error');
            }
        } else {
            selectCategoriaForm.value = '';
        }
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
    document.getElementById('mesReferencia').value = currentMonthStr;
}

function listenToData() {
    if (!currentUser || !listOwnerId) return;
    const q = query(comprasCol, where("userId", "==", listOwnerId));
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        currentItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        currentItems.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
        render();
    }, (error) => {
        console.error("Erro no onSnapshot:", error);
        if(error.code !== 'permission-denied') showToast('Erro ao carregar dados.', 'error');
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
    updateFinanceDashboard(filtered);
}

async function loadBudget() {
    if (!currentUser || !listOwnerId) return;
    const month = filterMonth.value;
    const docId = `${listOwnerId}_${month}`;
    try {
        const docSnap = await getDoc(doc(db, "orcamentos", docId));
        if (docSnap.exists()) {
            currentBudget = docSnap.data().valor || 0;
            inputBudget.value = currentBudget.toFixed(2);
        } else {
            currentBudget = 0;
            inputBudget.value = '';
        }
        render(); // Re-render para atualizar o saldo
    } catch (err) {
        console.error("Erro ao carregar orçamento:", err);
    }
}

inputBudget.addEventListener('change', async () => {
    if (!currentUser || !listOwnerId) return;
    const month = filterMonth.value;
    const valor = parseFloat(inputBudget.value) || 0;
    const docId = `${listOwnerId}_${month}`;

    try {
        await setDoc(doc(db, "orcamentos", docId), {
            valor: valor,
            userId: listOwnerId,
            mes: month
        });
        currentBudget = valor;
        render();
        showToast('Orçamento atualizado!');
    } catch (err) {
        showToast('Erro ao salvar orçamento.', 'error');
    }
});

function updateFinanceDashboard(items) {
    const totalPrevisto = items.reduce((acc, item) => acc + ((item.valorUnitario || 0) * (item.quantidade || 0)), 0);
    const totalComprado = items.reduce((acc, item) => {
        if (item.status === 'Comprado') {
            return acc + ((item.valorUnitario || 0) * (item.quantidade || 0));
        }
        return acc;
    }, 0);

    const saldo = currentBudget - totalPrevisto;

    totalPrevistoEl.innerText = `R$ ${totalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    totalCompradoEl.innerText = `R$ ${totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    balanceValueEl.innerText = `R$ ${Math.abs(saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    if (saldo >= 0) {
        balanceLabelEl.innerText = 'Saldo Restante';
        balanceCardEl.className = 'finance-card positive';
    } else {
        balanceLabelEl.innerText = 'Falta Inteirar';
        balanceCardEl.className = 'finance-card negative';
    }
}

function renderTable(items) {
    productsList.innerHTML = items.map(item => {
        const itemTotal = (item.valorUnitario || 0) * (item.quantidade || 0);
        return `
        <tr class="animate-fade-in">
            <td data-label="Status"><span class="status-badge ${item.status.toLowerCase()}">${item.status}</span></td>
            <td data-label="Produto">
                <strong>${item.nome}</strong>
                ${item.observacao ? `<br><small class="text-muted">${item.observacao}</small>` : ''}
            </td>
            <td data-label="Categoria">${item.categoria}</td>
            <td data-label="Qtd/Un">${item.quantidade} ${item.unidade}</td>
            <td data-label="Total">R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td data-label="Ações">
                <div class="actions">
                    <button onclick="toggleStatus('${item.id}', '${item.status}')" class="btn-icon btn-check" title="Alternar Status">
                        <i class="fas ${item.status === 'Comprado' ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button onclick="editItem('${item.id}')" class="btn-icon btn-edit" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteItem('${item.id}')" class="btn-icon btn-delete" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');

    if (items.length === 0) {
        productsList.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">Nenhum item encontrado para este mês.</td></tr>';
    }
}

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !listOwnerId) return;
    
    const catForm = document.getElementById('categoria').value;
    if(catForm === 'nova' || !catForm) {
        showToast('Selecione uma categoria válida.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSave');
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    const data = {
        nome: document.getElementById('nome').value,
        categoria: catForm,
        quantidade: Number(document.getElementById('quantidade').value),
        unidade: document.getElementById('unidade').value,
        valorUnitario: Number(document.getElementById('valorUnitario').value) || 0,
        mesReferencia: document.getElementById('mesReferencia').value,
        status: document.getElementById('status').value,
        observacao: document.getElementById('observacao').value,
        dataCriacao: isEditing ? (currentItems.find(i => i.id === editId)?.dataCriacao || new Date().toISOString()) : new Date().toISOString(),
        userId: listOwnerId // SALVA NA LISTA DO DONO
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
        showToast('Erro ao salvar os dados. Atualize o Firebase.', 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = originalText;
    }
});

window.toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pendente' ? 'Comprado' : 'Pendente';
    try {
        await updateDoc(doc(db, "compras", id), { status: newStatus });
        showToast(`Marcado como ${newStatus}`);
    } catch(err) {
        showToast('Erro ao atualizar status.', 'error');
    }
};

window.editItem = (id) => {
    const item = currentItems.find(i => i.id === id);
    if (!item) return;

    document.getElementById('productId').value = item.id;
    document.getElementById('nome').value = item.nome;
    document.getElementById('categoria').value = item.categoria;
    document.getElementById('quantidade').value = item.quantidade;
    document.getElementById('unidade').value = item.unidade;
    document.getElementById('valorUnitario').value = item.valorUnitario || '';
    document.getElementById('mesReferencia').value = item.mesReferencia;
    document.getElementById('status').value = item.status;
    document.getElementById('observacao').value = item.observacao || '';

    isEditing = true; editId = id;
    document.getElementById('btnSave').innerHTML = '<i class="fas fa-save"></i> Atualizar Produto';
    document.getElementById('btnCancel').style.display = 'inline-flex';
    document.getElementById('cadastro').scrollIntoView({ behavior: 'smooth' });
};

window.deleteItem = (id) => {
    itemToDelete = id;
    confirmModal.classList.add('active');
};

if (btnCancelConfirm) {
    btnCancelConfirm.addEventListener('click', () => {
        itemToDelete = null;
        confirmModal.classList.remove('active');
    });
}

if (btnConfirmAction) {
    btnConfirmAction.addEventListener('click', async () => {
        if (!itemToDelete) return;
        const btn = btnConfirmAction;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
        
        try {
            await deleteDoc(doc(db, "compras", itemToDelete));
            showToast('Item excluído com sucesso');
        } catch(err) { 
            showToast('Erro ao excluir item. Atualize as regras do Firebase.', 'error'); 
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            confirmModal.classList.remove('active');
            itemToDelete = null;
        }
    });
}

document.getElementById('btnCancel').addEventListener('click', resetForm);

function resetForm() {
    productForm.reset();
    isEditing = false; editId = null;
    document.getElementById('btnSave').innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
    document.getElementById('btnCancel').style.display = 'none';
    setupMonthFilters();
}

if (btnCopyNextMonth) {
    btnCopyNextMonth.addEventListener('click', async () => {
        const currentMonth = filterMonth.value;
        const itemsToCopy = currentItems.filter(item => item.mesReferencia === currentMonth && item.status === 'Pendente');

        if (itemsToCopy.length === 0) {
            showToast('Não há itens pendentes para copiar.', 'error'); return;
        }
        const [year, month] = currentMonth.split('-').map(Number);
        const nextDate = new Date(year, month, 1); 
        const nextMonthStr = nextDate.toISOString().slice(0, 7);

        if (confirm(`Deseja transferir os ${itemsToCopy.length} itens pendentes para o mês de ${nextMonthStr}?`)) {
            try {
                btnCopyNextMonth.disabled = true; btnCopyNextMonth.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Copiando...';
                for (const item of itemsToCopy) {
                    const { id, dataCriacao, ...rest } = item;
                    await addDoc(comprasCol, { ...rest, mesReferencia: nextMonthStr, status: 'Pendente', dataCriacao: new Date().toISOString() });
                    await deleteDoc(doc(db, "compras", id));
                }
                showToast('Itens transferidos!');
                filterMonth.value = nextMonthStr;
                render();
            } catch (error) {
                showToast('Erro ao copiar itens.', 'error');
            } finally {
                btnCopyNextMonth.disabled = false; btnCopyNextMonth.innerHTML = '<i class="fas fa-copy"></i> Copiar pendentes para o próximo mês';
            }
        }
    });
}


if (btnExportWhatsapp) {
    btnExportWhatsapp.addEventListener('click', () => {
        const month = filterMonth.value;
        const items = currentItems.filter(item => item.mesReferencia === month);
        
        if(items.length === 0) { showToast('Não há itens para exportar neste mês.', 'error'); return; }

        let message = `*🛒 Lista de Compras (${month})*\n\n`;
        const categoriasAtuais = [...new Set(items.map(i => i.categoria))];
        let totalGeral = 0;
        
        categoriasAtuais.forEach(cat => {
            message += `*_${cat}_*\n`;
            const itemsCat = items.filter(i => i.categoria === cat);
            itemsCat.forEach(item => {
                const check = item.status === 'Comprado' ? '✅' : '⏳';
                const itemTotal = (item.valorUnitario || 0) * (item.quantidade || 0);
                totalGeral += itemTotal;
                
                message += `${check} ${item.nome} - ${item.quantidade}${item.unidade}`;
                if (item.valorUnitario > 0) {
                    message += ` (R$ ${item.valorUnitario.toFixed(2)} un. | Total: R$ ${itemTotal.toFixed(2)})`;
                }
                message += `\n`;
            });
            message += `\n`;
        });

        message += `*Total Previsto: R$ ${totalGeral.toFixed(2)}*`;
        if (currentBudget > 0) {
            message += `\n*Orçamento: R$ ${currentBudget.toFixed(2)}*`;
            const saldo = currentBudget - totalGeral;
            message += `\n*${saldo >= 0 ? 'Saldo' : 'Diferença'}: R$ ${Math.abs(saldo).toFixed(2)}*`;
        }

        const encodedMsg = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
    });
}

filterMonth.addEventListener('change', () => {
    loadBudget();
    render();
});
filterCategory.addEventListener('change', render);
filterStatus.addEventListener('change', render);
