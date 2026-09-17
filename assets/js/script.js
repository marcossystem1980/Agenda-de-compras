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

let rotinas = [

    {
        id: "curva-d",

        descricao: "Curva D",

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

        observacoes:
            "Conferir as classificações com maior aumento."
    },

    {
        id: "custo-medio",

        descricao: "Custo Médio por Classificação",

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
        id: "transferencias",

        descricao: "Transferências",

        dia: "quinta",

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
        id: "revisoes",

        descricao: "Revisões",

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
// CARREGAR ROTINAS DO FIREBASE
// ============================================================

async function carregarRotinasDoFirebase() {

    try {

        const snapshot =
            await window.firebaseGetDocs(
                window.firebaseCollection(
                    window.db,
                    "rotinas"
                )
            );

        const rotinasFirebase =
            snapshot.docs.map((doc) => {

                const dados = doc.data();

const dias = normalizarDias(dados);

                return {
                    id: doc.id,
                    descricao: dados.descricao || "",
                    dias,
                    periodo: dados.periodo || "",
                    prioridade: dados.prioridade || "baixa",
                    status: dados.status || "pendente",
                    statusPorDia: normalizarStatusPorDia(
                        dados.statusPorDia,
                        dias,
                        dados.status || "pendente"
                    ),
                    procedimento: Array.isArray(dados.procedimento)
                        ? dados.procedimento
                        : [],
                    observacoes: dados.observacoes || ""
                };

            });

        rotinas = rotinasFirebase;

        console.log(
            "Rotinas carregadas do Firebase:",
            rotinas
        );

        atualizarInterface();

    } catch (erro) {

        console.error(
            "Erro ao carregar rotinas do Firebase:",
            erro
        );

    }

}


// ============================================================
// PERSISTÊNCIA NO FIREBASE
// ============================================================

function garantirDias(dias) {
    return Array.isArray(dias)
        ? [...new Set(dias.filter(Boolean))]
        : [];
}

function normalizarDias(dadosOuRotina) {
    const origem = dadosOuRotina || {};

    if (Array.isArray(origem.dias)) {
        return garantirDias(origem.dias);
    }

    if (origem.dia) {
        return [origem.dia];
    }

    return [];
}

function normalizarStatusPorDia(statusPorDia, dias, statusLegado = "pendente") {
    const resultado = {};
    const mapa =
        statusPorDia && typeof statusPorDia === "object"
            ? statusPorDia
            : {};

    garantirDias(dias).forEach((dia) => {
        resultado[dia] =
            mapa[dia] === "feito" || mapa[dia] === "pendente"
                ? mapa[dia]
                : statusLegado === "feito"
                    ? "feito"
                    : "pendente";
    });

    return resultado;
}

function obterStatusDoDia(rotina, dia) {
    if (!rotina || !dia) return "pendente";

    if (
        rotina.statusPorDia &&
        typeof rotina.statusPorDia === "object" &&
        Object.prototype.hasOwnProperty.call(
            rotina.statusPorDia,
            dia
        )
    ) {
        return rotina.statusPorDia[dia];
    }

    return rotina.status || "pendente";
}

function prepararStatusPorDia(rotina, dias) {
    return normalizarStatusPorDia(
        rotina?.statusPorDia,
        dias,
        rotina?.status || "pendente"
    );
}

async function salvarRotinaNoFirebase(rotina) {
    if (!rotina || !rotina.id) {
        throw new Error("Rotina inválida para salvar.");
    }

    const dias = garantirDias(
        normalizarDias(rotina)
    );

    const statusPorDia = prepararStatusPorDia(
        rotina,
        dias
    );

    await window.firebaseSetDoc(
        window.firebaseDoc(window.db, "rotinas", rotina.id),
        {
            descricao: rotina.descricao || "",
            dias,
            periodo: rotina.periodo || "",
            prioridade: rotina.prioridade || "baixa",
            status: rotina.status || "pendente",
            statusPorDia,
            procedimento: Array.isArray(rotina.procedimento)
                ? rotina.procedimento
                : [],
            observacoes: rotina.observacoes || ""
        }
    );

    rotina.dias = dias;
    rotina.statusPorDia = statusPorDia;
}

async function atualizarStatusNoFirebase(rotina, dia, novoStatus) {
    if (!rotina || !rotina.id || !dia) {
        throw new Error("Rotina ou dia inválido para atualizar status.");
    }

    const statusPorDia = prepararStatusPorDia(
        rotina,
        garantirDias(normalizarDias(rotina))
    );

    statusPorDia[dia] = novoStatus;

    rotina.statusPorDia = statusPorDia;

    const valoresStatus = Object.values(statusPorDia);
    rotina.status =
        valoresStatus.length > 0 &&
        valoresStatus.every((status) => status === "feito")
            ? "feito"
            : "pendente";

    await window.firebaseUpdateDoc(
        window.firebaseDoc(window.db, "rotinas", rotina.id),
        {
            status: rotina.status,
            statusPorDia
        }
    );
}

async function excluirRotinaDoFirebase(id) {
    if (!id) {
        throw new Error("ID da rotina não informado.");
    }

    await window.firebaseDeleteDoc(
        window.firebaseDoc(window.db, "rotinas", id)
    );
}

async function reiniciarSemanaNoFirebase() {
    const promessas = rotinas.map((rotina) => {
        const dias = garantirDias(normalizarDias(rotina));
        const statusPorDia = {};

        dias.forEach((dia) => {
            statusPorDia[dia] = "pendente";
        });

        return window.firebaseUpdateDoc(
            window.firebaseDoc(window.db, "rotinas", rotina.id),
            {
                status: "pendente",
                statusPorDia
            }
        );
    });

    await Promise.all(promessas);
}

// ============================================================
// ELEMENTOS PRINCIPAIS
// ============================================================

const loginScreen =
    document.getElementById("loginScreen");

const appScreen =
    document.getElementById("appScreen");

const loginForm =
    document.getElementById("loginForm");

const loginPassword =
    document.getElementById("loginPassword");

const loginError =
    document.getElementById("loginError");

const pageTitle =
    document.getElementById("pageTitle");

const todayWeekday =
    document.getElementById("todayWeekday");

const currentDate =
    document.getElementById("currentDate");

const todayDemands =
    document.getElementById("todayDemands");

const todayTotal =
    document.getElementById("todayTotal");

const todayCompleted =
    document.getElementById("todayCompleted");

const todayPending =
    document.getElementById("todayPending");

const weekCompleted =
    document.getElementById("weekCompleted");

const weekTotal =
    document.getElementById("weekTotal");

const weekProgressPercent =
    document.getElementById("weekProgressPercent");

const weekProgressFill =
    document.getElementById("weekProgressFill");

const weeklyBoard =
    document.getElementById("weeklyBoard");

const demandModal =
    document.getElementById("demandModal");

const routineModal =
    document.getElementById("routineModal");

const confirmModal =
    document.getElementById("confirmModal");

const routineForm =
    document.getElementById("routineForm");


// ============================================================
// ESTADO DO SISTEMA
// ============================================================

let rotinaSelecionada = null;

let diaRotinaSelecionada = null;

let acaoConfirmacao = null;

let modoEdicao = false;


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    configurarDataAtual();
    configurarLogin();
    configurarNavegacao();
    configurarModais();
    configurarFormularioRotina();
    configurarBotoesRotina();
    configurarBotoesNovaRotina();
    configurarReiniciarSemana();

    verificarSessao();

    carregarRotinasDoFirebase();
});

