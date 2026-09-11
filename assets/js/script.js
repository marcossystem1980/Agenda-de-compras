import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// Domínio fictício usado só para transformar "Lucas" em um login válido do
// Firebase Auth (lucas@agenda-compras.local). Nenhum e-mail é enviado a ele.
const DOMINIO_AUTH = "agenda-compras.local";

const estado = {
    telaAtual: 'geral',
    empresaAtual: 'Zanol & Thomaz',
    classificacaoFiltroAtual: '', 
    compradorLogado: '',
    compradorPendente: '',
    empresaCompradorAtual: 'Zanol & Thomaz',
    agendamentos: [],
    agendasGerais: {},
    agendasCompradores: {}
};

const classificacoes = [
    "CONVENIENCIA", "DERMOCOSMETICOS", "FRALDAS E LEITES", "GENERICOS", 
    "NOSSAS MARCAS", "PBM", "PERFUMARIA", "PERFUMES", "PROPAGADO", "SIMILARES", "SUPLEMENTO", "VAREJO"
];

// Cada tela tem seu próprio calendário, criado e renderizado só na primeira
// vez que a pessoa muda pra visão de calendário nela (FullCalendar não mede
// bem o tamanho de um container que nasce com display: none).
let calendarioGeralInstancia = null;
let calendarioCompradorInstancia = null;

function sanitizarId(nome) {
    return nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, '');
}

// Transforma "Letícia" em "leticia@agenda-compras.local" reaproveitando a
// mesma lógica de remoção de acentos que sanitizarId() já usa nos ids do menu.
function emailComprador(nome) {
    return `${sanitizarId(nome).toLowerCase()}@${DOMINIO_AUTH}`;
}

// Escapa texto livre (categoria, fornecedor etc.) antes de ir para innerHTML,
// pra fechar a brecha de XSS armazenado em campos digitados pelo comprador.
function escapeHtml(valor) {
    const div = document.createElement('div');
    div.textContent = valor === null || valor === undefined ? '' : String(valor);
    return div.innerHTML;
}

function obterEstadoAgendaAtual() {
    const chaveAgenda = `${estado.empresaAtual}__${estado.classificacaoFiltroAtual || 'GERAL'}`;
    if (!estado.agendasGerais[chaveAgenda]) {
        estado.agendasGerais[chaveAgenda] = {
            statusFiltro: '',
            ordenacao: { coluna: 'data', asc: true },
            visualizacao: 'tabela'
        };
    }
    return estado.agendasGerais[chaveAgenda];
}

