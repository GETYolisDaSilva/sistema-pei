const estadoDirecao = {
  logada: false,
  anoLetivo: CONFIG.ANO_LETIVO_ATUAL,
  bimestre: 1,
};

const app = document.getElementById('app');
const areaSessao = document.getElementById('areaSessao');

function renderSessaoDirecao() {
  if (!estadoDirecao.logada) { areaSessao.innerHTML = ''; return; }
  areaSessao.innerHTML = `Direção <button class="sair" id="btnSairDirecao">Sair</button>`;
  document.getElementById('btnSairDirecao').onclick = () => { estadoDirecao.logada = false; renderSessaoDirecao(); renderLoginDirecao(); };
}

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
function renderLoginDirecao() {
  app.innerHTML = '';
  app.appendChild(cartao(`
    <h1 class="titulo-pagina">Painel da Direção</h1>
    <p class="subtitulo">Digite a senha da direção para continuar.</p>
    <label class="campo"><span class="rotulo">Senha</span><input type="password" id="inpSenhaDirecao"></label>
    <div id="areaErroLoginDirecao"></div>
    <div class="acoes-rodape">
      <button class="botao-primario" id="btnEntrarDirecao">Entrar</button>
    </div>
    <p class="subtitulo" style="margin-top:24px; font-size:0.8rem;">
      É professor(a)? <a href="index.html">Voltar para a tela de login de professores</a>.
    </p>
  `));
  document.getElementById('btnEntrarDirecao').onclick = async () => {
    const senha = document.getElementById('inpSenhaDirecao').value;
    const resp = await chamarApi('loginDirecao', { senha });
    const areaErro = document.getElementById('areaErroLoginDirecao');
    if (!resp.ok) { areaErro.innerHTML = aviso('erro', resp.erro); return; }
    estadoDirecao.logada = true;
    renderSessaoDirecao();
    renderMenuDirecao();
  };
}

// ---------------------------------------------------------------------------
// MENU PRINCIPAL
// ---------------------------------------------------------------------------
function renderMenuDirecao() {
  app.innerHTML = '';
  app.appendChild(cartao(`
    <h1 class="titulo-pagina">O que você quer fazer?</h1>
    <div class="grade-botoes">
      <button class="botao-opcao" id="btnMenuFiscalizacao"><span class="rotulo-pequeno">Cobrança</span>Fiscalizar pendências</button>
      <button class="botao-opcao" id="btnMenuAlunos"><span class="rotulo-pequeno">Cadastro</span>Gerenciar alunos</button>
      <button class="botao-opcao" id="btnMenuVinculos"><span class="rotulo-pequeno">Cadastro</span>Gerenciar vínculos de professores</button>
      <button class="botao-opcao" id="btnMenuBusca"><span class="rotulo-pequeno">Consulta</span>Buscar aluno / imprimir PEIs</button>
    </div>
  `));
  document.getElementById('btnMenuFiscalizacao').onclick = renderFiscalizacao;
  document.getElementById('btnMenuAlunos').onclick = renderListaAlunosDirecao;
  document.getElementById('btnMenuVinculos').onclick = renderListaVinculosDirecao;
  document.getElementById('btnMenuBusca').onclick = renderBuscaAluno;
}

