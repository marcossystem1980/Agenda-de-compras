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

// Estado da Aplicação unificado
const estado = {
    telaAtual: 'geral', // 'geral', 'selecao-comprador', 'painel-comprador'
    empresaAtual: 'Zanol & Thomaz',
    classificacaoFiltroAtual: '',
    compradorLogado: '',
    empresaCompradorAtual: 'Zanol & Thomaz',
    agendamentos: []
};

const classificacoes = [
    "CONVENIENCIA", "DERMOCOSMETICOS", "FRALDAS E LEITES", "GENERICOS", 
    "NOSSAS MARCAS", "PBM", "PERFUMARIA", "PERFUMES", "PROPAGADO", "SIMILARES", "SUPLEMENTO", "VAREJO"
];

function sanitizarId(nome) {
    return nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, '');
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
        renderizarTelasAtuais();
    });
});

function configurarEventosGerais() {
    // Sidebar toggles
    document.getElementById('btnToggleSidebar')?.addEventListener('click', toggleSidebar);
    document.getElementById('btnToggleSidebar2')?.addEventListener('click', toggleSidebar);
    document.getElementById('btnCloseSidebar')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);
    
    // Ação de Exportar na Tela Geral (Espelho)
    document.getElementById('btnExportarExcel')?.addEventListener('click', exportarExcel);

    // Botão do menu lateral para abrir a Área do Comprador
    document.getElementById('btnMenuAreaComprador')?.addEventListener('click', () => {
        estado.telaAtual = 'selecao-comprador';
        mudarTela('selecao-comprador');
    });

    // Clique nos cartões dos compradores
    document.querySelectorAll('.buyer-card').forEach(card => {
        card.addEventListener('click', () => {
            estado.compradorLogado = card.getAttribute('data-comprador');
            estado.telaAtual = 'painel-comprador';
            estado.empresaCompradorAtual = 'Zanol & Thomaz';
            
            document.querySelectorAll('.group-tab-btn').forEach((t, idx) => {
                if(idx === 0) t.classList.add('active');
                else t.classList.remove('active');
            });

            mudarTela('painel-comprador');
        });
    });

    // Botão Voltar da tela do comprador para a seleção de nomes
    document.getElementById('btnVoltarSelecao')?.addEventListener('click', () => {
        estado.telaAtual = 'selecao-comprador';
        mudarTela('selecao-comprador');
    });

    // Alternar entre abas de grupos dentro do painel do comprador
    document.querySelectorAll('.group-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.group-tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            estado.empresaCompradorAtual = tab.getAttribute('data-grupo');
            limparFormularioComprador();
            renderizarTabelaComprador();
        });
    });

    // Salvar registro na tela do comprador
    document.getElementById('btnSalvarAgendamentoComprador')?.addEventListener('click', salvarAgendamentoComprador);

    // Delegação de eventos para os grupos da sidebar (visão geral)
    document.querySelectorAll('.menu-btn').forEach(btn => {
        const parentGroup = btn.closest('.group-item');
        if (parentGroup) {
            btn.addEventListener('click', (e) => {
                const grupoNome = parentGroup.getAttribute('data-grupo');
                toggleGrupoAccordion(grupoNome);
            });
        }
    });

    // Delegação de eventos para a tabela do Comprador (Editar / Remover)
    document.getElementById('tabelaCorpoComprador')?.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        if (btnEdit) editarAgendamentoComprador(btnEdit.dataset.id);
        if (btnDelete) excluirAgendamentoComprador(btnDelete.dataset.id);
    });
}

function inicializarSelectsEListas() {
    // Select de Classificação do Painel do Comprador
    const selectClassComprador = document.getElementById('inputClassificacaoComprador');
    if (selectClassComprador) {
        selectClassComprador.innerHTML = '<option value="">Selecione...</option>';
        classificacoes.forEach(classe => {
            const opt = document.createElement('option');
            opt.value = classe;
            opt.innerHTML = classe;
            selectClassComprador.appendChild(opt);
        });
    }

    // Selects de Previsão de Faturamento
    const selectsPrev = [document.getElementById('inputPrevisaoComprador')];
    selectsPrev.forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '<option value="">Selecione...</option>';
        for(let i = 1; i <= 45; i++) {
            const opt = document.createElement('option');
            opt.value = i + " Dias";
            opt.innerHTML = i + " Dias";
            sel.appendChild(opt);
        }
    });

    // Monta o menu lateral em acordeão (Classificações)
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
                    estado.telaAtual = 'geral';
                    mudarTela('geral');
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
    if (!itemElement) return;
    
    const estaAberto = itemElement.classList.contains('open');

    if (estaAberto) {
        itemElement.classList.remove('open');
    } else {
        document.querySelectorAll('.group-item').forEach(el => el.classList.remove('open'));
        itemElement.classList.add('open');
        estado.telaAtual = 'geral';
        mudarTela('geral');
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
            btnGrupo?.classList.add('active-main');
            item.querySelectorAll('.subclass-btn').forEach(b => b.classList.remove('active'));
        } else {
            item.classList.remove('active-group');
            btnGrupo?.classList.remove('active-main');
        }
    });

    const titulo = document.getElementById('tituloAgenda');
    if (titulo) titulo.innerText = `Agenda: ${nomeEmpresa.toUpperCase()}`;
    
    renderizarTabelaGeral();
}

