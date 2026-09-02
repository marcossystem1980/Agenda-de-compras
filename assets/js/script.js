import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDIjE6Kcrf7Pi3NrUnEKyMEq0KAqNAg0xI",
    authDomain: "agenda-5d102.firebaseapp.com",
    projectId: "agenda-5d102",
    storageBucket: "agenda-5d102.firebasestorage.app",
    messagingSenderId: "927330632677",
    appId: "1:927330632677:web:11a1ea3bd27f9868b9a50c",
    measurementId: "G-00Y8Q58N2X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estado da Aplicação
const estado = {
    empresaAtual: 'Zanol & Thomaz',
    classificacaoFiltroAtual: '',
    agendamentos: []
};

const classificacoes = [
    "CONVENIENCIA", "DERMOCOSMETICOS", "FRALDAS E LEITES", "GENERICOS", 
    "NOSSAS MARCAS", "PBM", "PERFUMARIA", "PERFUMES", "PROPAGADO", "SIMILARES", "SUPLEMENTO", "VAREJO"
];

function sanitizarId(nome) {
    return nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos (Fênix vira Fenix)
        .replace(/[^a-zA-Z0-9]/g, '');   // Remove espaços e caracteres especiais
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarSelectsEListas();
    configurarEventosGerais();
    selecionarGrupo('Zanol & Thomaz');

    onSnapshot(collection(db, "agendamentos"), (snapshot) => {
        estado.agendamentos = [];
        snapshot.forEach((docSnap) => {
            estado.agendamentos.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderizarTabela();
    });
});

function configurarEventosGerais() {
    document.getElementById('btnToggleSidebar')?.addEventListener('click', toggleSidebar);
    document.getElementById('btnCloseSidebar')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);
    
    document.getElementById('btnSalvarAgendamento')?.addEventListener('click', salvarAgendamento);
    document.getElementById('btnExportarExcel')?.addEventListener('click', exportarExcel);

    // Delegação de eventos para os grupos da sidebar
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const grupoNome = e.currentTarget.closest('.group-item').getAttribute('data-grupo');
            toggleGrupoAccordion(grupoNome);
        });
    });

    // Delegação de eventos para a tabela (Editar / Remover)
    document.getElementById('tabelaCorpo').addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        
        if (btnEdit) editarAgendamento(btnEdit.dataset.id);
        if (btnDelete) excluirAgendamento(btnDelete.dataset.id);
    });
}

function inicializarSelectsEListas() {
    const selectClass = document.getElementById('inputClassificacao');
    selectClass.innerHTML = '<option value="">Selecione...</option>';
    classificacoes.forEach(classe => {
        const opt = document.createElement('option');
        opt.value = classe;
        opt.innerHTML = classe;
        selectClass.appendChild(opt);
    });

    const selectPrev = document.getElementById('inputPrevisao');
    selectPrev.innerHTML = '<option value="">Selecione...</option>';
    for(let i = 1; i <= 45; i++) {
        const opt = document.createElement('option');
        opt.value = i + " Dias";
        opt.innerHTML = i + " Dias";
        selectPrev.appendChild(opt);
    }

    const grupos = ['Zanol & Thomaz', 'Cella', 'Fênix'];
    grupos.forEach(grupo => {
        const idSanitizado = sanitizarId(grupo);
        const container = document.getElementById(`sub-list-${idSanitizado}`);
        
        if (container) {
            container.innerHTML = '';
            classificacoes.forEach(classe => {
                const btn = document.createElement('button');
                btn.className = 'subclass-btn';
                btn.innerHTML = classe;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selecionarSubcategoria(grupo, classe, btn);
                });
                container.appendChild(btn);
            });
        }
    });
}

function toggleSidebar() {
    const appContainer = document.getElementById('appContainer');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (window.innerWidth <= 992) {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('show');
    } else {
        appContainer.classList.toggle('sidebar-collapsed');
    }
}

function toggleGrupoAccordion(nomeGrupo) {
    const idSanitizado = sanitizarId(nomeGrupo);
    const itemElement = document.getElementById(`group-item-${idSanitizado}`);
    const estaAberto = itemElement.classList.contains('open');

    if (estaAberto) {
        itemElement.classList.remove('open');
    } else {
        document.querySelectorAll('.group-item').forEach(el => el.classList.remove('open'));
        itemElement.classList.add('open');
        selecionarGrupo(nomeGrupo);
    }
}

function selecionarGrupo(nomeEmpresa) {
    estado.empresaAtual = nomeEmpresa;
    estado.classificacaoFiltroAtual = ''; 

    document.querySelectorAll('.group-item').forEach(item => {
        const grupoItem = item.getAttribute('data-grupo');
        const btnGrupo = item.querySelector('.menu-btn');

        if (grupoItem === nomeEmpresa) {
            item.classList.add('active-group');
            btnGrupo.classList.add('active-main');
            item.querySelectorAll('.subclass-btn').forEach(b => b.classList.remove('active'));
        } else {
            item.classList.remove('active-group');
            btnGrupo.classList.remove('active-main');
        }
    });

    document.getElementById('tituloAgenda').innerText = `Agenda: ${nomeEmpresa.toUpperCase()}`;
    limparFormulario();
    renderizarTabela();
}

function selecionarSubcategoria(grupo, classificacao, btnElement) {
    estado.empresaAtual = grupo;
    estado.classificacaoFiltroAtual = classificacao;

    document.querySelectorAll('.group-item').forEach(item => {
        const grupoItem = item.getAttribute('data-grupo');
        const btnGrupo = item.querySelector('.menu-btn');
        if (grupoItem === grupo) {
            item.classList.add('open', 'active-group');
            btnGrupo.classList.add('active-main');
        } else {
            item.classList.remove('active-group');
            btnGrupo.classList.remove('active-main');
        }
    });

    document.querySelectorAll('.subclass-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (classificacao) {
        document.getElementById('tituloAgenda').innerText = `Agenda: ${grupo.toUpperCase()} — ${classificacao}`;
        document.getElementById('inputClassificacao').value = classificacao;
    } else {
        document.getElementById('tituloAgenda').innerText = `Agenda: ${grupo.toUpperCase()}`;
    }

    renderizarTabela();
}

