// ============================================================
// AGENDA COMPRAS V2
// JavaScript principal
// ============================================================

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const CONFIG = {
    senhaAdmin: "198024"
};


// ============================================================
// DADOS TEMPORÁRIOS
// ============================================================
// Estes dados serão substituídos pelo Firebase posteriormente.
// A estrutura já está preparada para isso.

let rotinas = [
    {
        id: "curva-d",
        descricao: "Curva D",
        distribuicao: "Segunda-feira",
        dia: "segunda",
        periodo: "Mês Atual × Anterior",
        prioridade: "alta",
        status: "feito",
        procedimento: [
            "Exportar relatório do BI",
            "Comparar com o mês anterior",
            "Verificar aumento por classificação",
            "Enviar resumo para a gestão"
        ],
        observacoes: "Conferir as classificações com maior aumento."
    },

    {
        id: "transferencias",
        descricao: "Transferências",
        distribuicao: "Segunda e Quinta",
        dia: "segunda",
        periodo: "Mês Atual",
        prioridade: "media",
        status: "pendente",
        procedimento: [
            "Verificar transferências pendentes",
            "Conferir origem e destino",
            "Validar divergências",
            "Atualizar o controle"
        ],
        observacoes: ""
    },

    {
        id: "custo-medio",
        descricao: "Custo Médio por Classificação",
        distribuicao: "Terça-feira",
        dia: "terca",
        periodo: "90 dias × Mês Atual",
        prioridade: "alta",
        status: "pendente",
        procedimento: [
            "Atualizar relatório",
            "Filtrar período de 90 dias",
            "Comparar com o mês atual",
            "Verificar divergências relevantes"
        ],
        observacoes: ""
    },

    {
        id: "revisoes",
        descricao: "Revisões",
        distribuicao: "Sexta-feira",
        dia: "sexta",
        periodo: "Semana Atual",
        prioridade: "baixa",
        status: "pendente",
        procedimento: [
            "Revisar demandas da semana",
            "Conferir pendências",
            "Atualizar os registros",
            "Preparar fechamento semanal"
        ],
        observacoes: ""
    }
];


// ============================================================
// ELEMENTOS PRINCIPAIS
// ============================================================

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");

const loginForm = document.getElementById("loginForm");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const pageTitle = document.getElementById("pageTitle");

const todayWeekday = document.getElementById("todayWeekday");
const currentDate = document.getElementById("currentDate");

const todayDemands = document.getElementById("todayDemands");

const todayTotal = document.getElementById("todayTotal");
const todayCompleted = document.getElementById("todayCompleted");
const todayPending = document.getElementById("todayPending");

const weekCompleted = document.getElementById("weekCompleted");
const weekTotal = document.getElementById("weekTotal");
const weekProgressPercent = document.getElementById("weekProgressPercent");
const weekProgressFill = document.getElementById("weekProgressFill");

const weeklyBoard = document.getElementById("weeklyBoard");

const demandModal = document.getElementById("demandModal");
const routineModal = document.getElementById("routineModal");
const confirmModal = document.getElementById("confirmModal");

const routineForm = document.getElementById("routineForm");


// ============================================================
// ESTADO DO SISTEMA
// ============================================================

let rotinaSelecionada = null;
let acaoConfirmacao = null;


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    configurarDataAtual();
    configurarLogin();
    configurarNavegacao();
    configurarModais();
    configurarFormularioRotina();
    configurarBotoesStatus();
    configurarCards();
    verificarSessao();

});


// ============================================================
// LOGIN
// ============================================================

function configurarLogin() {

    if (!loginForm) return;

    loginForm.addEventListener("submit", (event) => {

        event.preventDefault();

        const senha = loginPassword.value.trim();

        if (senha === CONFIG.senhaAdmin) {

            sessionStorage.setItem("agendaComprasAuth", "true");

            loginError.textContent = "";

            abrirSistema();

        } else {

            loginError.textContent = "Senha incorreta.";

            loginPassword.value = "";

            loginPassword.focus();

        }

    });

}


// ============================================================
// VERIFICA SESSÃO
// ============================================================