function selecionarSubcategoria(grupo, classificacao, btnElement) {
    estado.empresaAtual = grupo;
    estado.classificacaoFiltroAtual = classificacao;

    document.querySelectorAll('.group-item').forEach(item => {
        const grupoItem = item.getAttribute('data-grupo');
        const btnGrupo = item.querySelector('.menu-btn');

        if (grupoItem === grupo) {
            item.classList.add('active-group');
            btnGrupo?.classList.add('active-main');
            item.querySelectorAll('.subclass-btn').forEach(b => {
                if (b === btnElement) b.classList.add('active');
                else b.classList.remove('active');
            });
        } else {
            item.classList.remove('active-group');
            btnGrupo?.classList.remove('active-main');
            item.querySelectorAll('.subclass-btn').forEach(b => b.classList.remove('active'));
        }
    });

    const titulo = document.getElementById('tituloAgenda');
    if (titulo) titulo.innerText = `Agenda: ${grupo.toUpperCase()} — ${classificacao}`;
    
    renderizarTabelaGeral();
}

function mudarTela(nomeTela) {
    document.getElementById('telaGeral').style.display = (nomeTela === 'geral') ? 'block' : 'none';
    document.getElementById('telaSelecaoComprador').style.display = (nomeTela === 'selecao-comprador') ? 'block' : 'none';
    document.getElementById('telaPainelComprador').style.display = (nomeTela === 'painel-comprador') ? 'block' : 'none';

    if (nomeTela === 'geral') {
        renderizarTabelaGeral();
    } else if (nomeTela === 'painel-comprador') {
        const tituloPainel = document.getElementById('tituloPainelComprador');
        if (tituloPainel) tituloPainel.innerText = `Painel: ${estado.compradorLogado} — Grupo: ${estado.empresaCompradorAtual}`;
        limparFormularioComprador();
        renderizarTabelaComprador();
    }
}

function renderizarTelasAtuais() {
    if (estado.telaAtual === 'geral') {
        renderizarTabelaGeral();
    } else if (estado.telaAtual === 'painel-comprador') {
        renderizarTabelaComprador();
    }
}