// ============================================================
// LOGIN
// ============================================================

function configurarLogin() {

    if (!loginForm) return;


    loginForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            const senha =
                loginPassword.value.trim();


            if (senha === CONFIG.senhaAdmin) {

                sessionStorage.setItem(
                    "agendaComprasAuth",
                    "true"
                );


                loginError.textContent = "";


                abrirSistema();

            }

            else {

                loginError.textContent =
                    "Senha incorreta.";


                loginPassword.value = "";


                loginPassword.focus();

            }

        }
    );

}


// ============================================================
// VERIFICAR SESSÃO
// ============================================================

function verificarSessao() {

    const autenticado =
        sessionStorage.getItem(
            "agendaComprasAuth"
        ) === "true";


    if (autenticado) {

        abrirSistema();

    }

    else {

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

}


// ============================================================
// MOSTRAR LOGIN
// ============================================================

function mostrarLogin() {

    if (appScreen) {

        appScreen.classList.add(
            "hidden"
        );

    }


    if (loginScreen) {

        loginScreen.classList.remove(
            "hidden"
        );

    }

}


// ============================================================
// LOGOUT
// ============================================================

function fazerLogout() {

    sessionStorage.removeItem(
        "agendaComprasAuth"
    );


    fecharTodosModais();


    rotinaSelecionada = null;
    diaRotinaSelecionada = null;

    modoEdicao = false;

    acaoConfirmacao = null;


    mostrarLogin();


    if (loginForm) {

        loginForm.reset();

    }

}


// ============================================================
// NAVEGAÇÃO
// ============================================================

function configurarNavegacao() {

    const botoesMenu =
        document.querySelectorAll(
            ".nav-item[data-page]"
        );


    botoesMenu.forEach(
        (botao) => {

            botao.addEventListener(
                "click",
                () => {

                    const pagina =
                        botao.dataset.page;


                    abrirPagina(pagina);

                }
            );

        }
    );


    const botaoLogout =
        document.getElementById(
            "btnLogout"
        );


    if (botaoLogout) {

        botaoLogout.addEventListener(
            "click",
            fazerLogout
        );

    }


    const botaoMenuMobile =
        document.getElementById(
            "btnMobileMenu"
        );


    if (botaoMenuMobile) {

        botaoMenuMobile.addEventListener(
            "click",
            () => {

                const sidebar =
                    document.getElementById(
                        "sidebar"
                    );


                if (sidebar) {

                    sidebar.classList.toggle(
                        "open"
                    );

                }

            }
        );

    }

}


// ============================================================
// ABRIR PÁGINA
// ============================================================

function abrirPagina(pagina) {

    const paginas =
        document.querySelectorAll(
            "[data-page-content]"
        );


    const botoes =
        document.querySelectorAll(
            ".nav-item[data-page]"
        );


    paginas.forEach(
        (elemento) => {

            const pertence =
                elemento.dataset.pageContent ===
                pagina;


            elemento.classList.toggle(
                "hidden",
                !pertence
            );


            elemento.classList.toggle(
                "active",
                pertence
            );

        }
    );


    botoes.forEach(
        (botao) => {

            botao.classList.toggle(
                "active",
                botao.dataset.page === pagina
            );

        }
    );


    const titulos = {

        inicio: "Início",

        semana: "Semana",

        procedimentos: "Procedimentos"

    };


    if (pageTitle) {

        pageTitle.textContent =
            titulos[pagina] ||
            "Agenda Compras";

    }


    atualizarInterface();


    const sidebar =
        document.getElementById(
            "sidebar"
        );


    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }

}