function obterEstadoCompradorAtual() {
    const chaveComprador = `${estado.compradorLogado}__${estado.empresaCompradorAtual}`;
    if (!estado.agendasCompradores[chaveComprador]) {
        estado.agendasCompradores[chaveComprador] = {
            statusFiltro: '',
            ordenacao: { coluna: 'data', asc: true },
            visualizacao: 'tabela'
        };
    }
    return estado.agendasCompradores[chaveComprador];
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarSelectsEListas();
    configurarEventosGerais();
    configurarOrdenacaoCabecalhos();
    configurarFiltroStatus();
    configurarAuth();
    configurarModalDetalheEvento();
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
    document.getElementById('btnToggleSidebar')?.addEventListener('click', toggleSidebar);
    document.getElementById('btnToggleSidebar2')?.addEventListener('click', toggleSidebar);
    document.getElementById('btnCloseSidebar')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);
    
    // Botões de Exportação Excel (Geral e Painel do Comprador)
    document.getElementById('btnExportarExcel')?.addEventListener('click', exportarExcel);
    document.getElementById('btnExportarComprador')?.addEventListener('click', exportarExcel);

    // Botão Limpar Filtros Geral (Integrado de forma estática e otimizada)
    document.getElementById('btnLimparFiltrosGeral')?.addEventListener('click', () => {
        const agendaAtual = obterEstadoAgendaAtual();
        agendaAtual.statusFiltro = '';
        agendaAtual.ordenacao = { coluna: 'data', asc: true };
        sincronizarSetasOrdenacaoVisuais();
        renderizarTelasAtuais();
    });

    // Botão Limpar Filtros Comprador
    document.getElementById('btnLimparFiltrosComprador')?.addEventListener('click', () => {
        const compradorAtual = obterEstadoCompradorAtual();
        compradorAtual.statusFiltro = '';
        compradorAtual.ordenacao = { coluna: 'data', asc: true };
        sincronizarSetasOrdenacaoVisuais();
        renderizarTelasAtuais();
    });

    document.getElementById('btnMenuAreaComprador')?.addEventListener('click', async () => {
        if (auth.currentUser) await signOut(auth);
        estado.telaAtual = 'selecao-comprador';
        mudarTela('selecao-comprador');
    });

    // Clicar no cartão não entra mais direto — abre o modal de senha.
    // Quem confirma a navegação pro painel é confirmarLogin(), só depois
    // que o Firebase Auth validar a senha desse comprador.
    document.querySelectorAll('.buyer-card').forEach(card => {
        card.addEventListener('click', () => {
            abrirModalLogin(card.getAttribute('data-comprador'));
        });
    });

    document.getElementById('btnVoltarSelecao')?.addEventListener('click', async () => {
        if (auth.currentUser) await signOut(auth);
        estado.telaAtual = 'selecao-comprador';
        mudarTela('selecao-comprador');
    });

    document.querySelectorAll('.group-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.group-tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            estado.empresaCompradorAtual = tab.getAttribute('data-grupo');
            
            limparFormularioComprador();
            sincronizarSetasOrdenacaoVisuais();
            renderizarTabelaComprador();
        });
    });

    document.getElementById('btnSalvarAgendamentoComprador')?.addEventListener('click', salvarAgendamentoComprador);

    document.getElementById('btnVisTabelaGeral')?.addEventListener('click', () => alternarVisualizacao('geral', 'tabela'));
    document.getElementById('btnVisCalendarioGeral')?.addEventListener('click', () => alternarVisualizacao('geral', 'calendario'));
    document.getElementById('btnVisTabelaComprador')?.addEventListener('click', () => alternarVisualizacao('painel-comprador', 'tabela'));
    document.getElementById('btnVisCalendarioComprador')?.addEventListener('click', () => alternarVisualizacao('painel-comprador', 'calendario'));

    document.getElementById('inputRecorrenteComprador')?.addEventListener('change', (e) => {
        const select = document.getElementById('inputHorizonteRecorrenciaComprador');
        if (select) select.disabled = !e.target.checked;
    });

    document.querySelectorAll('.menu-btn').forEach(btn => {
        const parentGroup = btn.closest('.group-item');
        if (parentGroup) {
            btn.addEventListener('click', () => {
                const grupoNome = parentGroup.getAttribute('data-grupo');
                toggleGrupoAccordion(grupoNome);
            });
        }
    });

    document.getElementById('tabelaCorpoComprador')?.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        if (btnEdit) editarAgendamentoComprador(btnEdit.dataset.id);
        if (btnDelete) excluirAgendamentoComprador(btnDelete.dataset.id);
    });
}

function configurarAuth() {
    // Se a sessão cair (senha expirada, sign-out em outra aba, etc.) enquanto
    // a pessoa está no painel, ela volta pra seleção em vez de ficar numa
    // tela que não tem mais permissão de gravar nada.
    onAuthStateChanged(auth, (user) => {
        if (!user && estado.telaAtual === 'painel-comprador') {
            estado.compradorLogado = '';
            estado.telaAtual = 'selecao-comprador';
            mudarTela('selecao-comprador');
        }
    });

    document.getElementById('btnCancelarLogin')?.addEventListener('click', fecharModalLogin);
    document.getElementById('btnConfirmarLogin')?.addEventListener('click', confirmarLogin);

    document.getElementById('inputSenhaComprador')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmarLogin();
    });

    // Clicar fora do cartão do modal fecha, igual ao overlay da sidebar.
    document.getElementById('loginOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'loginOverlay') fecharModalLogin();
    });
}

function abrirModalLogin(nome) {
    estado.compradorPendente = nome;

    const titulo = document.getElementById('loginModalTitulo');
    if (titulo) titulo.innerText = `Entrar como ${nome}`;

    const inputSenha = document.getElementById('inputSenhaComprador');
    if (inputSenha) inputSenha.value = '';

    esconderErroLogin();
    document.getElementById('loginOverlay')?.classList.add('show');
    inputSenha?.focus();
}