async function salvarAgendamento() {
    const idDoc = document.getElementById('editIndex').value;
    const data = document.getElementById('inputData').value;
    const classificacao = document.getElementById('inputClassificacao').value;
    const fornecedor = document.getElementById('inputFornecedor').value.toUpperCase();
    const previsao = document.getElementById('inputPrevisao').value;
    const status = document.getElementById('inputStatus').value;
    const btnSalvar = document.getElementById('btnSalvarAgendamento');

    if(!data || !classificacao || !fornecedor || !previsao) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    // Feedback visual (Loading)
    btnSalvar.disabled = true;
    btnSalvar.innerText = 'Salvando...';

    const dataParts = data.split('-');
    const dataFormatada = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;

    const novoAgendamento = { 
        empresa: estado.empresaAtual, 
        dataOrig: data, 
        data: dataFormatada, 
        classificacao, 
        fornecedor, 
        previsao, 
        status 
    };

    try {
        if (idDoc === "-1") {
            await addDoc(collection(db, "agendamentos"), novoAgendamento);
        } else {
            const docRef = doc(db, "agendamentos", idDoc);
            await updateDoc(docRef, novoAgendamento);
        }
        limparFormulario();
    } catch (error) {
        console.error("Erro ao salvar no Firestore: ", error);
        alert("Erro ao salvar registro. Verifique a conexão.");
    } finally {
        // Restaura o botão
        btnSalvar.disabled = false;
        btnSalvar.innerText = 'Salvar Registro';
    }
}

async function excluirAgendamento(idDoc) {
    if(confirm("Tem certeza que deseja remover este agendamento?")) {
        try {
            await deleteDoc(doc(db, "agendamentos", idDoc));
        } catch (error) {
            console.error("Erro ao excluir: ", error);
            alert("Erro ao remover o item.");
        }
    }
}

function editarAgendamento(idDoc) {
    const item = estado.agendamentos.find(i => i.id === idDoc);
    if(item) {
        document.getElementById('inputData').value = item.dataOrig;
        document.getElementById('inputClassificacao').value = item.classificacao;
        document.getElementById('inputFornecedor').value = item.fornecedor;
        document.getElementById('inputPrevisao').value = item.previsao;
        document.getElementById('inputStatus').value = item.status;
        document.getElementById('editIndex').value = idDoc; 
        
        document.getElementById('formAgenda').scrollIntoView({ behavior: 'smooth' });
    }
}

function renderizarTabela() {
    const corpo = document.getElementById('tabelaCorpo');
    corpo.innerHTML = ''; 

    estado.agendamentos.forEach((item) => {
        const correspondeEmpresa = item.empresa === estado.empresaAtual;
        const correspondeSub = !estado.classificacaoFiltroAtual || item.classificacao === estado.classificacaoFiltroAtual;

        if(correspondeEmpresa && correspondeSub) {
            let classeFlag = '';
            if(item.status === 'AGENDADO') classeFlag = 'agendado';
            if(item.status === 'EXECUTADO') classeFlag = 'executado';
            if(item.status === 'EXECUTADO PARCIALMENTE') classeFlag = 'parcial';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.data}</td>
                <td><strong>${item.classificacao}</strong></td>
                <td>${item.fornecedor}</td>
                <td>${item.previsao}</td>
                <td>${item.status}</td>
                <td><span class="flag ${classeFlag}">${item.status}</span></td>
                <td>
                    <button class="btn-action btn-edit" data-id="${item.id}">Editar</button>
                    <button class="btn-action btn-delete" data-id="${item.id}">Remover</button>
                </td>
            `;
            corpo.appendChild(tr);
        }
    });
}

function limparFormulario() {
    document.getElementById('inputData').value = '';
    if (!estado.classificacaoFiltroAtual) {
        document.getElementById('inputClassificacao').value = '';
    }
    document.getElementById('inputFornecedor').value = '';
    document.getElementById('inputPrevisao').value = '';
    document.getElementById('inputStatus').value = 'AGENDADO';
    document.getElementById('editIndex').value = '-1';
}

function exportarExcel() {
    const dadosFiltrados = estado.agendamentos.filter(item => {
        const correspondeEmpresa = item.empresa === estado.empresaAtual;
        const correspondeSub = !estado.classificacaoFiltroAtual || item.classificacao === estado.classificacaoFiltroAtual;
        return correspondeEmpresa && correspondeSub;
    });

    if (dadosFiltrados.length === 0) {
        alert("Não há dados disponíveis para exportar nesta visualização.");
        return;
    }

    let csv = [];
    csv.push(["Data", "Classificacao", "Fornecedor", "Previsao Faturamento", "Status"].join(";"));

    dadosFiltrados.forEach(item => {
        let linha = [
            `"${item.data}"`,
            `"${item.classificacao}"`,
            `"${item.fornecedor}"`,
            `"${item.previsao}"`,
            `"${item.status}"`
        ];
        csv.push(linha.join(";"));
    });

    let arquivoCsv = new Blob(["\ufeff" + csv.join("\n")], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(arquivoCsv);
    const sufixoSub = estado.classificacaoFiltroAtual ? `_${estado.classificacaoFiltroAtual}` : '_Geral';
    link.download = `Agenda_${estado.empresaAtual.replace(/[^a-zA-Z0-9]/g, "_")}${sufixoSub}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}