// ============================================================
// DATA ATUAL
// ============================================================

function obterDiaAtual() {

    const hoje =
        new Date();


    const dias = [

        "domingo",

        "segunda",

        "terca",

        "quarta",

        "quinta",

        "sexta",

        "sabado"

    ];


    return dias[
        hoje.getDay()
    ];

}

function obterDiasDaRotina(rotina) {

    if (Array.isArray(rotina.dias)) {
        return rotina.dias;
    }

    if (rotina.dia) {
        return [rotina.dia];
    }

    return [];
}


function obterNomeDiaAtual() {

    const hoje =
        new Date();


    const dias = [

        "Domingo",

        "Segunda-feira",

        "Terça-feira",

        "Quarta-feira",

        "Quinta-feira",

        "Sexta-feira",

        "Sábado"

    ];


    return dias[
        hoje.getDay()
    ];

}

function obterStatusDoDia(rotina, dia) {

    if (
        rotina.statusPorDia &&
        typeof rotina.statusPorDia === "object"
    ) {
        return rotina.statusPorDia[dia] || "pendente";
    }

    // Compatibilidade com rotinas antigas
    return rotina.status || "pendente";
}


function configurarDataAtual() {

    const hoje =
        new Date();


    const nomeDia =
        obterNomeDiaAtual();


    const dataFormatada =
        hoje.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "long"
            }
        );


    if (todayWeekday) {

        todayWeekday.textContent =
            nomeDia;

    }


    if (currentDate) {

        currentDate.textContent =
            `${nomeDia}, ${dataFormatada}`;

    }

}

// ============================================================
// ATUALIZAR DATAS DA SEMANA
// ============================================================

function atualizarDatasDaSemana() {

    const hoje = new Date();

    const diaDaSemana = hoje.getDay();

    // Domingo = 0
    // Segunda = 1
    // Terça = 2
    // Quarta = 3
    // Quinta = 4
    // Sexta = 5
    // Sábado = 6

    // Calcula a segunda-feira da semana atual
    const segunda = new Date(hoje);

    const diferenca =
        diaDaSemana === 0
            ? -6
            : 1 - diaDaSemana;

    segunda.setDate(
        hoje.getDate() + diferenca
    );


    const dias = [
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta"
    ];


    dias.forEach((dia, index) => {

        const data =
            new Date(segunda);

        data.setDate(
            segunda.getDate() + index
        );


        const elemento =
            document.querySelector(
                `[data-date-day="${dia}"]`
            );


        if (!elemento) return;


        const diaNumero =
            String(
                data.getDate()
            ).padStart(2, "0");


        const mes =
            data.toLocaleDateString(
                "pt-BR",
                {
                    month: "short"
                }
            )
            .replace(".", "")
            .toUpperCase();


        elemento.textContent =
            `${diaNumero} ${mes}`;

    });

}


// ============================================================
// DEMANDAS DO DIA
// ============================================================

function obterDemandasDoDia() {

    const diaAtual = obterDiaAtual();

return rotinas.filter((rotina) => {

    return obterDiasDaRotina(rotina)
        .includes(diaAtual);

});

}


// ============================================================
// RENDERIZAR DEMANDAS DO DIA
// ============================================================

function renderizarDemandasDoDia() {

    if (!todayDemands) return;


    const demandas =
        obterDemandasDoDia();


    todayDemands.innerHTML = "";


    if (demandas.length === 0) {

        todayDemands.innerHTML = `

            <div class="empty-state-card">

                <div class="empty-icon">
                    ✓
                </div>

                <h3>
                    Nenhuma demanda para hoje
                </h3>

                <p>
                    Não há rotinas programadas para este dia.
                </p>

            </div>

        `;

    }

    else {

        demandas.forEach(
            (rotina) => {

                todayDemands.appendChild(
                    criarCardDemanda(rotina)
                );

            }
        );

    }


    atualizarIndicadoresHoje(
        demandas
    );

}


// ============================================================
// CRIAR CARD DA DEMANDA
// ============================================================

function criarCardDemanda(rotina) {

    const card =
        document.createElement(
            "article"
        );


    const diaAtual = obterDiaAtual();
    const status = obterStatusDoDia(rotina, diaAtual);

    card.className =
        `demand-card ${status}`;


    card.dataset.routineId =
        rotina.id;


    const statusTexto =
        status === "feito"
            ? "Feito"
            : "Pendente";


    const statusIcon =
        status === "feito"
            ? "✓"
            : "◷";


    const prioridadeTexto =
        formatarPrioridade(
            rotina.prioridade
        );


    card.innerHTML = `

        <div class="demand-card-header">

            <div class="demand-status-icon">
                ${statusIcon}
            </div>

            <span class="status-badge ${status}">
                ${statusTexto}
            </span>

        </div>


        <div class="demand-card-body">

            <h3>
                ${escapeHTML(
                    rotina.descricao
                )}
            </h3>

            <p>
                ${escapeHTML(
                    rotina.periodo
                )}
            </p>

        </div>


        <div class="demand-card-footer">

            <span
                class="priority-indicator ${rotina.prioridade}"
            >
                ${prioridadeTexto}
            </span>

            <span class="demand-action">
                Ver detalhes →
            </span>

        </div>

    `;


card.addEventListener(
    "click",
    () => {

        abrirDetalhesRotina(
            rotina.id,
            obterDiaAtual()
        );

    }
);


    return card;

}