// ---------------------------------------------------------------------------
// FISCALIZAÇÃO DE PENDÊNCIAS
// ---------------------------------------------------------------------------
async function renderFiscalizacao() {
  app.innerHTML = '';
  app.appendChild(trilha([{ rotulo: 'Menu', onClick: renderMenuDirecao }, { rotulo: 'Fiscalização' }]));

  const seletor = document.createElement('div');
  seletor.className = 'cartao';
  seletor.innerHTML = `
    <label class="campo" style="max-width:220px;">
      <span class="rotulo">Bimestre</span>
      <select id="selBimestreFiscal">
        ${CONFIG.BIMESTRES.map(b => `<option value="${b}" ${b === estadoDirecao.bimestre ? 'selected' : ''}>${b}º Bimestre</option>`).join('')}
      </select>
    </label>
  `;
  app.appendChild(seletor);

  const areaResultado = document.createElement('div');
  app.appendChild(areaResultado);

  async function carregar() {
    estadoDirecao.bimestre = Number(document.getElementById('selBimestreFiscal').value);
    areaResultado.innerHTML = '<p class="carregando">Calculando pendências...</p>';
    const resp = await chamarApi('getFiscalizacao', { anoLetivo: estadoDirecao.anoLetivo, bimestre: estadoDirecao.bimestre });
    if (!resp.ok) { areaResultado.innerHTML = aviso('erro', 'Erro ao calcular fiscalização.'); return; }

    areaResultado.innerHTML = aviso('info', 'Esta fiscalização considera o PEI de cada aluno/disciplina. A avaliação do PEI ainda não entra nesta contagem — pode ser conferida individualmente na busca por aluno.');

    resp.professores.forEach(prof => {
      const div = document.createElement('div');
      div.className = 'cartao';
      const completo = prof.pendentes.length === 0;
      div.innerHTML = `
        <h1 class="titulo-pagina" style="font-size:1.05rem;">
          ${escapeHtml(prof.nome)} — ${prof.total - prof.pendentes.length}/${prof.total} PEIs feitos
          ${completo ? '<span class="badge" style="background:#E9F3EC;color:#3F7D5C;">completo</span>' : ''}
        </h1>
        ${prof.pendentes.length ? '<div class="lista-pendentes"></div>' : ''}
      `;
      areaResultado.appendChild(div);
      if (prof.pendentes.length) {
        const listaEl = div.querySelector('.lista-pendentes');
        prof.pendentes.forEach(p => {
          const linha = document.createElement('div');
          linha.className = 'linha-habilidade';
          linha.innerHTML = `
            <strong>${escapeHtml(p.nomeAluno)}</strong> — ${escapeHtml(p.disciplina)} — Turma ${escapeHtml(p.turma)}
            <div class="acoes-rodape" style="margin-top:8px;">
              <button class="botao-secundario" data-marcar>Marcar como feito na prefeitura</button>
            </div>
          `;
          listaEl.appendChild(linha);
          linha.querySelector('[data-marcar]').onclick = async (ev) => {
            ev.target.disabled = true;
            ev.target.textContent = 'Marcando...';
            const marcado = await chamarApi('marcarFeitoNaPrefeitura', {
              idAluno: p.idAluno, idProfessor: prof.idProfessor, disciplina: p.disciplina,
              bimestre: estadoDirecao.bimestre, anoLetivo: estadoDirecao.anoLetivo, tipo: 'PEI'
            });
            if (marcado.ok) { linha.remove(); } else { ev.target.textContent = 'Erro, tente de novo'; ev.target.disabled = false; }
          };
        });
      }
    });
  }

  document.getElementById('selBimestreFiscal').onchange = carregar;
  carregar();
}

// ---------------------------------------------------------------------------
// GERENCIAR ALUNOS (listar / adicionar / editar / inativar)
// ---------------------------------------------------------------------------
async function renderListaAlunosDirecao() {
  app.innerHTML = '';
  app.appendChild(trilha([{ rotulo: 'Menu', onClick: renderMenuDirecao }, { rotulo: 'Alunos' }]));
  app.appendChild(cartao(`
    <div class="acoes-rodape" style="justify-content:flex-start;">
      <button class="botao-primario" id="btnNovoAluno">+ Cadastrar novo aluno</button>
    </div>
  `));
  document.getElementById('btnNovoAluno').onclick = () => renderFormAluno(null);

  app.insertAdjacentHTML('beforeend', '<p class="carregando">Carregando alunos...</p>');
  const resp = await chamarApi('buscarAluno', { termo: '' });
  document.querySelector('.carregando').remove();
  if (!resp.ok) { app.appendChild(cartao(aviso('erro', 'Erro ao carregar alunos.'))); return; }

  resp.alunos.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(a => {
    const div = document.createElement('div');
    div.className = 'cartao';
    div.innerHTML = `
      <strong>${escapeHtml(a.nome)}</strong> — Turma ${escapeHtml(a.turma)}
      ${a.situacao !== 'Ativo' ? '<span class="badge">inativo</span>' : ''}
      <div class="acoes-rodape" style="margin-top:8px;">
        <button class="botao-secundario" data-editar>Editar / remanejar</button>
      </div>
    `;
    app.appendChild(div);
    div.querySelector('[data-editar]').onclick = () => renderFormAluno(a.idAluno);
  });
}

