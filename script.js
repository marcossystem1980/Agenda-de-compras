function selecionarGrupo(nomeDoGrupo) {
    // Captura a div de conteúdo principal
    const areaConteudo = document.getElementById('conteudo-dinamico');
    
    // Altera o HTML interno dessa div baseado no botão clicado
    areaConteudo.innerHTML = `
        <h2>Agenda: ${nomeDoGrupo}</h2>
        <p>A interface de compras e métricas para o grupo ${nomeDoGrupo} será carregada aqui.</p>
    `;
}