// ============================================================
// INDICADORES DE HOJE
// ============================================================

function atualizarIndicadoresHoje(demandas) {

    const total =
        demandas.length;

    const diaAtual =
        obterDiaAtual();

    const concluidas =
        demandas.filter(
            (item) =>
                obterStatusDoDia(item, diaAtual) === "feito"
        ).length;

    const pendentes =
        total - concluidas;


    if (todayTotal) {

        todayTotal.textContent =
            total;

    }


    if (todayCompleted) {

        todayCompleted.textContent =
            concluidas;

    }


    if (todayPending) {

        todayPending.textContent =
            pendentes;

    }

}


// ============================================================
// SEMANA
// ============================================================

function renderizarSemana() {

    if (!weeklyBoard) return;


    const colunas =
        weeklyBoard.querySelectorAll(
            ".day-column"
        );


    colunas.forEach(
        (coluna) => {

            const dia =
                coluna.dataset.day;


            if (!dia) return;


            const area =
                coluna.querySelector(
                    ".day-demands"
                );


            const contador =
                coluna.querySelector(
                    ".day-count"
                );


            if (!area) return;


            area.innerHTML = "";


            const demandas =
                rotinas.filter(
                    (rotina) => {

return obterDiasDaRotina(rotina)
    .includes(dia);

                    }
                );


            if (contador) {

                contador.textContent =
                    demandas.length;

            }


            if (
                demandas.length === 0
            ) {

                area.innerHTML = `

                    <div class="empty-state">
                        Nenhuma demanda
                    </div>

                `;


                return;

            }


            demandas.forEach(
                (rotina) => {

                    area.appendChild(
                        criarCardSemanal(
                            rotina,
                            dia
                        )
                    );

                }
            );

        }
    );


    destacarDiaAtual();

}


// ============================================================
// CARD SEMANAL
// ============================================================

function criarCardSemanal(rotina, dia) {

    const card =
        document.createElement(
            "article"
        );

    const status = obterStatusDoDia(rotina, dia);

    card.className =
        `weekly-demand-card ${status}`;

    card.dataset.routineId =
        rotina.id;

    const statusTexto =
        status === "feito"
            ? "Feito"
            : "Pendente";


    card.innerHTML = `

        <div class="weekly-card-top">

            <span
                class="weekly-status-dot ${status}"
            ></span>

            <span
                class="status-badge ${status}"
            >
                ${statusTexto}
            </span>

        </div>


        <h3>
            ${escapeHTML(
                rotina.descricao
            )}
        </h3>

    `;


card.addEventListener(
    "click",
    () => {

        abrirDetalhesRotina(
            rotina.id,
            dia
        );

    }
);


    return card;

}


// ============================================================
// DESTACAR DIA ATUAL
// ============================================================

function destacarDiaAtual() {

    const diaAtual =
        obterDiaAtual();


    const colunas =
        document.querySelectorAll(
            ".day-column"
        );


    colunas.forEach(
        (coluna) => {

            coluna.classList.toggle(
                "current-day",
                coluna.dataset.day ===
                diaAtual
            );

        }
    );

}


// ============================================================
// PROGRESSO DA SEMANA
// ============================================================

function atualizarProgressoSemana() {

    const diasDaSemana = [
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta"
    ];


    let totalSemana = 0;
    let concluidasSemana = 0;


    // ========================================================
    // CALCULAR TOTAL E CONCLUÍDAS
    // ========================================================

    diasDaSemana.forEach((dia) => {

        const demandasDoDia =
            rotinas.filter((rotina) =>
                obterDiasDaRotina(rotina).includes(dia)
            );

        const totalDoDia =
            demandasDoDia.length;

        const concluidasDoDia =
            demandasDoDia.filter((rotina) =>
                obterStatusDoDia(rotina, dia) === "feito"
            ).length;


        totalSemana += totalDoDia;

        concluidasSemana += concluidasDoDia;


        // ====================================================
        // ATUALIZAR INDICADOR DO DIA
        // ====================================================

        const indicador =
            document.querySelector(
                `[data-progress-day="${dia}"]`
            );


        if (indicador) {

            indicador.textContent =
                `${concluidasDoDia}/${totalDoDia}`;

        }

    });


    // ========================================================
    // CALCULAR PORCENTAGEM
    // ========================================================

    let percentual = 0;


    if (totalSemana > 0) {

        percentual =
            Math.round(
                (concluidasSemana / totalSemana) * 100
            );

    }


    // ========================================================
    // ATUALIZAR RESUMO
    // ========================================================

    if (weekCompleted) {

        weekCompleted.textContent =
            concluidasSemana;

    }


    if (weekTotal) {

        weekTotal.textContent =
            totalSemana;

    }


    if (weekProgressPercent) {

        weekProgressPercent.textContent =
            `${percentual}%`;

    }


    // ========================================================
    // ATUALIZAR BARRA
    // ========================================================

    if (weekProgressFill) {

        weekProgressFill.style.width =
            `${percentual}%`;

    }

}