async function renderFormAluno(idAluno) {
  app.innerHTML = '';
  app.appendChild(trilha([
    { rotulo: 'Menu', onClick: renderMenuDirecao },
    { rotulo: 'Alunos', onClick: renderListaAlunosDirecao },
    { rotulo: idAluno ? 'Editar aluno' : 'Novo aluno' }
  ]));

  let aluno = {
    Nome_Completo: '', Cod_Aluno_Oficial: '', Data_Nascimento: '', Responsavel: '', Contato: '',
    Unidade_Escolar: 'EM Yolis da Silva', Ano_Letivo: estadoDirecao.anoLetivo, Turma: '', Ano_Escolar: '',
    Professor_Sala_Regular: '', Diagnostico_Laudo: '', Vai_Sala_Recursos: 'Não', Situacao: 'Ativo'
  };

  if (idAluno) {
    const resp = await chamarApi('getAlunoCompleto', { idAluno });
    if (resp.ok) Object.assign(aluno, resp.aluno);
  }

  const card = cartao(`
    <h1 class="titulo-pagina">${idAluno ? 'Editar / remanejar aluno' : 'Cadastrar novo aluno'}</h1>
    <label class="campo"><span class="rotulo">Nome completo</span><input type="text" id="fNome" value="${escapeHtml(aluno.Nome_Completo)}"></label>
    <div class="grade-2" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <label class="campo"><span class="rotulo">Data de nascimento</span><input type="text" id="fNasc" placeholder="DD/MM/AAAA" value="${escapeHtml(aluno.Data_Nascimento)}"></label>
      <label class="campo"><span class="rotulo">Cód. aluno oficial</span><input type="text" id="fCod" value="${escapeHtml(aluno.Cod_Aluno_Oficial)}"></label>
      <label class="campo"><span class="rotulo">Responsável</span><input type="text" id="fResp" value="${escapeHtml(aluno.Responsavel)}"></label>
      <label class="campo"><span class="rotulo">Contato</span><input type="text" id="fContato" value="${escapeHtml(aluno.Contato)}"></label>
      <label class="campo"><span class="rotulo">Turma</span><input type="text" id="fTurma" value="${escapeHtml(aluno.Turma)}"></label>
      <label class="campo"><span class="rotulo">Ano escolar</span><input type="text" id="fAnoEsc" placeholder="ex: 1º ano" value="${escapeHtml(aluno.Ano_Escolar)}"></label>
      <label class="campo"><span class="rotulo">Professor da sala regular</span><input type="text" id="fProfRegular" value="${escapeHtml(aluno.Professor_Sala_Regular)}"></label>
      <label class="campo"><span class="rotulo">Diagnóstico / laudo</span><input type="text" id="fLaudo" value="${escapeHtml(aluno.Diagnostico_Laudo)}"></label>
      <label class="campo"><span class="rotulo">Vai à Sala de Recursos?</span>
        <select id="fSRM"><option value="Não" ${aluno.Vai_Sala_Recursos === 'Não' ? 'selected' : ''}>Não</option><option value="Sim" ${aluno.Vai_Sala_Recursos === 'Sim' ? 'selected' : ''}>Sim</option></select>
      </label>
      <label class="campo"><span class="rotulo">Situação</span>
        <select id="fSituacao"><option value="Ativo" ${aluno.Situacao === 'Ativo' ? 'selected' : ''}>Ativo</option><option value="Inativo" ${aluno.Situacao === 'Inativo' ? 'selected' : ''}>Inativo</option></select>
      </label>
    </div>
    <div id="areaMensagemAluno"></div>
    <div class="acoes-rodape">
      <button class="botao-primario" id="btnSalvarAluno">${idAluno ? 'Salvar alterações' : 'Cadastrar aluno'}</button>
    </div>
  `);
  app.appendChild(card);

  document.getElementById('btnSalvarAluno').onclick = async () => {
    const campos = {
      Nome_Completo: document.getElementById('fNome').value,
      Data_Nascimento: document.getElementById('fNasc').value,
      Cod_Aluno_Oficial: document.getElementById('fCod').value,
      Responsavel: document.getElementById('fResp').value,
      Contato: document.getElementById('fContato').value,
      Turma: document.getElementById('fTurma').value,
      Ano_Escolar: document.getElementById('fAnoEsc').value,
      Professor_Sala_Regular: document.getElementById('fProfRegular').value,
      Diagnostico_Laudo: document.getElementById('fLaudo').value,
      Vai_Sala_Recursos: document.getElementById('fSRM').value,
      Situacao: document.getElementById('fSituacao').value,
      Unidade_Escolar: aluno.Unidade_Escolar,
      Ano_Letivo: aluno.Ano_Letivo
    };
    const areaMsg = document.getElementById('areaMensagemAluno');
    areaMsg.innerHTML = '<p class="carregando">Salvando...</p>';
    const resp = idAluno
      ? await chamarApi('editarAluno', { idAluno, campos })
      : await chamarApi('adicionarAluno', campos);
    areaMsg.innerHTML = resp.ok ? aviso('sucesso', 'Salvo com sucesso.') : aviso('erro', resp.erro || 'Erro ao salvar.');
  };
}

