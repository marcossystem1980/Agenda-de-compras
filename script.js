// Dados e Estado do Sistema
let empresaAtual = 'Zanol & Thomaz';
let agendamentos = [];

const classificacoes = [
    "CONVENIENCIA", "DERMOCOSMETICOS", "FRALDAS E LEITES", "GENERICOS", 
    "NOSSAS MARCAS", "PBM", "PERFUMARIA", "PERFUMES", "PROPAGADO", "SIMILARES", "SUPLEMENTO", "VAREJO"
];

// Preencher os Filtros Dinâmicos ao carregar a página
window.onload = function() {
    // Preencher Classificações
    const selectClass = document.getElementById('inputClassificacao');
    classificacoes.forEach(classe => {
        let opt = document.createElement('option');
        opt.value = classe;
        opt.innerHTML = classe;
        selectClass.appendChild(opt);
    });

    // Preencher Previsão de 1 a 45 dias
    const selectPrev = document.getElementById('inputPrevisao');
    for(let i = 1; i <= 45; i++) {
        let opt = document.createElement('option');
        opt.value = i + " Dias";
        opt.innerHTML = i + " Dias";
        selectPrev.appendChild(opt);
    }
};

// Lógica de Navegação entre Abas
function mudarAba(nomeEmpresa, btnElement) {
    empresaAtual = nomeEmpresa;
    
    // Atualizar estilo visual dos botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    
    limparFormulario();
    renderizarTabela();
}

// Salvar (Adicionar ou Editar)
function salvarAgendamento() {
    const index = document.getElementById('editIndex').value;
    const data = document.getElementById('inputData').value;
    const classificacao = document.getElementById('inputClassificacao').value;
    const fornecedor = document.getElementById('inputFornecedor').value.toUpperCase();
    const previsao = document.getElementById('inputPrevisao').value;
    const status = document.getElementById('inputStatus').value;

    if(!data || !classificacao || !fornecedor || !previsao) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    // Formatar Data para BR
    const dataParts = data.split('-');
    const dataFormatada = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;

    const novoAgendamento = { empresa: empresaAtual, dataOrig: data, data: dataFormatada, classificacao, fornecedor, previsao, status };

    if (index == -1) {
        agendamentos.push(novoAgendamento);
    } else {
        agendamentos[index] = novoAgendamento;
        document.getElementById('editIndex').value = -1;
    }

    limparFormulario();
    renderizarTabela();
}

// Excluir Linha
function excluirAgendamento(index) {
    if(confirm("Tem certeza que deseja remover este agendamento?")) {
        agendamentos.splice(index, 1);
        renderizarTabela();
    }
}

// Editar Linha
function editarAgendamento(index) {
    const item = agendamentos[index];
    document.getElementById('inputData').value = item.dataOrig;
    document.getElementById('inputClassificacao').value = item.classificacao;
    document.getElementById('inputFornecedor').value = item.fornecedor;
    document.getElementById('inputPrevisao').value = item.previsao;
    document.getElementById('inputStatus').value = item.status;
    
    document.getElementById('editIndex').value = index; 
}

// Renderizar Tabela
function renderizarTabela() {
    const corpo = document.getElementById('tabelaCorpo');
    corpo.innerHTML = ''; 

    agendamentos.forEach((item, index) => {
        if(item.empresa === empresaAtual) {
            
            let classeFlag = '';
            if(item.status === 'AGENDADO') classeFlag = 'agendado';
            if(item.status === 'EXECUTADO') classeFlag = 'executado';
            if(item.status === 'EXECUTADO PARCIALMENTE') classeFlag = 'parcial';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.data}</td>
                <td>${item.classificacao}</td>
                <td>${item.fornecedor}</td>
                <td>${item.previsao}</td>
                <td>${item.status}</td>
                <td><span class="flag ${classeFlag}">${item.status}</span></td>
                <td>
                    <button class="btn-action btn-edit" onclick="editarAgendamento(${index})">Editar</button>
                    <button class="btn-action btn-delete" onclick="excluirAgendamento(${index})">Remover</button>
                </td>
            `;
            corpo.appendChild(tr);
        }
    });
}

// Limpar Formulário
function limparFormulario() {
    document.getElementById('inputData').value = '';
    document.getElementById('inputClassificacao').value = '';
    document.getElementById('inputFornecedor').value = '';
    document.getElementById('inputPrevisao').value = '';
    document.getElementById('inputStatus').value = 'AGENDADO';
}
