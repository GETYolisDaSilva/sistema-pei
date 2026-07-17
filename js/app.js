// ---------------------------------------------------------------------------
// Estado geral da aplicação (perdido ao fechar a aba — não usamos armazenamento
// permanente no navegador por segurança, já que o computador pode ser
// compartilhado entre professores).
// ---------------------------------------------------------------------------
const estado = {
  professor: null,      // { idProfessor, nome, categoria }
  anoLetivo: CONFIG.ANO_LETIVO_ATUAL,
  bimestre: null,
  turma: null,
  disciplina: null,
  aluno: null,           // { idAluno, nome }
  vinculos: null,        // resultado de getVinculosProfessor
};

const app = document.getElementById('app');
const areaSessao = document.getElementById('areaSessao');

function renderSessao() {
  if (!estado.professor) { areaSessao.innerHTML = ''; return; }
  areaSessao.innerHTML = `
    ${escapeHtml(estado.professor.nome)} &middot; ${escapeHtml(estado.professor.categoria)}
    <button class="sair" id="btnSair">Sair</button>
  `;
  document.getElementById('btnSair').onclick = sair;
}

function sair() {
  Object.assign(estado, { professor: null, bimestre: null, turma: null, disciplina: null, aluno: null, vinculos: null });
  renderSessao();
  renderLogin();
}


// ---------------------------------------------------------------------------
// TELA 1 — LOGIN
// ---------------------------------------------------------------------------
async function renderLogin() {
  app.innerHTML = '<p class="carregando">Carregando lista de professores...</p>';
  const resp = await chamarApi('listarProfessores', {});
  if (!resp.ok) { app.innerHTML = aviso('erro', resp.erro || 'Não foi possível carregar os professores.'); return; }

  const opcoes = resp.professores
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(p => `<option value="${escapeHtml(p.idProfessor)}">${escapeHtml(p.nome)}</option>`)
    .join('');

  app.innerHTML = '';
  app.appendChild(cartao(`
    <h1 class="titulo-pagina">Entrar</h1>
    <p class="subtitulo">Selecione seu nome e digite a senha da escola.</p>
    <label class="campo">
      <span class="rotulo">Professor(a)</span>
      <select id="selProfessor">
        <option value="">Selecione...</option>
        ${opcoes}
      </select>
    </label>
    <label class="campo">
      <span class="rotulo">Senha</span>
      <input type="password" id="inpSenha" autocomplete="current-password">
    </label>
    <div id="areaErroLogin"></div>
    <div class="acoes-rodape">
      <button class="botao-primario" id="btnEntrar">Entrar</button>
    </div>
    <p class="subtitulo" style="margin-top:24px; font-size:0.8rem;">
      É da direção? <a href="direcao.html">Acessar o painel da direção</a>.
    </p>
  `));

  document.getElementById('btnEntrar').onclick = async () => {
    const idProfessor = document.getElementById('selProfessor').value;
    const senha = document.getElementById('inpSenha').value;
    const areaErro = document.getElementById('areaErroLogin');
    if (!idProfessor || !senha) { areaErro.innerHTML = aviso('erro', 'Selecione seu nome e digite a senha.'); return; }
    const nomeProfessor = resp.professores.find(p => p.idProfessor === idProfessor).nome;
    const login = await chamarApi('loginProfessor', { nomeProfessor, senha });
    if (!login.ok) { areaErro.innerHTML = aviso('erro', login.erro); return; }
    estado.professor = login.professor;
    renderSessao();
    renderBimestre();
  };
}