// ---------------------------------------------------------------------------
// GERENCIAR VÍNCULOS DE PROFESSOR (listar / adicionar / editar)
// ---------------------------------------------------------------------------
async function renderListaVinculosDirecao() {
  app.innerHTML = '';
  app.appendChild(trilha([{ rotulo: 'Menu', onClick: renderMenuDirecao }, { rotulo: 'Vínculos' }]));
  app.appendChild(cartao(`
    <p class="subtitulo">Use isto quando um(a) professor(a) sair, for substituído(a), ou assumir uma turma nova.</p>
    <div class="acoes-rodape" style="justify-content:flex-start;">
      <button class="botao-primario" id="btnNovoVinculo">+ Adicionar vínculo</button>
    </div>
  `));
  document.getElementById('btnNovoVinculo').onclick = () => renderFormVinculo(null);
}

function renderFormVinculo(idVinculo) {
  app.innerHTML = '';
  app.appendChild(trilha([
    { rotulo: 'Menu', onClick: renderMenuDirecao },
    { rotulo: 'Vínculos', onClick: renderListaVinculosDirecao },
    { rotulo: 'Novo vínculo' }
  ]));
  app.appendChild(cartao(`
    <h1 class="titulo-pagina">Novo vínculo professor × disciplina × turma</h1>
    <label class="campo"><span class="rotulo">ID do professor (ver aba Professores na planilha)</span><input type="text" id="vProf"></label>
    <label class="campo"><span class="rotulo">Nome do professor</span><input type="text" id="vNome"></label>
    <label class="campo"><span class="rotulo">Disciplina</span><input type="text" id="vDisc"></label>
    <label class="campo"><span class="rotulo">Turma</span><input type="text" id="vTurma"></label>
    <div id="areaMensagemVinculo"></div>
    <div class="acoes-rodape">
      <button class="botao-primario" id="btnSalvarVinculo">Salvar vínculo</button>
    </div>
  `));
  document.getElementById('btnSalvarVinculo').onclick = async () => {
    const payload = {
      ID_Professor: document.getElementById('vProf').value,
      Nome_Professor: document.getElementById('vNome').value,
      Disciplina: document.getElementById('vDisc').value,
      Turma: document.getElementById('vTurma').value,
      Ano_Letivo: estadoDirecao.anoLetivo
    };
    const areaMsg = document.getElementById('areaMensagemVinculo');
    areaMsg.innerHTML = '<p class="carregando">Salvando...</p>';
    const resp = await chamarApi('adicionarVinculo', payload);
    areaMsg.innerHTML = resp.ok ? aviso('sucesso', 'Vínculo criado com sucesso.') : aviso('erro', resp.erro || 'Erro ao salvar.');
  };
}

// ---------------------------------------------------------------------------
// BUSCAR ALUNO / IMPRESSÃO UNIFICADA DE TODOS OS PEIS
// ---------------------------------------------------------------------------
function renderBuscaAluno() {
  app.innerHTML = '';
  app.appendChild(trilha([{ rotulo: 'Menu', onClick: renderMenuDirecao }, { rotulo: 'Buscar aluno' }]));
  app.appendChild(cartao(`
    <label class="campo"><span class="rotulo">Nome do aluno</span><input type="text" id="inpBusca" placeholder="Digite parte do nome..."></label>
    <div class="acoes-rodape sem-impressao"><button class="botao-primario" id="btnBuscar">Buscar</button></div>
    <div id="areaResultadoBusca"></div>
  `));
  document.getElementById('btnBuscar').onclick = async () => {
    const termo = document.getElementById('inpBusca').value;
    const area = document.getElementById('areaResultadoBusca');
    area.innerHTML = '<p class="carregando">Buscando...</p>';
    const resp = await chamarApi('buscarAluno', { termo });
    if (!resp.ok || !resp.alunos.length) { area.innerHTML = aviso('info', 'Nenhum aluno encontrado.'); return; }
    area.innerHTML = '';
    resp.alunos.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'botao-opcao';
      btn.textContent = `${a.nome} — Turma ${a.turma}`;
      btn.onclick = () => renderPeisDoAluno(a);
      area.appendChild(btn);
    });
  };
}