function fecharModalLogin() {
    document.getElementById('loginOverlay')?.classList.remove('show');
    estado.compradorPendente = '';
}

function mostrarErroLogin(mensagem) {
    const erroEl = document.getElementById('loginModalErro');
    if (!erroEl) return;
    erroEl.textContent = mensagem;
    erroEl.style.display = 'block';
}

function esconderErroLogin() {
    const erroEl = document.getElementById('loginModalErro');
    if (erroEl) erroEl.style.display = 'none';
}

async function confirmarLogin() {
    const nome = estado.compradorPendente;
    const senha = document.getElementById('inputSenhaComprador')?.value || '';

    if (!nome) return;
    if (!senha) {
        mostrarErroLogin('Digite sua senha.');
        return;
    }

    const btnConfirmar = document.getElementById('btnConfirmarLogin');
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Entrando...';
    }

    try {
        await signInWithEmailAndPassword(auth, emailComprador(nome), senha);

        estado.compradorLogado = nome;
        estado.telaAtual = 'painel-comprador';
        estado.empresaCompradorAtual = 'Zanol & Thomaz';

        document.querySelectorAll('.group-tab-btn').forEach((t, idx) => {
            t.classList.toggle('active', idx === 0);
        });

        fecharModalLogin();
        mudarTela('painel-comprador');
    } catch (erro) {
        console.error('Erro ao entrar:', erro);
        mostrarErroLogin('Senha incorreta. Confira com quem cadastrou seu acesso.');
    } finally {
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = 'Entrar';
        }
    }
}

// Monta o conteúdo do modal com createElement/textContent (não innerHTML)
// porque esses dados vêm do Firestore — mesmo cuidado contra XSS da tabela.
function abrirModalDetalheEvento(item, permiteEdicao) {
    const overlay = document.getElementById('detalheEventoOverlay');
    const badge = document.getElementById('detalheStatusBadge');
    const titulo = document.getElementById('detalheTitulo');
    const lista = document.getElementById('detalheLista');
    const acoes = document.getElementById('detalheAcoes');
    if (!overlay || !badge || !titulo || !lista || !acoes) return;

    badge.textContent = item.status || '';
    badge.className = `detalhe-modal-status ${obterClasseStatus(item.status)}`;
    titulo.textContent = item.fornecedor || item.categoria || 'Agendamento';

    lista.innerHTML = '';
    const campos = [
        ['Categoria', item.categoria],
        ['Classificação', item.classificacao || 'GERAL'],
        ['Ação do comprador', item.acaoComprador],
        ['Previsão de faturamento', item.previsao],
        ['Data', formatarData(item.data)]
    ];
    if (item.recorrente) campos.push(['Repetição', '🔁 Parte de uma série mensal']);

    campos.forEach(([rotulo, valor]) => {
        const dt = document.createElement('dt');
        dt.textContent = rotulo;
        const dd = document.createElement('dd');
        dd.textContent = valor || '—';
        lista.appendChild(dt);
        lista.appendChild(dd);
    });

    acoes.style.display = permiteEdicao ? 'flex' : 'none';
    overlay.dataset.eventoId = item.id;
    overlay.classList.add('show');
}

function fecharModalDetalheEvento() {
    document.getElementById('detalheEventoOverlay')?.classList.remove('show');
}

function configurarModalDetalheEvento() {
    document.getElementById('btnFecharDetalhe')?.addEventListener('click', fecharModalDetalheEvento);

    document.getElementById('detalheEventoOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'detalheEventoOverlay') fecharModalDetalheEvento();
    });

    document.getElementById('btnEditarDoDetalhe')?.addEventListener('click', () => {
        const id = document.getElementById('detalheEventoOverlay')?.dataset.eventoId;
        fecharModalDetalheEvento();
        if (id) editarAgendamentoComprador(id);
    });

    document.getElementById('btnExcluirDoDetalhe')?.addEventListener('click', () => {
        const id = document.getElementById('detalheEventoOverlay')?.dataset.eventoId;
        fecharModalDetalheEvento();
        if (id) excluirAgendamentoComprador(id);
    });
}

