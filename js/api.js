/**
 * Chama uma ação do backend (Apps Script). Sempre via POST com
 * Content-Type: text/plain, para evitar o preflight de CORS que o
 * Apps Script não sabe responder.
 */
async function chamarApi(action, payload) {
  try {
    const resposta = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload: payload || {} })
    });
    if (!resposta.ok) {
      return { ok: false, erro: 'Falha de conexão com o servidor (HTTP ' + resposta.status + ').' };
    }
    return await resposta.json();
  } catch (erro) {
    return { ok: false, erro: 'Não foi possível falar com o servidor. Confira sua internet e tente de novo.' };
  }
}