function renderizarTabelaGenerica(containerId, dados, options = { showActions: false }) {
    const tbody = document.getElementById(containerId);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (dados.length === 0) {
        const tr = document.createElement('tr');
        // Total de colunas: 7 sem ações ou 8 com ações
        const colSpanCount = options.showActions ? 8 : 7;
        tr.innerHTML = `<td colspan="${colSpanCount}" style="text-align: center; color: var(--text-light);">Nenhum registro encontrado.</td>`;
        tbody.appendChild(tr);
        return;
    }

    dados.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatarData(item.data)}</td>
            <td><strong>${item.classificacao || 'GERAL'}</strong></td>
            <td>${item.categoria || ''}</td>
            <td>${item.fornecedor}</td>
            <td>${item.acaoComprador || ''}</td>
            <td>${item.previsao}</td>
            <td><span class="flag ${obterClasseStatus(item.status)}">${item.status}</span></td>
            ${options.showActions ? `
                <td>
                    <button class="btn-action btn-edit" data-id="${item.id}">Editar</button>
                    <button class="btn-action btn-delete" data-id="${item.id}">Remover</button>
                </td>
            ` : ''}
        `;
        tbody.appendChild(tr);
    });
}

function renderizarTabelaGeral() {
    const filtrados = estado.agendamentos.filter(item => {
        const matchEmpresa = item.empresa === estado.empresaAtual;
        const matchClassificacao = estado.classificacaoFiltroAtual ? item.classificacao === estado.classificacaoFiltroAtual : true;
        return matchEmpresa && matchClassificacao;
    });

    // Visão Geral como espelho puro (sem botões de Editar/Excluir)
    renderizarTabelaGenerica('tabelaCorpo', filtrados, { showActions: false });
}

function renderizarTabelaComprador() {
    const filtrados = estado.agendamentos.filter(item => 
        item.empresa === estado.empresaCompradorAtual && 
        item.comprador === estado.compradorLogado
    );

    // Painel do Comprador individual (apenas os registros do comprador logado)
    renderizarTabelaGenerica('tabelaCorpoComprador', filtrados, { showActions: true });
}

function obterClasseStatus(status) {
    if (status === 'EXECUTADO') return 'executado';
    if (status === 'EXECUTADO PARCIALMENTE') return 'parcial';
    return 'agendado';
}

function formatarData(dataIso) {
    if (!dataIso) return '';
    const partes = dataIso.split('-');
    if (partes.length !== 3) return dataIso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ================= OPERAÇÕES DO COMPRADOR (FIREBASE) =================

async function salvarAgendamentoComprador() {
    const data = document.getElementById('inputDataComprador').value;
    const classificacao = document.getElementById('inputClassificacaoComprador').value;
    const categoria = document.getElementById('inputCategoriaComprador').value.trim();
    const fornecedor = document.getElementById('inputFornecedorComprador').value.trim();
    const acaoComprador = document.getElementById('inputAcaoComprador').value;
    const previsao = document.getElementById('inputPrevisaoComprador').value;
    const status = document.getElementById('inputStatusComprador').value;
    const editId = document.getElementById('editIndexComprador').value;

    if (!data || !classificacao || !categoria || !fornecedor || !acaoComprador || !previsao || !status) {
        alert("Por favor, preencha todos os campos do agendamento.");
        return;
    }

    const dadosRegistro = {
        empresa: estado.empresaCompradorAtual,
        data,
        classificacao,
        categoria,
        fornecedor,
        acaoComprador,
        previsao,
        status,
        comprador: estado.compradorLogado,
        atualizadoEm: new Date().toISOString()
    };

    try {
        if (editId === "-1") {
            await addDoc(collection(db, "agendamentos"), dadosRegistro);
        } else {
            await updateDoc(doc(db, "agendamentos", editId), dadosRegistro);
        }
        limparFormularioComprador();
    } catch (error) {
        console.error("Erro ao salvar no Firestore:", error);
        alert("Erro ao salvar o registro.");
    }
}

function editarAgendamentoComprador(id) {
    const item = estado.agendamentos.find(a => a.id === id);
    if (!item) return;

    document.getElementById('editIndexComprador').value = item.id;
    document.getElementById('inputDataComprador').value = item.data;
    document.getElementById('inputClassificacaoComprador').value = item.classificacao || '';
    document.getElementById('inputCategoriaComprador').value = item.categoria || '';
    document.getElementById('inputFornecedorComprador').value = item.fornecedor;
    document.getElementById('inputAcaoComprador').value = item.acaoComprador || '';
    document.getElementById('inputPrevisaoComprador').value = item.previsao;
    document.getElementById('inputStatusComprador').value = item.status;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirAgendamentoComprador(id) {
    if (confirm("Deseja realmente remover este agendamento?")) {
        try {
            await deleteDoc(doc(db, "agendamentos", id));
        } catch (error) {
            console.error("Erro ao deletar documento:", error);
            alert("Erro ao excluir o registro.");
        }
    }
}

function limparFormularioComprador() {
    document.getElementById('editIndexComprador').value = "-1";
    document.getElementById('inputDataComprador').value = '';
    document.getElementById('inputClassificacaoComprador').value = '';
    document.getElementById('inputCategoriaComprador').value = '';
    document.getElementById('inputFornecedorComprador').value = '';
    document.getElementById('inputAcaoComprador').value = '';
    document.getElementById('inputPrevisaoComprador').value = '';
    document.getElementById('inputStatusComprador').value = 'AGENDADO';
}

function exportarExcel() {
    const filtrados = estado.agendamentos.filter(item => {
        const matchEmpresa = item.empresa === estado.empresaAtual;
        const matchClassificacao = estado.classificacaoFiltroAtual ? item.classificacao === estado.classificacaoFiltroAtual : true;
        return matchEmpresa && matchClassificacao;
    });

    if (filtrados.length === 0) {
        alert("Não há dados para exportar nesta visualização.");
        return;
    }

    let csv = "Data;Classificação;Categoria;Fornecedor;Ação do Comprador;Previsão Faturamento;Status\n";
    
    filtrados.forEach(item => {
        const data = formatarData(item.data) || '';
        const classificacao = (item.classificacao || 'GERAL').replace(/;/g, ',');
        const categoria = (item.categoria || '').replace(/;/g, ',');
        const fornecedor = (item.fornecedor || '').replace(/;/g, ',');
        const acaoComprador = (item.acaoComprador || '').replace(/;/g, ',');
        const previsao = (item.previsao || '').replace(/;/g, ',');
        const status = (item.status || '').replace(/;/g, ',');

        csv += `${data};${classificacao};${categoria};${fornecedor};${acaoComprador};${previsao};${status}\n`;
    });

    // Alterado para extensão .csv e MIME type correto
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Agenda_${estado.empresaAtual.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}