async function renderPeisDoAluno(aluno) {
  app.innerHTML = '';
  app.appendChild(trilha([
    { rotulo: 'Menu', onClick: renderMenuDirecao },
    { rotulo: 'Buscar aluno', onClick: renderBuscaAluno },
    { rotulo: aluno.nome }
  ]));
  app.insertAdjacentHTML('beforeend', '<p class="carregando">Carregando PEIs...</p>');
  const resp = await chamarApi('getTodosPeisDoAluno', { idAluno: aluno.idAluno });
  document.querySelector('.carregando').remove();
  if (!resp.ok || !resp.registros.length) {
    app.appendChild(cartao(aviso('info', 'Nenhum PEI preenchido no site ainda para este aluno.')));
    return;
  }

  const botaoImprimir = document.createElement('div');
  botaoImprimir.className = 'acoes-rodape sem-impressao';
  botaoImprimir.innerHTML = '<button class="botao-primario" id="btnImprimirTudo">Imprimir tudo</button>';
  app.appendChild(botaoImprimir);

  resp.registros.forEach(reg => {
    const p = reg.pei;
    const av = reg.avaliacao;
    const div = document.createElement('div');
    div.className = 'cartao';
    div.innerHTML = `
      <h1 class="titulo-pagina" style="font-size:1.15rem;">${escapeHtml(p.Disciplina)} — ${escapeHtml(p.Bimestre)}º Bimestre</h1>
      <p class="subtitulo">Turma ${escapeHtml(p.Turma)} · ${escapeHtml(p.COC)} · Professor(a): ${escapeHtml(p.Nome_Professor)}</p>
      <h3>Objetivos</h3><p>${escapeHtml(p.Objetivos) || '-'}</p>
      <h3>Habilidades</h3>
      ${reg.habilidades.map(h => `<div class="linha-habilidade"><strong>${escapeHtml(h.Eixo)}</strong> — ${escapeHtml(h.Habilidade)}</div>`).join('') || '<p>-</p>'}
      <h3>Estratégias</h3><p>${escapeHtml(p.Estrategias) || '-'}</p>
      <h3>Recursos específicos</h3><p>${escapeHtml(p.Recursos_Especificos) || '-'}</p>
      <h3>Resultado esperado</h3><p>${escapeHtml(p.Resultado_Esperado) || '-'}</p>
      ${av ? `
        <h1 class="titulo-pagina" style="font-size:1.05rem; margin-top:20px;">Avaliação</h1>
        <h3>Instrumentos utilizados</h3><p>${escapeHtml(av.Instrumentos_Utilizados) || '-'}</p>
        ${reg.itensAvaliacao.map(it => `<div class="linha-habilidade"><em>${escapeHtml(it.Habilidade_Planejada)}</em><br>${escapeHtml(it.Justificativa)}<br><span class="badge">${escapeHtml(it.Status_Habilidade)}</span></div>`).join('')}
        <h3>Relatório final</h3><p>${escapeHtml(av.Relatorio_Final) || '-'}</p>
        <p><strong>Nota:</strong> ${escapeHtml(av.Nota) || '-'} &nbsp; <strong>Conceito global:</strong> ${escapeHtml(av.Conceito_Global) || '-'}</p>
      ` : aviso('info', 'Avaliação ainda não preenchida para este bimestre/disciplina.')}
    `;
    app.appendChild(div);
  });

  document.getElementById('btnImprimirTudo').onclick = () => window.print();
}

// ---------------------------------------------------------------------------
// INÍCIO
// ---------------------------------------------------------------------------
renderLoginDirecao();
