// Painel de opções da extensão. Salva em chrome.storage.sync;
// o content.js escuta as mudanças e aplica na página aberta.
const CHAVE_OPCOES = "rcoOpcoes";
const OPCOES_PADRAO = {
  cores: true,
  previsao: true,
  iniciarLigado: false,
  ocultarAvaliacoes: true,
  colunaMeta: true,
  colunaMedia: true,
  negrito: true
};

const form = document.getElementById("opcoes");
const sub = document.getElementById("subopcoes");
const diario = document.getElementById("diario");
const status = document.getElementById("salvo");

function mostrar(opcoes) {
  for (const [nome, valor] of Object.entries(opcoes)) {
    const input = form.elements[nome];
    if (input) input.checked = Boolean(valor);
  }
  sub.disabled = !opcoes.previsao;
  diario.classList.toggle("sem-cor", !opcoes.cores);
}

function lerFormulario() {
  const opcoes = {};
  for (const nome of Object.keys(OPCOES_PADRAO)) opcoes[nome] = form.elements[nome].checked;
  return opcoes;
}

let timerStatus;
async function salvar(opcoes, mensagem) {
  mostrar(opcoes);
  try {
    await chrome.storage.sync.set({ [CHAVE_OPCOES]: opcoes });
    status.textContent = mensagem;
  } catch (e) {
    status.textContent = "Não foi possível salvar. Tente de novo.";
  }
  clearTimeout(timerStatus);
  timerStatus = setTimeout(() => (status.textContent = "As mudanças valem na hora."), 2500);
}

form.addEventListener("change", () => salvar(lerFormulario(), "Salvo."));

document.getElementById("restaurar").addEventListener("click", () =>
  salvar({ ...OPCOES_PADRAO }, "Padrão restaurado.")
);

chrome.storage.sync.get(CHAVE_OPCOES).then((r) => {
  mostrar({ ...OPCOES_PADRAO, ...(r[CHAVE_OPCOES] || {}) });
});
