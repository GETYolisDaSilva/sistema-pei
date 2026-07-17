// Funções pequenas usadas tanto pela tela do professor (app.js) quanto pelo
// painel da direção (direcao.js). Precisa ser carregado antes dos dois.

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : String(texto);
  return div.innerHTML;
}

function cartao(innerHtml) {
  const div = document.createElement('div');
  div.className = 'cartao';
  div.innerHTML = innerHtml;
  return div;
}

function aviso(tipo, mensagem) {
  return `<div class="aviso ${tipo}">${escapeHtml(mensagem)}</div>`;
}

function trilha(passos) {
  // passos: [{ rotulo, onClick (opcional; se ausente = passo atual/ativo) }]
  const div = document.createElement('div');
  div.className = 'trilha';
  div.innerHTML = passos.map((p, i) => {
    return p.onClick
      ? `<span class="passo" data-i="${i}">${escapeHtml(p.rotulo)}</span>`
      : `<span class="passo ativo">${escapeHtml(p.rotulo)}</span>`;
  }).join('<span class="sep">/</span>');
  div.querySelectorAll('.passo[data-i]').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = () => passos[Number(el.dataset.i)].onClick();
  });
  return div;
}
