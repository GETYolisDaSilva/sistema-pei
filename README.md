# Site do Sistema de PEI — GET Yolis da Silva

Este é o front-end (o que os professores e a direção realmente veem e usam).
Ele só funciona depois que o backend do Apps Script já estiver implantado
(veja a pasta `apps-script/`, passo a passo já concluído por você).

## Antes de publicar

Abra `js/config.js` e troque a linha:

```javascript
API_URL: 'COLE_AQUI_A_URL_DO_APP_DA_WEB',
```

pela URL real do seu App da Web (a mesma que você testou com `?action=ping`,
terminando em `/exec`, **sem** o `/u/5/` ou qualquer `/u/N/` no meio).

## Publicando no GitHub Pages

1. Crie um repositório novo no GitHub (pode ser privado — o site funciona
   normalmente mesmo assim, só fica visível a quem você der acesso; **mas se
   quiser que o link funcione para todos os professores sem precisar de login
   no GitHub, o repositório precisa ser público**, já que o GitHub Pages de
   repositório privado exige plano pago para publicar).
2. Suba todos os arquivos desta pasta (`index.html`, `direcao.html`, `css/`,
   `js/`) para a raiz do repositório.
3. No repositório, vá em **Settings → Pages**.
4. Em "Source", selecione a branch (geralmente `main`) e a pasta `/ (root)`.
5. Salve. Em alguns minutos o GitHub te dá uma URL do tipo:
   `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`
6. Essa é a URL que você vai compartilhar com os professores. O painel da
   direção fica em `.../direcao.html`.

## Estrutura dos arquivos

- `index.html` + `js/app.js` — tela do professor (login → bimestre → turma →
  aluno → PEI/Avaliação).
- `direcao.html` + `js/direcao.js` — painel da direção (fiscalização,
  cadastro de alunos, vínculos, busca e impressão).
- `js/common.js` — funções pequenas usadas nas duas telas.
- `js/api.js` — a "ponte" que fala com o Apps Script.
- `js/config.js` — único lugar que você deveria precisar editar no dia a dia
  (URL da API e ano letivo).
- `css/style.css` — toda a aparência do site, incluindo o estilo de impressão
  (o que aparece quando o professor clica em "Imprimir" já esconde os menus e
  deixa só o conteúdo do PEI/Avaliação formatado para papel).

## O que já funciona nesta versão

- Login de professor e da direção.
- Navegação completa: bimestre → turma → disciplina → aluno.
- Preencher e salvar PEI (com quantas habilidades quiser adicionar/remover).
- Avaliar o PEI, com as habilidades planejadas já herdadas automaticamente.
- Impressão (usa a função de impressão do navegador — o professor pode
  "Salvar como PDF" na tela de impressão, se preferir um arquivo).
- Painel da direção: fiscalização de pendências por professor (com botão de
  marcar "feito na prefeitura"), cadastro/edição de aluno, criação de vínculo
  de professor, busca por aluno com impressão de todos os PEIs dele.

## Limitações conhecidas desta versão (próximos passos)

1. **Fiscalização só considera o PEI**, não a Avaliação separadamente — dá
   para conferir a avaliação individualmente pela busca de aluno, mas ainda
   não entra na contagem de pendências. Posso adicionar isso depois.
2. **Editar vínculo existente** (trocar professor de uma turma) ainda não tem
   tela própria — só criar um vínculo novo. Para "aposentar" um vínculo
   antigo por enquanto, edite direto a coluna `Situacao` para `Inativo` na
   aba `Vinculos` da planilha.
3. **Impressão em lote por disciplina** (todos os PEIs de uma disciplina de
   uma vez, para a direção) ainda não tem tela própria — hoje dá para
   imprimir todos os PEIs de UM aluno de cada vez.
4. Sem senha individual por PEI/tentativas de acesso malicioso: a proteção
   é a senha institucional única + o link não ser divulgado publicamente.