function configurarFiltroStatus() {
    document.querySelectorAll('th.status-header').forEach(th => {
        if (!th.style.position) {
            th.style.position = 'relative';
        }

        th.addEventListener('click', (e) => {
            e.stopPropagation();
            
            let dropdown = th.querySelector('.status-filter-dropdown');
            if (dropdown) {
                dropdown.remove();
                return;
            }

            document.querySelectorAll('.status-filter-dropdown').forEach(el => el.remove());

            dropdown = document.createElement('div');
            dropdown.className = 'status-filter-dropdown';
            dropdown.innerHTML = `
                <div class="status-option" data-status="">Todos os Status</div>
                <div class="status-option" data-status="AGENDADO">AGENDADO</div>
                <div class="status-option" data-status="EXECUTADO">EXECUTADO</div>
                <div class="status-option" data-status="EXECUTADO PARCIALMENTE">EXECUTADO PARCIALMENTE</div>
            `;

            dropdown.querySelectorAll('.status-option').forEach(opt => {
                opt.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const statusSelecionado = opt.getAttribute('data-status');
                    
                    if (estado.telaAtual === 'geral') {
                        const agendaAtual = obterEstadoAgendaAtual();
                        agendaAtual.statusFiltro = statusSelecionado;
                    } else if (estado.telaAtual === 'painel-comprador') {
                        const compradorAtual = obterEstadoCompradorAtual();
                        compradorAtual.statusFiltro = statusSelecionado;
                    }

                    dropdown.remove();
                    renderizarTelasAtuais();
                });
            });

            th.appendChild(dropdown);
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.status-filter-dropdown').forEach(el => el.remove());
    });
}

function configurarOrdenacaoCabecalhos() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const coluna = th.getAttribute('data-column');
            
            let objOrdenacao;
            if (estado.telaAtual === 'geral') {
                objOrdenacao = obterEstadoAgendaAtual().ordenacao;
            } else if (estado.telaAtual === 'painel-comprador') {
                objOrdenacao = obterEstadoCompradorAtual().ordenacao;
            }

            if (objOrdenacao.coluna === coluna) {
                objOrdenacao.asc = !objOrdenacao.asc;
            } else {
                objOrdenacao.coluna = coluna;
                objOrdenacao.asc = true;
            }

            sincronizarSetasOrdenacaoVisuais();
            renderizarTelasAtuais();
        });
    });
}