function verificarSessao() {

    const autenticado =
        sessionStorage.getItem("agendaComprasAuth") === "true";

    if (autenticado) {
        abrirSistema();
    } else {
        mostrarLogin();
    }

}


// ============================================================
// ABRIR SISTEMA
// ============================================================

function abrirSistema() {

    if (loginScreen) {
        loginScreen.classList.add("hidden");
    }

    if (appScreen) {
        appScreen.classList.remove("hidden");
    }

    atualizarInterface();

}


// ============================================================
// MOSTRAR LOGIN
// ============================================================

function mostrarLogin() {

    if (appScreen) {
        appScreen.classList.add("hidden");
    }

    if (loginScreen) {
        loginScreen.classList.remove("hidden");
    }

}


// ============================================================
// LOGOUT
// ============================================================

function fazerLogout() {

    sessionStorage.removeItem("agendaComprasAuth");

    fecharTodosModais();

    mostrarLogin();

    if (loginForm) {
        loginForm.reset();
    }

}


// ============================================================
// NAVEGAÇÃO
// ============================================================

function configurarNavegacao() {

    const botoesMenu = document.querySelectorAll(".nav-item[data-page]");

    botoesMenu.forEach((botao) => {

        botao.addEventListener("click", () => {

            const pagina = botao.dataset.page;

            abrirPagina(pagina);

        });

    });


    const botaoLogout = document.getElementById("btnLogout");

    if (botaoLogout) {

        botaoLogout.addEventListener("click", fazerLogout);

    }


    const botaoMenuMobile =
        document.getElementById("btnMobileMenu");

    if (botaoMenuMobile) {

        botaoMenuMobile.addEventListener("click", () => {

            const sidebar = document.getElementById("sidebar");

            if (sidebar) {
                sidebar.classList.toggle("open");
            }

        });

    }

}


function abrirPagina(pagina) {

    const paginas =
        document.querySelectorAll("[data-page-content]");

    const botoes =
        document.querySelectorAll(".nav-item[data-page]");


    paginas.forEach((elemento) => {

        const pertence = elemento.dataset.pageContent === pagina;

        elemento.classList.toggle("hidden", !pertence);
        elemento.classList.toggle("active", pertence);

    });


    botoes.forEach((botao) => {

        botao.classList.toggle(
            "active",
            botao.dataset.page === pagina
        );

    });


    const titulos = {
        inicio: "Início",
        semana: "Semana",
        procedimentos: "Procedimentos"
    };

    if (pageTitle) {
        pageTitle.textContent =
            titulos[pagina] || "Agenda Compras";
    }


    atualizarInterface();


    // Fecha o menu mobile depois de navegar
    const sidebar = document.getElementById("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

}


// ============================================================
// DATA E DIA DA SEMANA
// ============================================================

function obterDiaAtual() {

    const hoje = new Date();

    const dias = [
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado"
    ];

    return dias[hoje.getDay()];

}


function obterNomeDiaAtual() {

    const hoje = new Date();

    const dias = [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado"
    ];

    return dias[hoje.getDay()];

}


function configurarDataAtual() {

    const hoje = new Date();

    const nomeDia = obterNomeDiaAtual();

    const dataFormatada =
        hoje.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long"
        });


    if (todayWeekday) {
        todayWeekday.textContent = nomeDia;
    }


    if (currentDate) {

        currentDate.textContent =
            `${nomeDia}, ${dataFormatada}`;

    }

}


// ============================================================
// DEMANDAS DO DIA
// ============================================================

function obterDemandasDoDia() {

    const diaAtual = obterDiaAtual();

    return rotinas.filter((rotina) => {

        if (rotina.dia === diaAtual) {
            return true;
        }

        // Rotinas segunda e quinta
        if (
            rotina.distribuicao === "Segunda e Quinta" &&
            (diaAtual === "segunda" || diaAtual === "quinta")
        ) {
            return true;
        }

        // Rotinas diárias
        if (
            rotina.distribuicao === "Diariamente"
        ) {
            return true;
        }

        return false;

    });

}


// ============================================================
// RENDERIZA DEMANDAS DE HOJE
// ============================================================