// ============================================================
// MODAL DE DETALHES
// ============================================================

function abrirDetalhesRotina(id, dia) {

    const rotina =
        rotinas.find(
            (item) =>
                item.id === id
        );


    if (!rotina) return;


    rotinaSelecionada =
        rotina;

    diaRotinaSelecionada =
    dia;


    const title =
        document.getElementById(
            "demandModalTitle"
        );


    const subtitle =
        document.getElementById(
            "demandModalSubtitle"
        );


    const description =
        document.getElementById(
            "detailDescription"
        );


    const day =
        document.getElementById(
            "detailDay"
        );


    const period =
        document.getElementById(
            "detailPeriod"
        );


    const priority =
        document.getElementById(
            "detailPriority"
        );


    const notes =
        document.getElementById(
            "detailNotes"
        );


    const procedure =
        document.getElementById(
            "detailProcedure"
        );


    const toggleStatus =
        document.getElementById(
            "btnToggleStatus"
        );


    if (title) {

        title.textContent =
            rotina.descricao;

    }


    if (subtitle) {

subtitle.textContent =
    `${formatarDias(obterDiasDaRotina(rotina))} • ${rotina.periodo}`;

    }


    if (description) {

        description.textContent =
            rotina.descricao;

    }


    if (day) {
        day.textContent =
            formatarDias(
                obterDiasDaRotina(rotina)
            );
    }


    if (period) {

        period.textContent =
            rotina.periodo;

    }


    if (priority) {

        priority.textContent =
            formatarPrioridade(
                rotina.prioridade
            );


        priority.className =
            `priority-badge ${rotina.prioridade}`;

    }


    if (notes) {

        notes.textContent =
            rotina.observacoes?.trim()
                ? rotina.observacoes
                : "Nenhuma observação cadastrada.";

    }


    if (procedure) {

        renderizarProcedimento(
            rotina.procedimento,
            procedure
        );

    }


if (toggleStatus) {

    const statusAtual =
        obterStatusDoDia(
            rotina,
            diaRotinaSelecionada
        );

    toggleStatus.textContent =
        statusAtual === "feito"
            ? "Marcar como pendente"
            : "Marcar como concluída";

    toggleStatus.disabled =
        !diaRotinaSelecionada;

}


    abrirModal(
        demandModal
    );

}

function formatarDias(dias) {

    const nomes = {
        segunda: "Segunda-feira",
        terca: "Terça-feira",
        quarta: "Quarta-feira",
        quinta: "Quinta-feira",
        sexta: "Sexta-feira"
    };

    return dias
        .map((dia) => nomes[dia] || dia)
        .join(" • ");
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


    procedimento.forEach(
        (passo, index) => {

            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                "procedure-step";


            const numero =
                String(
                    index + 1
                ).padStart(
                    2,
                    "0"
                );


            elemento.innerHTML = `

                <span class="step-number">
                    ${numero}
                </span>

                <span>
                    ${escapeHTML(
                        passo
                    )}
                </span>

            `;


            container.appendChild(
                elemento
            );

        }
    );

}


// ============================================================
// BOTÕES DA DEMANDA
// ============================================================

function configurarBotoesRotina() {

    const botaoStatus =
        document.getElementById(
            "btnToggleStatus"
        );


    const botaoEditar =
        document.getElementById(
            "btnEditDemand"
        );


    const botaoExcluir =
        document.getElementById(
            "btnDeleteDemand"
        );


    // ========================================================
    // STATUS
    // ========================================================

    if (botaoStatus) {

        botaoStatus.addEventListener(
            "click",
            async () => {

                if (!rotinaSelecionada)
                    return;


                const dia = diaRotinaSelecionada;

                if (!dia) {
                    mostrarToast(
                        "Abra a rotina pela Semana ou pela tela Início para alterar o status do dia."
                    );
                    return;
                }

                const statusAtual =
                    obterStatusDoDia(
                        rotinaSelecionada,
                        dia
                    );

                const novoStatus =
                    statusAtual === "feito"
                        ? "pendente"
                        : "feito";

                try {

                    await atualizarStatusNoFirebase(
                        rotinaSelecionada,
                        dia,
                        novoStatus
                    );

                    fecharModal(
                        demandModal
                    );

                    atualizarInterface();

                    mostrarToast(
                        novoStatus === "feito"
                            ? "Demanda concluída e salva."
                            : "Demanda voltou para pendente e foi salva."
                    );

                } catch (erro) {

                    const statusAnterior =
                        rotinaSelecionada.statusPorDia?.[dia] || "pendente";
                    rotinaSelecionada.statusPorDia =
                        prepararStatusPorDia(
                            rotinaSelecionada,
                            obterDiasDaRotina(rotinaSelecionada)
                        );
                    rotinaSelecionada.statusPorDia[dia] = statusAnterior;

                    console.error(
                        "Erro ao atualizar status no Firebase:",
                        erro
                    );

                    mostrarToast(
                        "Não foi possível salvar o status no Firebase."
                    );

                }

            }
        );

    }


    // ========================================================
    // EDITAR
    // ========================================================

    if (botaoEditar) {

        botaoEditar.addEventListener(
            "click",
            () => {

                if (!rotinaSelecionada)
                    return;


                modoEdicao = true;


                preencherFormularioEdicao(
                    rotinaSelecionada
                );


                fecharModal(
                    demandModal
                );


                abrirModal(
                    routineModal
                );

            }
        );

    }


    // ========================================================
    // EXCLUIR
    // ========================================================

    if (botaoExcluir) {

        botaoExcluir.addEventListener(
            "click",
            () => {

                if (!rotinaSelecionada)
                    return;


                abrirConfirmacaoExclusao();

            }
        );

    }


    // ========================================================
    // CONFIRMAR AÇÃO
    // ========================================================

    const botaoConfirmar =
        document.getElementById(
            "btnConfirmAction"
        );


    if (botaoConfirmar) {

        botaoConfirmar.addEventListener(
            "click",
            async () => {

                if (
                    acaoConfirmacao ===
                    "excluir"
                ) {

                    await excluirRotina();

                }

                else if (
                    acaoConfirmacao ===
                    "reiniciar-semana"
                ) {

                    await reiniciarSemana();

                }

            }
        );

    }

}