// ---------------------------------------------------------------------------
// TELA 2 — ESCOLHER BIMESTRE
// ---------------------------------------------------------------------------
function renderBimestre() {
  app.innerHTML = '';
  app.appendChild(trilha([{ rotulo: 'Bimestre' }]));
  const botoes = CONFIG.BIMESTRES.map(b => `
    <button class="botao-opcao" data-b="${b}">
      <span class="rotulo-pequeno">COC ${b}</span>
      ${b}º Bimestre
    </button>
  `).join('');
  app.appendChild(cartao(`
    <h1 class="titulo-pagina">Qual bimestre?</h1>
    <p class="subtitulo">Ano letivo ${estado.anoLetivo}. O PEI e a avaliação mudam a cada bimestre.</p>
    <div class="grade-botoes">${botoes}</div>
  `));
  app.querySelectorAll('[data-b]').forEach(btn => {
    btn.onclick = () => { estado.bimestre = Number(btn.dataset.b); renderTurmas(); };
  });
}

// ---------------------------------------------------------------------------
// TELA 3 — TURMAS DO PROFESSOR (ou lista direta de alunos, no caso da SRM)
// ---------------------------------------------------------------------------
async function renderTurmas() {
  app.innerHTML = '<p class="carregando">Carregando suas turmas...</p>';
  const resp = await chamarApi('getVinculosProfessor', { idProfessor: estado.professor.idProfessor, anoLetivo: estado.anoLetivo });
  if (!resp.ok) { app.innerHTML = aviso('erro', resp.dados && resp.dados.mensagem || 'Erro ao buscar turmas.'); return; }
  estado.vinculos = resp.dados;

  if (resp.dados.tipo === 'sala_recursos') {
    estado.disciplina = 'Sala de Recursos (SRM)';
    return renderAlunosSRM(resp.dados.alunos);
  }

  app.innerHTML = '';
  app.appendChild(trilha([
    { rotulo: `${estado.bimestre}º Bimestre`, onClick: renderBimestre },
    { rotulo: 'Turmas' }
  ]));

  if (!resp.dados.turmas.length) {
    app.appendChild(cartao(aviso('info', 'Nenhuma turma vinculada ao seu nome ainda. Procure a direção.')));
    return;
  }

  const cartoesTurma = resp.dados.turmas.map(t => `
    <div class="cartao" data-turma="${escapeHtml(t.turma)}">
      <h1 class="titulo-pagina" style="font-size:1.2rem;">Turma ${escapeHtml(t.turma)}</h1>
      <div class="grade-botoes">
        ${t.disciplinas.map(d => `<button class="botao-opcao" data-turma="${escapeHtml(t.turma)}" data-disc="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join('')}
      </div>
    </div>
  `).join('');
  app.insertAdjacentHTML('beforeend', cartoesTurma);

  app.querySelectorAll('button[data-disc]').forEach(btn => {
    btn.onclick = () => {
      estado.turma = btn.dataset.turma;
      estado.disciplina = btn.dataset.disc;
      renderAlunos();
    };
  });
}

// ---------------------------------------------------------------------------
// TELA 4 — ALUNOS DA TURMA (fluxo comum)
// ---------------------------------------------------------------------------
async function renderAlunos() {
  app.innerHTML = '<p class="carregando">Carregando alunos...</p>';
  const resp = await chamarApi('getAlunosDaTurma', { turma: estado.turma });
  if (!resp.ok) { app.innerHTML = aviso('erro', 'Erro ao buscar alunos.'); return; }
  montarTelaAlunos(resp.alunos, `Turma ${estado.turma} · ${estado.disciplina}`, renderTurmas);
}

// ---------------------------------------------------------------------------
// TELA 4b — ALUNOS DA SALA DE RECURSOS (fluxo do Brenno)
// ---------------------------------------------------------------------------
async function renderAlunosSRM(ids) {
  app.innerHTML = '<p class="carregando">Carregando seus alunos...</p>';
  const resp = await chamarApi('getAlunosPorIds', { ids });
  if (!resp.ok) { app.innerHTML = aviso('erro', 'Erro ao buscar alunos.'); return; }
  montarTelaAlunos(resp.alunos, 'Sala de Recursos', renderBimestre);
}

function montarTelaAlunos(alunos, rotuloTrilha, voltarPara) {
  app.innerHTML = '';
  app.appendChild(trilha([
    { rotulo: `${estado.bimestre}º Bimestre`, onClick: renderBimestre },
    { rotulo: rotuloTrilha, onClick: voltarPara },
    { rotulo: 'Alunos' }
  ]));
  if (!alunos.length) {
    app.appendChild(cartao(aviso('info', 'Nenhum aluno incluído cadastrado aqui ainda.')));
    return;
  }
  const botoes = alunos.map(a => `<button class="botao-opcao" data-id="${escapeHtml(a.idAluno)}" data-nome="${escapeHtml(a.nome)}">${escapeHtml(a.nome)}</button>`).join('');
  app.appendChild(cartao(`
    <h1 class="titulo-pagina">Selecione o aluno</h1>
    <div class="grade-botoes">${botoes}</div>
  `));
  app.querySelectorAll('button[data-id]').forEach(btn => {
    btn.onclick = () => {
      estado.aluno = { idAluno: btn.dataset.id, nome: btn.dataset.nome };
      renderMenuAluno();
    };
  });
}

// ---------------------------------------------------------------------------
// TELA 5 — MENU DO ALUNO (Preencher PEI / Avaliar PEI)
// ---------------------------------------------------------------------------
function renderMenuAluno() {
  app.innerHTML = '';
  app.appendChild(trilha([
    { rotulo: `${estado.bimestre}º Bimestre`, onClick: renderBimestre },
    { rotulo: estado.turma ? `Turma ${estado.turma}` : 'Sala de Recursos', onClick: estado.turma ? renderTurmas : renderBimestre },
    { rotulo: 'Alunos', onClick: estado.turma ? renderAlunos : () => renderAlunosSRM(estado.vinculos.alunos) },
    { rotulo: estado.aluno.nome }
  ]));
  app.appendChild(cartao(`
    <h1 class="titulo-pagina">${escapeHtml(estado.aluno.nome)}</h1>
    <p class="subtitulo">${escapeHtml(estado.disciplina)} &middot; ${estado.bimestre}º Bimestre</p>
    <div class="grade-botoes">
      <button class="botao-opcao" id="btnPei"><span class="rotulo-pequeno">Planejamento</span>Preencher PEI</button>
      <button class="botao-opcao" id="btnAval"><span class="rotulo-pequeno">Resultado</span>Avaliar o PEI</button>
    </div>
  `));
  document.getElementById('btnPei').onclick = renderPei;
  document.getElementById('btnAval').onclick = renderAvaliacaoTela;
}

// ---------------------------------------------------------------------------
// TELA 6 — FORMULÁRIO DO PEI
// ---------------------------------------------------------------------------
function htmlCabecalho(c) {
  const itens = [
    ['Nome completo', c.nomeCompleto, true],
    ['Cód. Aluno', c.codAlunoOficial || '(pendente)'],
    ['Nascimento', c.dataNascimento],
    ['Filiação 1', c.filiacao1],
    ['Filiação 2', c.filiacao2 || '-'],
    ['Unidade escolar', c.unidadeEscolar],
    ['Ano letivo', c.anoLetivo],
    ['Ano escolar', c.anoEscolar],
    ['Turma', c.turma],
    ['Disciplina', c.disciplina],
    [c.coc, '']
  ];
  return `<div class="cabecalho-aluno">` + itens.filter(i => i[1] !== '').map(([rotulo, valor, destaque]) => `
    <div class="item ${destaque ? 'destaque' : ''}">
      <div class="rotulo">${escapeHtml(rotulo)}</div>
      <div class="valor">${escapeHtml(valor)}</div>
    </div>
  `).join('') + `</div>`;
}

function linhaHabilidadeHtml(h, idx, grupamentoPadrao, bimestrePadrao) {
  h = h || { eixo: '', habilidade: '', grupamento: grupamentoPadrao, bimestre: bimestrePadrao };
  return `
    <div class="linha-habilidade" data-idx="${idx}">
      <button type="button" class="remover" data-remover="${idx}">remover</button>
      <div class="grade-2">
        <label class="campo"><span class="rotulo">Eixo</span><input type="text" data-campo="eixo" value="${escapeHtml(h.eixo)}"></label>
        <label class="campo"><span class="rotulo">Habilidade</span><textarea data-campo="habilidade">${escapeHtml(h.habilidade)}</textarea></label>
      </div>
      <span class="badge">Grupamento: ${escapeHtml(h.grupamento)}</span>
      <span class="badge">Bimestre: ${escapeHtml(h.bimestre)}</span>
    </div>
  `;
}

async function renderPei() {
  app.innerHTML = '<p class="carregando">Carregando PEI...</p>';
  const resp = await chamarApi('getPei', {
    idAluno: estado.aluno.idAluno, idProfessor: estado.professor.idProfessor,
    disciplina: estado.disciplina, bimestre: estado.bimestre, anoLetivo: estado.anoLetivo
  });
  if (!resp.ok) { app.innerHTML = aviso('erro', resp.erro); return; }

  const pei = resp.pei || { objetivos: '', estrategias: '', recursosEspecificos: '', resultadoEsperado: '', dataPreenchimento: '' };
  let habilidades = resp.habilidades.length ? resp.habilidades.slice() : [null, null];

  app.innerHTML = '';
  app.appendChild(trilha([
    { rotulo: `${estado.bimestre}º Bimestre`, onClick: renderBimestre },
    { rotulo: estado.aluno.nome, onClick: renderMenuAluno },
    { rotulo: 'PEI' }
  ]));

  const card = document.createElement('div');
  card.className = 'cartao';
  card.innerHTML = `
    ${htmlCabecalho(resp.cabecalho)}
    ${resp.pei && resp.pei.status === 'Feito na Prefeitura' ? aviso('info', 'Este PEI está marcado pela direção como preenchido na plataforma da prefeitura.') : ''}
    <div id="areaMensagemPei"></div>

    <div class="secao-formulario" data-numero="1">
      <h3>Planejamento educacional — Objetivos</h3>
      <label class="campo"><textarea id="campoObjetivos" placeholder="Descreva os objetivos educacionais planejados para este bimestre...">${escapeHtml(pei.objetivos)}</textarea></label>
    </div>

    <div class="secao-formulario" data-numero="2">
      <h3>Habilidades</h3>
      <div id="listaHabilidades"></div>
      <button type="button" class="botao-secundario" id="btnAddHabilidade">+ Adicionar habilidade</button>
    </div>

    <div class="secao-formulario" data-numero="3">
      <h3>Estratégias</h3>
      <label class="campo"><textarea id="campoEstrategias" placeholder="Quais estratégias serão usadas para alcançar os objetivos...">${escapeHtml(pei.estrategias)}</textarea></label>
    </div>

    <div class="secao-formulario" data-numero="4">
      <h3>Recursos específicos</h3>
      <label class="campo"><textarea id="campoRecursos" placeholder="Recursos e materiais de apoio necessários...">${escapeHtml(pei.recursosEspecificos)}</textarea></label>
    </div>

    <div class="secao-formulario" data-numero="5">
      <h3>Resultado esperado (a ser avaliado)</h3>
      <label class="campo"><textarea id="campoResultado" placeholder="O que se espera que o aluno alcance...">${escapeHtml(pei.resultadoEsperado)}</textarea></label>
    </div>

    <div class="secao-formulario" data-numero="6">
      <h3>Data</h3>
      <label class="campo"><input type="text" id="campoData" placeholder="DD/MM/AAAA" value="${escapeHtml(pei.dataPreenchimento)}"></label>
    </div>

    <div class="acoes-rodape sem-impressao">
      <button class="botao-secundario" id="btnImprimirPei">Imprimir</button>
      <button class="botao-primario" id="btnSalvarPei">Salvar PEI</button>
    </div>
  `;
  app.appendChild(card);

  function redesenharHabilidades() {
    const cont = document.getElementById('listaHabilidades');
    cont.innerHTML = habilidades.map((h, i) => linhaHabilidadeHtml(h, i, resp.cabecalho.anoEscolar, estado.bimestre)).join('');
    cont.querySelectorAll('[data-remover]').forEach(btn => {
      btn.onclick = () => { habilidades.splice(Number(btn.dataset.remover), 1); redesenharHabilidades(); };
    });
  }
  redesenharHabilidades();

  document.getElementById('btnAddHabilidade').onclick = () => { habilidades.push(null); redesenharHabilidades(); };
  document.getElementById('btnImprimirPei').onclick = () => window.print();

  document.getElementById('btnSalvarPei').onclick = async () => {
    const linhas = Array.from(document.querySelectorAll('#listaHabilidades .linha-habilidade')).map(el => ({
      eixo: el.querySelector('[data-campo="eixo"]').value,
      habilidade: el.querySelector('[data-campo="habilidade"]').value,
      grupamento: resp.cabecalho.anoEscolar,
      bimestre: estado.bimestre
    })).filter(h => h.eixo || h.habilidade);

    const payload = {
      idAluno: estado.aluno.idAluno, idProfessor: estado.professor.idProfessor,
      disciplina: estado.disciplina, bimestre: estado.bimestre, anoLetivo: estado.anoLetivo,
      objetivos: document.getElementById('campoObjetivos').value,
      estrategias: document.getElementById('campoEstrategias').value,
      recursosEspecificos: document.getElementById('campoRecursos').value,
      resultadoEsperado: document.getElementById('campoResultado').value,
      dataPreenchimento: document.getElementById('campoData').value,
      habilidades: linhas
    };
    const areaMsg = document.getElementById('areaMensagemPei');
    areaMsg.innerHTML = '<p class="carregando">Salvando...</p>';
    const salvo = await chamarApi('salvarPei', payload);
    areaMsg.innerHTML = salvo.ok ? aviso('sucesso', 'PEI salvo com sucesso.') : aviso('erro', salvo.erro || 'Erro ao salvar.');
  };
}

// ---------------------------------------------------------------------------
// TELA 7 — FORMULÁRIO DE AVALIAÇÃO DO PEI (com herança das habilidades)
// ---------------------------------------------------------------------------
async function renderAvaliacaoTela() {
  app.innerHTML = '<p class="carregando">Carregando avaliação...</p>';
  const resp = await chamarApi('getAvaliacao', {
    idAluno: estado.aluno.idAluno, idProfessor: estado.professor.idProfessor,
    disciplina: estado.disciplina, bimestre: estado.bimestre, anoLetivo: estado.anoLetivo
  });

  app.innerHTML = '';
  app.appendChild(trilha([
    { rotulo: `${estado.bimestre}º Bimestre`, onClick: renderBimestre },
    { rotulo: estado.aluno.nome, onClick: renderMenuAluno },
    { rotulo: 'Avaliação do PEI' }
  ]));

  if (!resp.ok) {
    app.appendChild(cartao(aviso('erro', resp.erro) + '<div class="acoes-rodape"><button class="botao-secundario" id="btnVoltarPei">Ir preencher o PEI</button></div>'));
    document.getElementById('btnVoltarPei').onclick = renderPei;
    return;
  }

  const av = resp.avaliacao || { instrumentosUtilizados: '', relatorioFinal: '', nota: '', conceitoGlobal: '', dataPreenchimento: '' };

  const card = document.createElement('div');
  card.className = 'cartao';
  card.innerHTML = `
    ${htmlCabecalho(resp.cabecalho)}
    ${resp.avaliacao && resp.avaliacao.status === 'Feito na Prefeitura' ? aviso('info', 'Esta avaliação está marcada pela direção como preenchida na plataforma da prefeitura.') : ''}
    <div id="areaMensagemAval"></div>

    <div class="secao-formulario" data-numero="1">
      <h3>Instrumentos utilizados para avaliar</h3>
      <label class="campo"><textarea id="campoInstrumentos" placeholder="Como o aluno foi avaliado...">${escapeHtml(av.instrumentosUtilizados)}</textarea></label>
    </div>

    <div class="secao-formulario" data-numero="2">
      <h3>Habilidades planejadas</h3>
      <div id="listaHabilidadesAval">
        ${resp.habilidades.map((h, i) => `
          <div class="habilidade-planejada-aval" data-idh="${escapeHtml(h.idHabilidade)}">
            <div class="texto-planejado">${escapeHtml(h.habilidadePlanejada)}</div>
            <label class="campo"><span class="rotulo">Justificativa da avaliação</span><textarea data-campo="justificativa">${escapeHtml(h.justificativa)}</textarea></label>
            <label class="campo"><span class="rotulo">Situação</span>
              <select data-campo="status">
                <option value="">Selecione...</option>
                ${CONFIG.STATUS_HABILIDADE.map(s => `<option value="${s}" ${s === h.statusHabilidade ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </label>
          </div>
        `).join('') || aviso('info', 'O PEI deste bimestre não tem habilidades cadastradas.')}
      </div>
    </div>

    <div class="secao-formulario" data-numero="3">
      <h3>Relatório final</h3>
      <label class="campo"><textarea id="campoRelatorio" placeholder="Relatório final sobre o desempenho do aluno...">${escapeHtml(av.relatorioFinal)}</textarea></label>
    </div>

    <div class="secao-formulario" data-numero="4">
      <h3>Nota</h3>
      <label class="campo"><input type="number" id="campoNota" min="0" max="10" step="0.5" value="${escapeHtml(av.nota)}"></label>
    </div>

    <div class="secao-formulario" data-numero="5">
      <h3>Conceito global</h3>
      <label class="campo">
        <select id="campoConceito">
          <option value="">Selecione...</option>
          ${CONFIG.CONCEITOS_GLOBAIS.map(c => `<option value="${c}" ${c === av.conceitoGlobal ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="secao-formulario" data-numero="6">
      <h3>Data</h3>
      <label class="campo"><input type="text" id="campoDataAval" placeholder="DD/MM/AAAA" value="${escapeHtml(av.dataPreenchimento)}"></label>
    </div>

    <div class="acoes-rodape sem-impressao">
      <button class="botao-secundario" id="btnImprimirAval">Imprimir</button>
      <button class="botao-primario" id="btnSalvarAval">Salvar avaliação</button>
    </div>
  `;
  app.appendChild(card);

  document.getElementById('btnImprimirAval').onclick = () => window.print();

  document.getElementById('btnSalvarAval').onclick = async () => {
    const habilidades = Array.from(document.querySelectorAll('#listaHabilidadesAval .habilidade-planejada-aval')).map(el => ({
      idHabilidade: el.dataset.idh,
      justificativa: el.querySelector('[data-campo="justificativa"]').value,
      statusHabilidade: el.querySelector('[data-campo="status"]').value
    }));
    const payload = {
      idPei: resp.idPei, idAluno: estado.aluno.idAluno, idProfessor: estado.professor.idProfessor,
      instrumentosUtilizados: document.getElementById('campoInstrumentos').value,
      relatorioFinal: document.getElementById('campoRelatorio').value,
      nota: document.getElementById('campoNota').value,
      conceitoGlobal: document.getElementById('campoConceito').value,
      dataPreenchimento: document.getElementById('campoDataAval').value,
      habilidades
    };
    const areaMsg = document.getElementById('areaMensagemAval');
    areaMsg.innerHTML = '<p class="carregando">Salvando...</p>';
    const salvo = await chamarApi('salvarAvaliacao', payload);
    areaMsg.innerHTML = salvo.ok ? aviso('sucesso', 'Avaliação salva com sucesso.') : aviso('erro', salvo.erro || 'Erro ao salvar.');
  };
}

// ---------------------------------------------------------------------------
// INÍCIO
// ---------------------------------------------------------------------------
renderLogin();