function renderizarDemandasDoDia() {

    if (!todayDemands) return;

    const demandas = obterDemandasDoDia();

    todayDemands.innerHTML = "";


    if (demandas.length === 0) {

        todayDemands.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-icon">✓</div>

                <h3>Nenhuma demanda para hoje</h3>

                <p>
                    Não há rotinas programadas para este dia.
                </p>
            </div>
        `;

    } else {

        demandas.forEach((rotina) => {

            todayDemands.appendChild(
                criarCardDemanda(rotina)
            );

        });

    }


    atualizarIndicadoresHoje(demandas);

}


// ============================================================
// CRIA CARD DA DEMANDA
// ============================================================

function criarCardDemanda(rotina) {

    const card = document.createElement("article");

    card.className =
        `demand-card ${rotina.status}`;

    card.dataset.routineId = rotina.id;


    const statusTexto =
        rotina.status === "feito"
            ? "Feito"
            : "Pendente";


    const statusIcon =
        rotina.status === "feito"
            ? "✓"
            : "◷";


    const prioridadeTexto =
        formatarPrioridade(rotina.prioridade);


    card.innerHTML = `

        <div class="demand-card-header">

            <div class="demand-status-icon">
                ${statusIcon}
            </div>

            <span class="status-badge ${rotina.status}">
                ${statusTexto}
            </span>

        </div>


        <div class="demand-card-body">

            <h3>
                ${escapeHTML(rotina.descricao)}
            </h3>

            <p>
                ${escapeHTML(rotina.periodo)}
            </p>

        </div>


        <div class="demand-card-footer">

            <span class="priority-indicator ${rotina.prioridade}">
                ${prioridadeTexto}
            </span>

            <span class="demand-action">
                Ver detalhes →
            </span>

        </div>

    `;


    card.addEventListener("click", () => {

        abrirDetalhesRotina(rotina.id);

    });


    return card;

}


// ============================================================
// INDICADORES DE HOJE
// ============================================================

function atualizarIndicadoresHoje(demandas) {

    const total = demandas.length;

    const concluidas =
        demandas.filter(
            (item) => item.status === "feito"
        ).length;

    const pendentes = total - concluidas;


    if (todayTotal) {
        todayTotal.textContent = total;
    }

    if (todayCompleted) {
        todayCompleted.textContent = concluidas;
    }

    if (todayPending) {
        todayPending.textContent = pendentes;
    }

}


// ============================================================
// SEMANA
// ============================================================

function renderizarSemana() {

    if (!weeklyBoard) return;

    const colunas =
        weeklyBoard.querySelectorAll(".day-column");


    const mapaDias = {
        segunda: "segunda",
        terca: "terca",
        quarta: "quarta",
        quinta: "quinta",
        sexta: "sexta"
    };


    colunas.forEach((coluna) => {

        const dia = coluna.dataset.day;

        if (!dia) return;


        const area =
            coluna.querySelector(".day-demands");

        const contador =
            coluna.querySelector(".day-count");

        if (!area) return;


        area.innerHTML = "";


        const demandas =
            rotinas.filter((rotina) => {

                if (rotina.dia === dia) {
                    return true;
                }


                if (
                    rotina.distribuicao === "Segunda e Quinta" &&
                    (
                        dia === "segunda" ||
                        dia === "quinta"
                    )
                ) {
                    return true;
                }


                if (
                    rotina.distribuicao === "Diariamente"
                ) {
                    return true;
                }


                return false;

            });


        if (contador) {
            contador.textContent = demandas.length;
        }


        if (demandas.length === 0) {

            area.innerHTML = `
                <div class="empty-state">
                    Nenhuma demanda
                </div>
            `;

            return;

        }


        demandas.forEach((rotina) => {

            const card =
                criarCardSemanal(rotina);

            area.appendChild(card);

        });

    });


    destacarDiaAtual();

}


// ============================================================
// CARD SEMANAL
// ============================================================

function criarCardSemanal(rotina) {

    const card =
        document.createElement("article");

    card.className =
        `weekly-demand-card ${rotina.status}`;

    card.dataset.routineId =
        rotina.id;


    const statusTexto =
        rotina.status === "feito"
            ? "Feito"
            : "Pendente";


    card.innerHTML = `

        <div class="weekly-card-top">

            <span class="weekly-status-dot ${rotina.status}">
            </span>

            <span class="status-badge ${rotina.status}">
                ${statusTexto}
            </span>

        </div>

        <h3>
            ${escapeHTML(rotina.descricao)}
        </h3>

    `;


    card.addEventListener("click", () => {

        abrirDetalhesRotina(rotina.id);

    });


    return card;

}


// ============================================================
// DESTACAR DIA ATUAL
// ============================================================

function destacarDiaAtual() {

    const diaAtual = obterDiaAtual();

    const colunas =
        document.querySelectorAll(".day-column");


    colunas.forEach((coluna) => {

        coluna.classList.toggle(
            "current-day",
            coluna.dataset.day === diaAtual
        );

    });

}


// ============================================================
// PROGRESSO DA SEMANA
// ============================================================

function atualizarProgressoSemana() {

    const total =
        rotinas.length;

    const concluidas =
        rotinas.filter(
            (rotina) => rotina.status === "feito"
        ).length;


    let percentual = 0;


    if (total > 0) {

        percentual =
            Math.round(
                (concluidas / total) * 100
            );

    }


    if (weekCompleted) {
        weekCompleted.textContent = concluidas;
    }


    if (weekTotal) {
        weekTotal.textContent = total;
    }


    if (weekProgressPercent) {
        weekProgressPercent.textContent =
            `${percentual}%`;
    }


    if (weekProgressFill) {

        weekProgressFill.style.width =
            `${percentual}%`;

    }

}


// ============================================================
// MODAL DE DETALHES
// ============================================================

function abrirDetalhesRotina(id) {

    const rotina =
        rotinas.find(
            (item) => item.id === id
        );


    if (!rotina) return;


    rotinaSelecionada = rotina;


    const title =
        document.getElementById("demandModalTitle");

    const subtitle =
        document.getElementById("demandModalSubtitle");

    const description =
        document.getElementById("detailDescription");

    const distribution =
        document.getElementById("detailDistribution");

    const period =
        document.getElementById("detailPeriod");

    const priority =
        document.getElementById("detailPriority");

    const procedure =
        document.getElementById("detailProcedure");

    const toggleStatus =
        document.getElementById("btnToggleStatus");


    if (title) {
        title.textContent =
            rotina.descricao;
    }


    if (subtitle) {

        subtitle.textContent =
            `${rotina.distribuicao} • ${rotina.periodo}`;

    }


    if (description) {

        description.textContent =
            rotina.descricao;

    }


    if (distribution) {

        distribution.textContent =
            rotina.distribuicao;

    }


    if (period) {

        period.textContent =
            rotina.periodo;

    }


    if (priority) {

        priority.textContent =
            formatarPrioridade(rotina.prioridade);

        priority.className =
            `priority-badge ${rotina.prioridade}`;

    }


    if (procedure) {

        renderizarProcedimento(
            rotina.procedimento,
            procedure
        );

    }


    if (toggleStatus) {

        toggleStatus.textContent =
            rotina.status === "feito"
                ? "Marcar como pendente"
                : "Marcar como concluída";

    }


    abrirModal(demandModal);

}


// ============================================================
// PROCEDIMENTO / WIKI
// ============================================================

function renderizarProcedimento(
    procedimento,
    container
) {

    if (!container) return;


    container.innerHTML = "";


    if (
        !procedimento ||
        procedimento.length === 0
    ) {

        container.innerHTML = `
            <div class="procedure-empty">
                Nenhum procedimento cadastrado.
            </div>
        `;

        return;

    }


    procedimento.forEach((passo, index) => {

        const elemento =
            document.createElement("div");

        elemento.className =
            "procedure-step";


        const numero =
            String(index + 1).padStart(2, "0");


        elemento.innerHTML = `

            <span class="step-number">
                ${numero}
            </span>

            <span>
                ${escapeHTML(passo)}
            </span>

        `;


        container.appendChild(elemento);

    });

}


// ============================================================
// BOTÕES DE STATUS
// ============================================================

function configurarBotoesStatus() {

    const botao =
        document.getElementById("btnToggleStatus");


    if (!botao) return;


    botao.addEventListener("click", () => {

        if (!rotinaSelecionada) return;


        const novoStatus =
            rotinaSelecionada.status === "feito"
                ? "pendente"
                : "feito";


        rotinaSelecionada.status =
            novoStatus;


        fecharModal(demandModal);

        atualizarInterface();

        mostrarToast(
            novoStatus === "feito"
                ? "Demanda concluída."
                : "Demanda voltou para pendente."
        );

    });

}


// ============================================================
// FORMULÁRIO DE NOVA ROTINA
// ============================================================

function configurarFormularioRotina() {

    if (!routineForm) return;


    routineForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            const formData =
                new FormData(routineForm);


            const descricao =
                formData.get("description");


            const distribuicao =
                formData.get("distribution");


            const dia =
                formData.get("day");


            const periodo =
                formData.get("period");


            const prioridade =
                formData.get("priority");


            const procedimentoTexto =
                formData.get("procedure");


            const observacoes =
                formData.get("notes");


            const procedimento =
                procedimentoTexto
                    ? procedimentoTexto
                        .split("\n")
                        .map((linha) => linha.trim())
                        .filter(Boolean)
                    : [];


            const novaRotina = {

                id:
                    gerarIdUnico(),

                descricao,

                distribuicao:
                    formatarDistribuicao(
                        distribuicao
                    ),

                dia,

                periodo:
                    formatarPeriodo(
                        periodo
                    ),

                prioridade,

                status:
                    "pendente",

                procedimento,

                observacoes

            };


            rotinas.push(
                novaRotina
            );


            routineForm.reset();


            fecharModal(
                routineModal
            );


            atualizarInterface();


            mostrarToast(
                "Rotina cadastrada com sucesso."
            );

        }
    );

}


// ============================================================
// NOVA ROTINA
// ============================================================

function configurarBotoesNovaRotina() {

    const botao =
        document.getElementById("btnNewRoutine");


    if (botao) {

        botao.addEventListener(
            "click",
            () => abrirModal(routineModal)
        );

    }


    const botaoProcedimento =
        document.getElementById("btnNewProcedure");


    if (botaoProcedimento) {

        botaoProcedimento.addEventListener(
            "click",
            () => abrirModal(routineModal)
        );

    }

}


// Executa depois que todos os elementos estão disponíveis
configurarBotoesNovaRotina();


// ============================================================
// MODAIS
// ============================================================

function configurarModais() {

    const fecharDemanda =
        document.getElementById(
            "closeDemandModal"
        );


    const fecharRotina =
        document.getElementById(
            "closeRoutineModal"
        );


    const cancelarRotina =
        document.getElementById(
            "btnCancelRoutine"
        );


    const fecharConfirmacao =
        document.getElementById(
            "closeConfirmModal"
        );


    const cancelarConfirmacao =
        document.getElementById(
            "btnCancelConfirm"
        );


    if (fecharDemanda) {

        fecharDemanda.addEventListener(
            "click",
            () => fecharModal(demandModal)
        );

    }


    if (fecharRotina) {

        fecharRotina.addEventListener(
            "click",
            () => fecharModal(routineModal)
        );

    }


    if (cancelarRotina) {

        cancelarRotina.addEventListener(
            "click",
            () => fecharModal(routineModal)
        );

    }


    if (fecharConfirmacao) {

        fecharConfirmacao.addEventListener(
            "click",
            () => fecharModal(confirmModal)
        );

    }


    if (cancelarConfirmacao) {

        cancelarConfirmacao.addEventListener(
            "click",
            () => fecharModal(confirmModal)
        );

    }


    document.querySelectorAll(
        ".modal-overlay"
    ).forEach((overlay) => {

        overlay.addEventListener(
            "click",
            (event) => {

                if (
                    event.target === overlay
                ) {

                    fecharModal(overlay);

                }

            }
        );

    });


    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {

                fecharTodosModais();

            }

        }
    );

}


function abrirModal(modal) {

    if (!modal) return;

    modal.classList.remove("hidden");

    document.body.classList.add(
        "modal-open"
    );

}


function fecharModal(modal) {

    if (!modal) return;

    modal.classList.add("hidden");

    if (
        !document.querySelector(
            ".modal-overlay:not(.hidden)"
        )
    ) {

        document.body.classList.remove(
            "modal-open"
        );

    }

}


function fecharTodosModais() {

    document.querySelectorAll(
        ".modal-overlay"
    ).forEach((modal) => {

        modal.classList.add("hidden");

    });


    document.body.classList.remove(
        "modal-open"
    );

}


// ============================================================
// CARDS
// ============================================================

function configurarCards() {

    // Os cards criados dinamicamente
    // já recebem o evento ao serem criados.

}


// ============================================================
// PROCEDIMENTOS
// ============================================================

function renderizarProcedimentos() {

    const lista =
        document.getElementById(
            "procedureList"
        );


    if (!lista) return;


    lista.innerHTML = "";


    rotinas.forEach((rotina) => {

        const card =
            document.createElement("article");

        card.className =
            "procedure-card";


        card.dataset.routineId =
            rotina.id;


        card.innerHTML = `

            <div class="procedure-card-header">

                <span class="procedure-category">
                    ROTINA
                </span>

                <span class="priority-indicator ${rotina.prioridade}">
                    ${formatarPrioridade(rotina.prioridade)}
                </span>

            </div>


            <h3>
                ${escapeHTML(rotina.descricao)}
            </h3>


            <p>
                ${escapeHTML(
                    rotina.procedimento?.[0] ||
                    "Nenhum procedimento cadastrado."
                )}
            </p>


            <button
                type="button"
                class="procedure-link"
            >
                Abrir procedimento →
            </button>

        `;


        card
            .querySelector(
                ".procedure-link"
            )
            .addEventListener(
                "click",
                () => abrirDetalhesRotina(rotina.id)
            );


        lista.appendChild(card);

    });

}


// ============================================================
// INTERFACE GERAL
// ============================================================

function atualizarInterface() {

    configurarDataAtual();

    renderizarDemandasDoDia();

    renderizarSemana();

    atualizarProgressoSemana();

    renderizarProcedimentos();

}


// ============================================================
// FORMATAÇÕES
// ============================================================

function formatarPrioridade(valor) {

    const prioridades = {

        alta: "Alta",

        media: "Média",

        baixa: "Baixa"

    };


    return prioridades[valor] || valor;

}


function formatarDistribuicao(valor) {

    const distribuicoes = {

        diario: "Diariamente",

        segunda: "Segunda-feira",

        terca: "Terça-feira",

        quarta: "Quarta-feira",

        quinta: "Quinta-feira",

        sexta: "Sexta-feira",

        "segunda-quinta":
            "Segunda e Quinta",

        solicitacao:
            "Sob solicitação"

    };


    return distribuicoes[valor] || valor;

}


function formatarPeriodo(valor) {

    const periodos = {

        atual: "Mês Atual",

        "atual-anterior":
            "Mês Atual × Anterior",

        "90-dias":
            "Últimos 90 dias",

        "90-atual":
            "90 dias × Mês Atual",

        personalizado:
            "Personalizado"

    };


    return periodos[valor] || valor;

}


// ============================================================
// GERAR ID
// ============================================================

function gerarIdUnico() {

    return (
        "rotina-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escapeHTML(valor) {

    if (valor === null || valor === undefined) {
        return "";
    }


    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ============================================================
// TOAST
// ============================================================

function mostrarToast(mensagem) {

    const container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) return;


    const toast =
        document.createElement("div");


    toast.className =
        "toast";


    toast.textContent =
        mensagem;


    container.appendChild(toast);


    setTimeout(() => {

        toast.classList.add(
            "show"
        );

    }, 10);


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );


        setTimeout(() => {

            toast.remove();

        }, 300);

    }, 3000);

}


// ============================================================
// CONSOLE
// ============================================================

console.log(
    "Agenda Compras V2 carregada."
);