// ============================================================
// PREENCHER FORMULÁRIO DE EDIÇÃO
// ============================================================

function preencherFormularioEdicao(
    rotina
) {

    if (
        !routineForm ||
        !rotina
    ) return;


    const description =
        document.getElementById(
            "routineDescription"
        );


    const period =
        document.getElementById(
            "routinePeriod"
        );


    const procedure =
        document.getElementById(
            "routineProcedure"
        );


    const notes =
        document.getElementById(
            "routineNotes"
        );


    if (description) {

        description.value =
            rotina.descricao || "";

    }


const diasSelecionados =
    Array.isArray(rotina.dias)
        ? rotina.dias
        : rotina.dia
            ? [rotina.dia]
            : [];

document
    .querySelectorAll('input[name="days"]')
    .forEach((checkbox) => {

        checkbox.checked =
            diasSelecionados.includes(
                checkbox.value
            );

    });


    if (period) {

        period.value =
            rotina.periodo || "";

    }


    const prioridade =
        document.querySelector(
            `input[name="priority"][value="${rotina.prioridade}"]`
        );


    if (prioridade) {

        prioridade.checked =
            true;

    }


    if (procedure) {

        procedure.value =
            Array.isArray(
                rotina.procedimento
            )
                ? rotina.procedimento.join(
                    "\n"
                )
                : "";

    }


    if (notes) {

        notes.value =
            rotina.observacoes || "";

    }


    const titulo =
        document.getElementById(
            "routineModalTitle"
        );


    if (titulo) {

        titulo.textContent =
            "Editar Rotina";

    }


    const botaoSalvar =
        routineForm.querySelector(
            'button[type="submit"]'
        );


    if (botaoSalvar) {

        botaoSalvar.textContent =
            "Salvar alterações";

    }

}


// ============================================================
// CONFIRMAR EXCLUSÃO
// ============================================================

function abrirConfirmacaoExclusao() {

    if (!rotinaSelecionada)
        return;


    const mensagem =
        document.getElementById(
            "confirmMessage"
        );


    const botaoConfirmar =
        document.getElementById(
            "btnConfirmAction"
        );


    if (mensagem) {

        mensagem.textContent =
            `Deseja realmente excluir a demanda "${rotinaSelecionada.descricao}"?`;

    }


    acaoConfirmacao =
        "excluir";


    fecharModal(
        demandModal
    );


    abrirModal(
        confirmModal
    );


    if (botaoConfirmar) {

        botaoConfirmar.textContent =
            "Excluir demanda";

    }

}


// ============================================================
// EXCLUIR ROTINA
// ============================================================

async function excluirRotina() {

    if (!rotinaSelecionada)
        return;


    const id =
        rotinaSelecionada.id;


    try {

        await excluirRotinaDoFirebase(id);

        rotinas =
            rotinas.filter(
                (rotina) =>
                    rotina.id !== id
            );


        rotinaSelecionada =
            null;


        acaoConfirmacao =
            null;


        fecharModal(
            confirmModal
        );


        atualizarInterface();


        mostrarToast(
            "Demanda excluída do Firebase com sucesso."
        );

    } catch (erro) {

        console.error(
            "Erro ao excluir rotina do Firebase:",
            erro
        );

        mostrarToast(
            "Não foi possível excluir a rotina do Firebase."
        );

    }

}


// ============================================================
// FORMULÁRIO DE ROTINA
// ============================================================