function inicializarSelectsEListas() {
    const selectClassComprador = document.getElementById('inputClassificacaoComprador');
    if (selectClassComprador) {
        selectClassComprador.innerHTML = '<option value="">Selecione...</option>';
        classificacoes.forEach(classe => {
            const opt = document.createElement('option');
            opt.value = classe;
            opt.textContent = classe;
            selectClassComprador.appendChild(opt);
        });
    }

    const selPrev = document.getElementById('inputPrevisaoComprador');
    if (selPrev) {
        selPrev.innerHTML = '<option value="">Selecione...</option>';
        for(let i = 1; i <= 45; i++) {
            const opt = document.createElement('option');
            opt.value = i + " Dias";
            opt.textContent = i + " Dias";
            selPrev.appendChild(opt);
        }
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
                btn.textContent = classe;
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
    
    sincronizarSetasOrdenacaoVisuais();
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
    
    sincronizarSetasOrdenacaoVisuais();
    renderizarTabelaGeral();
}

function sincronizarSetasOrdenacaoVisuais() {
    let colunaAtiva = '';
    let ascAtivo = true;
    let modoVisualizacao = 'tabela';

    if (estado.telaAtual === 'geral') {
        const configAgenda = obterEstadoAgendaAtual();
        colunaAtiva = configAgenda.ordenacao.coluna;
        ascAtivo = configAgenda.ordenacao.asc;
        modoVisualizacao = configAgenda.visualizacao;
    } else if (estado.telaAtual === 'painel-comprador') {
        const configComprador = obterEstadoCompradorAtual();
        colunaAtiva = configComprador.ordenacao.coluna;
        ascAtivo = configComprador.ordenacao.asc;
        modoVisualizacao = configComprador.visualizacao;
    }

    const tabelaAtiva = document.querySelector(`#${estado.telaAtual === 'geral' ? 'tabelaCorpo' : 'tabelaCorpoComprador'}`)?.closest('table');
    if (tabelaAtiva) {
        tabelaAtiva.querySelectorAll('th.sortable').forEach(t => {
            t.classList.remove('asc', 'desc');
            if (t.getAttribute('data-column') === colunaAtiva) {
                t.classList.add(ascAtivo ? 'asc' : 'desc');
            }
        });
    }

    // Reflete o modo (tabela/calendário) salvo nessa agenda nos botões do topo.
    if (estado.telaAtual === 'geral' || estado.telaAtual === 'painel-comprador') {
        const prefixo = estado.telaAtual === 'geral' ? 'Geral' : 'Comprador';
        document.getElementById(`btnVisTabela${prefixo}`)?.classList.toggle('active', modoVisualizacao !== 'calendario');
        document.getElementById(`btnVisCalendario${prefixo}`)?.classList.toggle('active', modoVisualizacao === 'calendario');
    }
}

function mudarTela(nomeTela) {
    document.getElementById('telaGeral').style.display = (nomeTela === 'geral') ? 'block' : 'none';
    document.getElementById('telaSelecaoComprador').style.display = (nomeTela === 'selecao-comprador') ? 'block' : 'none';
    document.getElementById('telaPainelComprador').style.display = (nomeTela === 'painel-comprador') ? 'block' : 'none';

    if (nomeTela === 'geral') {
        sincronizarSetasOrdenacaoVisuais();
        renderizarTabelaGeral();
    } else if (nomeTela === 'painel-comprador') {
        const tituloPainel = document.getElementById('tituloPainelComprador');
        if (tituloPainel) tituloPainel.innerText = `Painel: ${estado.compradorLogado} — Grupo: ${estado.empresaCompradorAtual}`;
        limparFormularioComprador();
        sincronizarSetasOrdenacaoVisuais();
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

    let configOrdenacao = estado.telaAtual === 'geral' ? obterEstadoAgendaAtual().ordenacao : obterEstadoCompradorAtual().ordenacao;
    const { coluna, asc } = configOrdenacao;

    const dadosOrdenados = [...dados].sort((a, b) => {
        let valorA = a[coluna];
        let valorB = b[coluna];

        if (coluna === 'data') {
            valorA = a.data ? new Date(a.data).getTime() : 0;
            valorB = b.data ? new Date(b.data).getTime() : 0;
        } else if (coluna === 'previsao') {
            valorA = parseInt(a.previsao) || 0;
            valorB = parseInt(b.previsao) || 0;
        } else {
            valorA = (valorA || '').toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            valorB = (valorB || '').toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        if (valorA < valorB) return asc ? -1 : 1;
        if (valorA > valorB) return asc ? 1 : -1;
        return 0;
    });

    if (dadosOrdenados.length === 0) {
        const tr = document.createElement('tr');
        const colSpanCount = options.showActions ? 8 : 7;
        tr.innerHTML = `<td colspan="${colSpanCount}" style="text-align: center; color: var(--text-light);">Nenhum registro encontrado.</td>`;
        tbody.appendChild(tr);
        return;
    }

    const fragment = document.createDocumentFragment();
    dadosOrdenados.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(formatarData(item.data))}</td>
            <td><strong>${escapeHtml(item.classificacao || 'GERAL')}</strong></td>
            <td>${escapeHtml(item.categoria)}${item.recorrente ? ' 🔁' : ''}</td>
            <td>${escapeHtml(item.fornecedor)}</td>
            <td>${escapeHtml(item.acaoComprador)}</td>
            <td>${escapeHtml(item.previsao)}</td>
            <td><span class="flag ${obterClasseStatus(item.status)}">${escapeHtml(item.status)}</span></td>
            ${options.showActions ? `
                <td>
                    <button class="btn-action btn-edit" data-id="${item.id}">Editar</button>
                    <button class="btn-action btn-delete" data-id="${item.id}">Remover</button>
                </td>
            ` : ''}
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
}

function configuracaoBaseCalendario() {
    return {
        locale: 'pt-br',
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        height: 650,
        dayMaxEvents: 3,
        events: [],
        eventDidMount: (info) => {
            // Tooltip nativo (hover) com o resumo do lançamento — útil
            // principalmente no espelho, que não tem clique de edição.
            const p = info.event.extendedProps;
            const partes = [info.event.title];
            if (p.classificacao) partes.push(p.classificacao);
            if (p.acaoComprador) partes.push(p.acaoComprador);
            if (p.previsao) partes.push(`Previsão: ${p.previsao}`);
            info.el.setAttribute('title', partes.join(' • '));
        }
    };
}

function corPorStatus(status) {
    const variavel = status === 'EXECUTADO' ? '--status-executado'
        : status === 'EXECUTADO PARCIALMENTE' ? '--status-parcial'
        : '--status-agendado';
    return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
}

function atualizarEventosCalendario(calendario, dados) {
    calendario.removeAllEvents();
    dados.forEach(item => {
        if (!item.data) return;
        const tituloBase = item.fornecedor || item.categoria || 'Agendamento';
        calendario.addEvent({
            id: item.id,
            title: item.recorrente ? `🔁 ${tituloBase}` : tituloBase,
            start: item.data,
            allDay: true,
            color: corPorStatus(item.status),
            extendedProps: {
                categoria: item.categoria,
                classificacao: item.classificacao,
                acaoComprador: item.acaoComprador,
                previsao: item.previsao,
                status: item.status
            }
        });
    });
}

function obterOuCriarCalendarioGeral() {
    if (calendarioGeralInstancia) return calendarioGeralInstancia;
    const el = document.getElementById('calendarioGeral');
    calendarioGeralInstancia = new FullCalendar.Calendar(el, {
        ...configuracaoBaseCalendario(),
        // Espelho é só leitura: o clique mostra o detalhe, sem editar/excluir.
        eventClick: (info) => {
            const item = estado.agendamentos.find(a => a.id === info.event.id);
            if (item) abrirModalDetalheEvento(item, false);
        }
    });
    calendarioGeralInstancia.render();
    return calendarioGeralInstancia;
}

function obterOuCriarCalendarioComprador() {
    if (calendarioCompradorInstancia) return calendarioCompradorInstancia;
    const el = document.getElementById('calendarioComprador');
    calendarioCompradorInstancia = new FullCalendar.Calendar(el, {
        ...configuracaoBaseCalendario(),
        // Clicar num dia vazio preenche a data no formulário de cadastro,
        // igual ao "criar rápido" do Google Agenda.
        dateClick: (info) => {
            limparFormularioComprador();
            const inputData = document.getElementById('inputDataComprador');
            if (inputData) inputData.value = info.dateStr;
            document.getElementById('inputCategoriaComprador')?.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        // Clicar num evento existente abre o modal de detalhe, com botões
        // de editar (carrega no formulário) e excluir.
        eventClick: (info) => {
            const item = estado.agendamentos.find(a => a.id === info.event.id);
            if (item) abrirModalDetalheEvento(item, true);
        }
    });
    calendarioCompradorInstancia.render();
    return calendarioCompradorInstancia;
}

function aplicarVisualizacao(tela, filtrados, options) {
    const ehGeral = tela === 'geral';
    const config = ehGeral ? obterEstadoAgendaAtual() : obterEstadoCompradorAtual();
    const emCalendario = config.visualizacao === 'calendario';

    const idContainerTabela = ehGeral ? 'containerTabelaGeral' : 'containerTabelaComprador';
    const idContainerCalendario = ehGeral ? 'containerCalendarioGeral' : 'containerCalendarioComprador';
    const idCorpoTabela = ehGeral ? 'tabelaCorpo' : 'tabelaCorpoComprador';

    document.getElementById(idContainerTabela).style.display = emCalendario ? 'none' : 'block';
    document.getElementById(idContainerCalendario).style.display = emCalendario ? 'block' : 'none';

    if (emCalendario) {
        const calendario = ehGeral ? obterOuCriarCalendarioGeral() : obterOuCriarCalendarioComprador();
        atualizarEventosCalendario(calendario, filtrados);
        calendario.updateSize();
    } else {
        renderizarTabelaGenerica(idCorpoTabela, filtrados, options);
    }
}

function alternarVisualizacao(tela, modo) {
    const config = tela === 'geral' ? obterEstadoAgendaAtual() : obterEstadoCompradorAtual();
    config.visualizacao = modo;
    sincronizarSetasOrdenacaoVisuais();
    renderizarTelasAtuais();
}

function renderizarTabelaGeral() {
    const agendaAtual = obterEstadoAgendaAtual();
    const filtrados = estado.agendamentos.filter(item => {
        const matchEmpresa = item.empresa === estado.empresaAtual;
        const matchClassificacao = estado.classificacaoFiltroAtual ? item.classificacao === estado.classificacaoFiltroAtual : true;
        const matchStatus = agendaAtual.statusFiltro ? item.status === agendaAtual.statusFiltro : true;
        return matchEmpresa && matchClassificacao && matchStatus;
    });

    aplicarVisualizacao('geral', filtrados, { showActions: false });
}

function renderizarTabelaComprador() {
    const compradorAtual = obterEstadoCompradorAtual();
    const filtrados = estado.agendamentos.filter(item => {
        const matchEmpresaComprador = item.empresa === estado.empresaCompradorAtual;
        const matchCompradorLogado = item.comprador === estado.compradorLogado;
        const matchStatus = compradorAtual.statusFiltro ? item.status === compradorAtual.statusFiltro : true;
        return matchEmpresaComprador && matchCompradorLogado && matchStatus;
    });

    aplicarVisualizacao('painel-comprador', filtrados, { showActions: true });
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

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Sábado volta pro dia útil mais próximo (sexta); domingo avança pro mais
// próximo (segunda) — em ambos os casos, o vizinho a 1 dia de distância.
function ajustarParaDiaUtil(data) {
    const diaSemana = data.getDay();
    const ajustada = new Date(data);
    if (diaSemana === 6) ajustada.setDate(ajustada.getDate() - 1);
    else if (diaSemana === 0) ajustada.setDate(ajustada.getDate() + 1);
    return ajustada;
}

// Evita rolar pro mês seguinte quando o dia base (ex: 31) não existe no mês
// alvo (ex: abril) — trava no último dia real daquele mês.
function diaDoMesComLimite(ano, mesIndex, diaDesejado) {
    const ultimoDiaDoMes = new Date(ano, mesIndex + 1, 0).getDate();
    return Math.min(diaDesejado, ultimoDiaDoMes);
}

// Gera as datas (YYYY-MM-DD) de uma recorrência mensal a partir de uma data
// base, já com o ajuste de dia útil aplicado a cada ocorrência.
function gerarDatasRecorrenciaMensal(dataBaseStr, quantidadeMeses) {
    const [anoBase, mesBase, diaBase] = dataBaseStr.split('-').map(Number);
    const datas = [dataBaseStr];

    for (let i = 1; i < quantidadeMeses; i++) {
        const mesIndexAlvo = (mesBase - 1) + i;
        const anoAlvo = anoBase + Math.floor(mesIndexAlvo / 12);
        const mesAlvo = ((mesIndexAlvo % 12) + 12) % 12;
        const diaAlvo = diaDoMesComLimite(anoAlvo, mesAlvo, diaBase);
        const dataAjustada = ajustarParaDiaUtil(new Date(anoAlvo, mesAlvo, diaAlvo));
        datas.push(formatarDataISO(dataAjustada));
    }

    return datas;
}

// Grava todas as ocorrências da série em uma única escrita em lote. A 1ª
// ocorrência mantém o status escolhido no formulário; as futuras nascem
// como AGENDADO, já que ainda não aconteceram.
async function criarSerieRecorrenteMensal(dadosBase, dataInicialStr, quantidadeMeses) {
    const datas = gerarDatasRecorrenciaMensal(dataInicialStr, quantidadeMeses);
    const colecaoAgendamentos = collection(db, "agendamentos");
    const primeiraRef = doc(colecaoAgendamentos);
    const serieRecorrenciaId = primeiraRef.id;
    const lote = writeBatch(db);

    datas.forEach((dataOcorrencia, indice) => {
        const ref = indice === 0 ? primeiraRef : doc(colecaoAgendamentos);
        lote.set(ref, {
            ...dadosBase,
            data: dataOcorrencia,
            status: indice === 0 ? dadosBase.status : 'AGENDADO',
            recorrente: true,
            serieRecorrenciaId,
            criadoPorUid: auth.currentUser.uid
        });
    });

    await lote.commit();
}

async function salvarAgendamentoComprador() {
    const data = document.getElementById('inputDataComprador').value;
    const classificacao = document.getElementById('inputClassificacaoComprador').value;
    const categoria = document.getElementById('inputCategoriaComprador').value.trim();
    const fornecedor = document.getElementById('inputFornecedorComprador').value.trim();
    const acaoComprador = document.getElementById('inputAcaoComprador').value;
    const previsao = document.getElementById('inputPrevisaoComprador').value;
    const status = document.getElementById('inputStatusComprador').value;
    const editId = document.getElementById('editIndexComprador').value;
    const repetirMensalmente = editId === "-1" && !!document.getElementById('inputRecorrenteComprador')?.checked;
    const horizonteMeses = parseInt(document.getElementById('inputHorizonteRecorrenciaComprador')?.value || '12', 10);

    if (!data || !classificacao || !categoria || !fornecedor || !acaoComprador || !previsao || !status) {
        alert("Por favor, preencha todos os campos do agendamento.");
        return;
    }

    if (!auth.currentUser) {
        alert("Sua sessão expirou. Volte à seleção de compradores e entre novamente.");
        return;
    }

    const dadosRegistro = {
        empresa: estado.empresaCompradorAtual,
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
        if (editId !== "-1") {
            await updateDoc(doc(db, "agendamentos", editId), { ...dadosRegistro, data });
        } else if (repetirMensalmente) {
            // criadoPorUid só é gravado na criação — é o que as regras do
            // Firestore usam depois pra saber quem tem permissão de editar
            // ou apagar esse registro específico.
            await criarSerieRecorrenteMensal(dadosRegistro, data, horizonteMeses);
        } else {
            await addDoc(collection(db, "agendamentos"), {
                ...dadosRegistro,
                data,
                criadoPorUid: auth.currentUser.uid
            });
        }
        limparFormularioComprador();
    } catch (error) {
        console.error("Erro ao salvar no Firestore:", error);
        alert("Erro ao salvar o registro. Verifique sua conexão ou se sua sessão ainda é válida.");
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

    // Recorrência só faz sentido ao criar — editar mexe só nesta ocorrência.
    definirVisibilidadeRecorrencia(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirAgendamentoComprador(id) {
    const item = estado.agendamentos.find(a => a.id === id);
    const mensagem = item?.recorrente
        ? "Este lançamento faz parte de uma série mensal. Remover apenas esta ocorrência?"
        : "Deseja realmente remover este agendamento?";

    if (confirm(mensagem)) {
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
    definirVisibilidadeRecorrencia(true);
}

function definirVisibilidadeRecorrencia(habilitado) {
    const grupo = document.getElementById('grupoRecorrencia');
    const checkbox = document.getElementById('inputRecorrenteComprador');
    const select = document.getElementById('inputHorizonteRecorrenciaComprador');
    if (grupo) grupo.style.display = habilitado ? '' : 'none';
    if (checkbox) checkbox.checked = false;
    if (select) select.disabled = true;
}

function exportarExcel() {
    let filtrados = [];
    let nomeArquivo = "";

    if (estado.telaAtual === 'geral') {
        const agendaAtual = obterEstadoAgendaAtual();
        filtrados = estado.agendamentos.filter(item => {
            const matchEmpresa = item.empresa === estado.empresaAtual;
            const matchClassificacao = estado.classificacaoFiltroAtual ? item.classificacao === estado.classificacaoFiltroAtual : true;
            const matchStatus = agendaAtual.statusFiltro ? item.status === agendaAtual.statusFiltro : true;
            return matchEmpresa && matchClassificacao && matchStatus;
        });

        nomeArquivo = `Agenda_${estado.empresaAtual.replace(/[^a-zA-Z0-9]/g, '_')}_${estado.classificacaoFiltroAtual || 'GERAL'}.csv`;

    } else if (estado.telaAtual === 'painel-comprador') {
        const compradorAtual = obterEstadoCompradorAtual();
        filtrados = estado.agendamentos.filter(item => {
            const matchEmpresaComprador = item.empresa === estado.empresaCompradorAtual;
            const matchCompradorLogado = item.comprador === estado.compradorLogado;
            const matchStatus = compradorAtual.statusFiltro ? item.status === compradorAtual.statusFiltro : true;
            return matchEmpresaComprador && matchCompradorLogado && matchStatus;
        });

        nomeArquivo = `Painel_${estado.compradorLogado}_${estado.empresaCompradorAtual.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    }

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

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}