function configurarFormularioRotina() {

    if (!routineForm) return;


    routineForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const formData =
                new FormData(
                    routineForm
                );


            const descricao =
                formData
                    .get("description")
                    ?.trim();


let dias =
    formData.getAll("days");

            if (dias.length === 0) {
                const diaLegado =
                    formData.get("day");

                if (diaLegado) {
                    dias = [diaLegado];
                }
            }

    if (dias.length === 0) {

    mostrarToast(
        "Selecione pelo menos um dia da semana."
    );

    return;
}


            const periodo =
                formData
                    .get("period")
                    ?.trim();


            const prioridade =
                formData.get(
                    "priority"
                );


            const procedimentoTexto =
                formData
                    .get("procedure")
                    ?.trim();


            const observacoes =
                formData
                    .get("notes")
                    ?.trim();


            const procedimento =
                procedimentoTexto
                    ? procedimentoTexto
                        .split("\n")
                        .map(
                            (linha) =>
                                linha.trim()
                        )
                        .filter(Boolean)
                    : [];


            // =================================================
            // EDIÇÃO
            // =================================================

            try {

                // =================================================
                // EDIÇÃO
                // =================================================

                if (
                    modoEdicao &&
                    rotinaSelecionada
                ) {

                    const rotinaAtualizada = {
                        ...rotinaSelecionada,
                        descricao,
                        dias,
                        periodo,
                        statusPorDia: prepararStatusPorDia(
                            rotinaSelecionada,
                            dias
                        ),
                        prioridade,
                        procedimento,
                        observacoes
                    };

                    await salvarRotinaNoFirebase(
                        rotinaAtualizada
                    );

                    Object.assign(
                        rotinaSelecionada,
                        rotinaAtualizada
                    );

                    mostrarToast(
                        "Demanda atualizada e salva no Firebase."
                    );

                }

                // =================================================
                // NOVA ROTINA
                // =================================================

                else {

const novaRotina = {

    id: gerarIdUnico(),

    descricao,

    dias,

    periodo,

    prioridade,

    status: "pendente",

    procedimento,

    observacoes
};

                    await salvarRotinaNoFirebase(
                        novaRotina
                    );

                    rotinas.push(
                        novaRotina
                    );

                    mostrarToast(
                        "Rotina cadastrada e salva no Firebase."
                    );

                }

            } catch (erro) {

                console.error(
                    "Erro ao salvar rotina no Firebase:",
                    erro
                );

                mostrarToast(
                    "Não foi possível salvar a rotina no Firebase."
                );

                return;

            }


            // =================================================
            // LIMPEZA
            // =================================================

            routineForm.reset();


            modoEdicao =
                false;


            rotinaSelecionada =
                null;


            const titulo =
                document.getElementById(
                    "routineModalTitle"
                );


            if (titulo) {

                titulo.textContent =
                    "Nova Rotina";

            }


            const botaoSalvar =
                routineForm.querySelector(
                    'button[type="submit"]'
                );


            if (botaoSalvar) {

                botaoSalvar.textContent =
                    "Salvar Rotina";

            }


            fecharModal(
                routineModal
            );


            atualizarInterface();

        }
    );

}


// ============================================================
// NOVA ROTINA
// ============================================================

function configurarBotoesNovaRotina() {

    const botao =
        document.getElementById(
            "btnNewRoutine"
        );


    if (botao) {

        botao.addEventListener(
            "click",
            () => {

                iniciarNovaRotina();

            }
        );

    }


    const botaoProcedimento =
        document.getElementById(
            "btnNewProcedure"
        );


    if (botaoProcedimento) {

        botaoProcedimento.addEventListener(
            "click",
            () => {

                iniciarNovaRotina();

            }
        );

    }

}


// ============================================================
// INICIAR NOVA ROTINA
// ============================================================

function iniciarNovaRotina() {

    modoEdicao =
        false;


    rotinaSelecionada =
        null;
    diaRotinaSelecionada =
        null;

    if (routineForm) {

        routineForm.reset();

    }


    const titulo =
        document.getElementById(
            "routineModalTitle"
        );


    if (titulo) {

        titulo.textContent =
            "Nova Rotina";

    }


    const botaoSalvar =
        routineForm?.querySelector(
            'button[type="submit"]'
        );


    if (botaoSalvar) {

        botaoSalvar.textContent =
            "Salvar Rotina";

    }


    abrirModal(
        routineModal
    );

}


// ============================================================
// REINICIAR SEMANA
// ============================================================

function configurarReiniciarSemana() {

    const botao =
        document.getElementById(
            "btnResetWeek"
        );


    if (!botao) return;


    botao.addEventListener(
        "click",
        () => {

            const mensagem =
                document.getElementById(
                    "confirmMessage"
                );

            const botaoConfirmar =
                document.getElementById(
                    "btnConfirmAction"
                );

            if (mensagem) {
                mensagem.textContent =
                    "Deseja reiniciar a semana? Todas as demandas serão marcadas como pendentes.";
            }

            acaoConfirmacao =
                "reiniciar-semana";

            if (botaoConfirmar) {
                botaoConfirmar.textContent =
                    "Reiniciar semana";
            }

            abrirModal(
                confirmModal
            );

        }
    );

}


async function reiniciarSemana() {

    try {

        await reiniciarSemanaNoFirebase();

        rotinas = rotinas.map(
            (rotina) => {
                const dias = obterDiasDaRotina(rotina);
                return {
                    ...rotina,
                    status: "pendente",
                    statusPorDia: normalizarStatusPorDia(
                        {},
                        dias,
                        "pendente"
                    )
                };
            }
        );

        fecharModal(
            confirmModal
        );

        acaoConfirmacao =
            null;

        atualizarInterface();

        mostrarToast(
            "Semana reiniciada. Todas as demandas estão pendentes."
        );

    } catch (erro) {

        console.error(
            "Erro ao reiniciar semana no Firebase:",
            erro
        );

        mostrarToast(
            "Não foi possível reiniciar a semana no Firebase."
        );

    }

}


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
            () => {

                fecharModal(
                    demandModal
                );

            }
        );

    }


    if (fecharRotina) {

        fecharRotina.addEventListener(
            "click",
            () => {

                fecharModal(
                    routineModal
                );

                resetarFormularioRotina();

            }
        );

    }


    if (cancelarRotina) {

        cancelarRotina.addEventListener(
            "click",
            () => {

                fecharModal(
                    routineModal
                );

                resetarFormularioRotina();

            }
        );

    }


    if (fecharConfirmacao) {

        fecharConfirmacao.addEventListener(
            "click",
            () => {

                fecharModal(
                    confirmModal
                );

                acaoConfirmacao =
                    null;

            }
        );

    }


    if (cancelarConfirmacao) {

        cancelarConfirmacao.addEventListener(
            "click",
            () => {

                fecharModal(
                    confirmModal
                );

                acaoConfirmacao =
                    null;

            }
        );

    }


    document.querySelectorAll(
        ".modal-overlay"
    ).forEach(
        (overlay) => {

            overlay.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target ===
                        overlay
                    ) {

                        fecharModal(
                            overlay
                        );

                        if (
                            overlay ===
                            routineModal
                        ) {

                            resetarFormularioRotina();

                        }

                    }

                }
            );

        }
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Escape"
            ) {

                fecharTodosModais();

            }

        }
    );

}


// ============================================================
// RESETAR FORMULÁRIO
// ============================================================

function resetarFormularioRotina() {

    modoEdicao =
        false;


    rotinaSelecionada =
        null;
    diaRotinaSelecionada =
        null;

    if (routineForm) {

        routineForm.reset();

    }


    const titulo =
        document.getElementById(
            "routineModalTitle"
        );


    if (titulo) {

        titulo.textContent =
            "Nova Rotina";

    }


    const botaoSalvar =
        routineForm?.querySelector(
            'button[type="submit"]'
        );


    if (botaoSalvar) {

        botaoSalvar.textContent =
            "Salvar Rotina";

    }

}


// ============================================================
// ABRIR MODAL
// ============================================================

function abrirModal(modal) {

    if (!modal) return;


    modal.classList.remove(
        "hidden"
    );


    document.body.classList.add(
        "modal-open"
    );

}


// ============================================================
// FECHAR MODAL
// ============================================================

function fecharModal(modal) {

    if (!modal) return;


    modal.classList.add(
        "hidden"
    );


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


// ============================================================
// FECHAR TODOS OS MODAIS
// ============================================================

function fecharTodosModais() {

    document.querySelectorAll(
        ".modal-overlay"
    ).forEach(
        (modal) => {

            modal.classList.add(
                "hidden"
            );

        }
    );


    document.body.classList.remove(
        "modal-open"
    );


    acaoConfirmacao =
        null;

}


// ============================================================
// RENDERIZAR PROCEDIMENTOS
// ============================================================

function renderizarProcedimentos() {

    const lista =
        document.getElementById(
            "procedureList"
        );


    if (!lista) return;


    lista.innerHTML = "";


    rotinas.forEach(
        (rotina) => {

            const card =
                document.createElement(
                    "article"
                );


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
                        ${formatarPrioridade(
                            rotina.prioridade
                        )}
                    </span>

                </div>


                <h3>
                    ${escapeHTML(
                        rotina.descricao
                    )}
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


            const botao =
                card.querySelector(
                    ".procedure-link"
                );


            if (botao) {

                botao.addEventListener(
                    "click",
                    () => {

                        abrirDetalhesRotina(
                            rotina.id,
                            null
                        );

                    }
                );

            }


            lista.appendChild(
                card
            );

        }
    );

}


// ============================================================
// ATUALIZAR INTERFACE
// ============================================================

function atualizarInterface() {

    configurarDataAtual();

    atualizarDatasDaSemana();

    renderizarDemandasDoDia();

    renderizarSemana();

    atualizarProgressoSemana();

    renderizarProcedimentos();

}


// ============================================================
// FORMATAÇÃO DE PRIORIDADE
// ============================================================

function formatarPrioridade(valor) {

    const prioridades = {

        alta:
            "Alta",

        media:
            "Média",

        baixa:
            "Baixa"

    };


    return prioridades[
        valor
    ] || valor;

}


// ============================================================
// FORMATAÇÃO DE DIA
// ============================================================

function formatarDia(valor) {

    const dias = {

        segunda:
            "Segunda-feira",

        terca:
            "Terça-feira",

        quarta:
            "Quarta-feira",

        quinta:
            "Quinta-feira",

        sexta:
            "Sexta-feira"

    };


    return dias[
        valor
    ] || valor;

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

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(valor)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

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
        document.createElement(
            "div"
        );


    toast.className =
        "toast";


    toast.textContent =
        mensagem;


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.classList.add(
                "show"
            );

        },
        10
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );


            setTimeout(
                () => {

                    toast.remove();

                },
                300
            );

        },
        3000
    );

}


// ============================================================
// SISTEMA CARREGADO
// ============================================================

console.log(
    "Agenda Compras V2 carregada corretamente."
);