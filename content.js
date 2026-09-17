// ============================================================
// Boletim+ – ferramentas para o RCO
// - Colore as somatórias (verde >= 6, vermelho < 6).
// - No 3º trimestre, um botão liga/desliga (começa desligado)
//   mostra na própria tabela: 1º Tri | 2º Tri | 3º Tri |
//   Meta no 3º Tri | Média Anual.
// ============================================================
console.log("[Boletim+] carregado");

const CONFIG = {
  mediaAprovacao: 6.0,
  numTrimestres: 3,
  notaMaxTrimestre: 10.0,
  cacheMinutos: 5,   // tempo até buscar de novo o 1º/2º trimestre
  janelaBusca: 12    // quantos códigos de período olhar para trás
};

const TAG = "rco-previsao";

// ------------------------------------------------------------
// OPÇÕES (definidas no painel da extensão, popup.html)
// ------------------------------------------------------------
const CHAVE_OPCOES = "rcoOpcoes";
const OPCOES_PADRAO = {
  cores: true,             // verde/vermelho nas somatórias
  previsao: true,          // botão "Mostrar 1º e 2º trimestre" no 3º trimestre
  iniciarLigado: false,    // o botão já começa ligado
  ocultarAvaliacoes: true, // esconde AV1, AV2... quando ligado
  colunaMeta: true,        // coluna "Meta no 3º Tri"
  colunaMedia: true,       // coluna "Média Anual"
  negrito: true            // números das colunas em negrito
};
let opcoes = { ...OPCOES_PADRAO };
let ultimaMensagem = null;

try {
  chrome.storage.sync.get(CHAVE_OPCOES).then((r) => {
    opcoes = { ...OPCOES_PADRAO, ...(r[CHAVE_OPCOES] || {}) };
    if (!modoTocado) modoPrevisao = opcoes.iniciarLigado;
    agendarSync();
  }).catch(() => {});

  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area !== "sync" || !mudancas[CHAVE_OPCOES]) return;
    const antes = opcoes;
    opcoes = { ...OPCOES_PADRAO, ...(mudancas[CHAVE_OPCOES].newValue || {}) };
    if (antes.iniciarLigado !== opcoes.iniciarLigado) modoPrevisao = opcoes.iniciarLigado;
    if (!antes.previsao && opcoes.previsao && ultimaMensagem) aoReceberAlunos(ultimaMensagem);
    agendarSync();
  });
} catch (e) {
  console.warn("[Boletim+] opções indisponíveis", e);
}
const EPS = 1e-6;

// ------------------------------------------------------------
// COMUNICAÇÃO COM injetado.js
// ------------------------------------------------------------
const aguardando = new Map();
let seqPedido = 0;

window.addEventListener("message", (ev) => {
  if (ev.source !== window || !ev.data || typeof ev.data !== "object") return;
  const tipo = ev.data[TAG];
  if (tipo === "alunos") aoReceberAlunos(ev.data);
  else if (tipo === "resposta") {
    const fn = aguardando.get(ev.data.reqId);
    if (fn) {
      aguardando.delete(ev.data.reqId);
      fn(ev.data);
    }
  }
});

function pedirPeriodo(codClasse, codPeriodo) {
  return new Promise((resolve, reject) => {
    const reqId = `${++seqPedido}-${Date.now()}`;
    const timer = setTimeout(() => {
      aguardando.delete(reqId);
      reject(new Error("tempo esgotado"));
    }, 20000);
    aguardando.set(reqId, (d) => {
      clearTimeout(timer);
      if (d.erro) reject(new Error(d.erro));
      else resolve({ campos: d.campos, dados: Array.isArray(d.dados) ? d.dados : [] });
    });
    window.postMessage({ [TAG]: "buscar", reqId, codClasse, codPeriodo }, location.origin);
  });
}

// ------------------------------------------------------------
// CACHE POR TURMA
// ------------------------------------------------------------
const cache = new Map(); // codClasse -> { periodos, tsPeriodos, porCod: Map(cod -> {campos,dados,ts}) }

function cacheDaClasse(codClasse) {
  if (!cache.has(codClasse)) cache.set(codClasse, { periodos: null, tsPeriodos: 0, porCod: new Map() });
  return cache.get(codClasse);
}

async function obterPeriodo(codClasse, cod, forcar = false) {
  const c = cacheDaClasse(codClasse);
  const salvo = c.porCod.get(cod);
  if (!forcar && salvo && Date.now() - salvo.ts < CONFIG.cacheMinutos * 60e3) return salvo;
  const p = await pedirPeriodo(codClasse, cod);
  const novo = { ...p, ts: Date.now() };
  c.porCod.set(cod, novo);
  return novo;
}

// Descobre quais códigos de período têm estudantes nesta turma.
// Em 2026, por exemplo: 9 (1º), 10 (2º) e 11 (3º).
async function descobrirPeriodos(codClasse, codAtual) {
  const c = cacheDaClasse(codClasse);
  if (c.periodos && c.periodos.includes(codAtual) && Date.now() - c.tsPeriodos < 30 * 60e3) {
    return c.periodos;
  }

  const cods = [];
  for (let i = Math.max(1, codAtual - CONFIG.janelaBusca); i <= codAtual + 3; i++) cods.push(i);

  const comDados = [];
  let erros = 0;
  let primeiroErro = null;

  for (let i = 0; i < cods.length; i += 5) {
    const lote = cods.slice(i, i + 5);
    const res = await Promise.all(
      lote.map((cod) => obterPeriodo(codClasse, cod).catch((e) => ({ erro: e })))
    );
    res.forEach((r, j) => {
      if (r.erro) {
        erros++;
        primeiroErro = primeiroErro || r.erro;
      } else if (r.dados.length) {
        comDados.push(lote[j]);
      }
    });
  }

  if (erros >= cods.length - 1) throw primeiroErro || new Error("falha na busca");

  c.periodos = comDados.sort((a, b) => a - b);
  c.tsPeriodos = Date.now();
  return c.periodos;
}

// ------------------------------------------------------------
// FLUXO PRINCIPAL
// ------------------------------------------------------------
let estado = null;
let versaoFluxo = 0;

async function aoReceberAlunos(m) {
  const minhaVersao = ++versaoFluxo;
  const c = cacheDaClasse(m.codClasse);
  c.porCod.set(m.codPeriodo, { campos: m.campos, dados: m.dados, ts: Date.now() });
  ultimaMensagem = m;

  // previsão desligada no painel: não faz nenhuma consulta extra
  if (!opcoes.previsao) {
    estado = null;
    atualizarPainel();
    return;
  }

  const triTela = detectarTrimestreTela();
  estado = {
    codClasse: m.codClasse,
    codPeriodo: m.codPeriodo,
    atual: interpretar(m),
    tri: triTela === 3 ? 3 : null,
    t1: null,
    t2: null,
    status: { texto: "Carregando notas do 1º e do 2º trimestre…", tipo: "info" },
    versao: minhaVersao
  };
  atualizarPainel();

  try {
    const periodos = await descobrirPeriodos(m.codClasse, m.codPeriodo);
    if (minhaVersao !== versaoFluxo) return;

    let cod1;
    let cod2;
    let tri;

    if (periodos.length === 3) {
      tri = periodos.indexOf(m.codPeriodo) + 1;
      [cod1, cod2] = periodos;
    } else if (triTela === 3) {
      // mais ou menos de 3 períodos: usa os dois anteriores ao atual
      const anteriores = periodos.filter((p) => p < m.codPeriodo);
      tri = 3;
      [cod1, cod2] = anteriores.slice(-2);
    }

    if (tri !== 3) {
      estado = null;
      atualizarPainel();
      return;
    }
    if (cod1 == null || cod2 == null) {
      throw new Error("não encontrei os períodos do 1º e 2º trimestre desta turma");
    }

    const [p1, p2] = await Promise.all([obterPeriodo(m.codClasse, cod1), obterPeriodo(m.codClasse, cod2)]);
    if (minhaVersao !== versaoFluxo) return;

    Object.assign(estado, {
      tri: 3,
      t1: interpretar(p1),
      t2: interpretar(p2),
      status: {
        texto: `Notas do 1º e do 2º trimestre carregadas do RCO às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
        tipo: "ok"
      },
      versao: ++versaoFluxo
    });
  } catch (e) {
    if (!estado || estado.versao !== minhaVersao) return;
    estado.status = { texto: `Não consegui carregar o 1º e o 2º trimestre: ${e.message}.`, tipo: "aviso" };
    estado.versao = ++versaoFluxo;
    console.warn("[Boletim+]", e);
  }
  atualizarPainel();
}

// ------------------------------------------------------------
// INTERPRETAÇÃO DOS DADOS DA API
// ------------------------------------------------------------
function normalizarNome(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function paraNumero(v) {
  if (v && typeof v === "object") v = v.valor ?? v.nota ?? v.value ?? null;
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && /^\s*-?\d+([.,]\d+)?\s*$/.test(v)) return parseFloat(v.replace(",", "."));
  return null;
}

function extrairMaximo(label) {
  const m = String(label || "").match(/\(([\d.,]+)\)/);
  if (!m) return Infinity;
  const n = parseFloat(m[1].replace(",", "."));
  return isNaN(n) ? Infinity : n;
}

function interpretar(p) {
  const campos = Array.isArray(p.campos) ? p.campos : [];

  const avaliacoes = campos
    .filter((c) => /^nota/i.test(c.key))
    .map((c) => {
      const label = String(c.label || "");
      return {
        key: c.key,
        max: extrairMaximo(label),
        rec: /recupera/i.test(label),
        avs: Array.from(label.matchAll(/AV\s*(\d+)/gi)).map((m) => Number(m[1]))
      };
    });

  const chaveFinal =
    campos.find((c) => c.key === "final")?.key ||
    campos.find((c) => /somat/i.test(c.label || ""))?.key ||
    "final";

  const alunos = (p.dados || [])
    .map((r) => ({
      chave: normalizarNome(r.nome),
      nome: String(r.nome || "").trim(),
      num: r.numChamada,
      situacao: String(r.descrAbrevSituacaoMatricula ?? "").trim(),
      final: paraNumero(r[chaveFinal]),
      notas: Object.fromEntries(avaliacoes.map((a) => [a.key, paraNumero(r[a.key])]))
    }))
    .filter((a) => a.chave);

  return { avaliacoes, alunos };
}

function pontosPendentes(dados) {
  const base = dados.avaliacoes.filter((a) => !a.rec);
  const recs = dados.avaliacoes.filter((a) => a.rec);
  const porAv = new Map(base.map((a) => [a.avs[0], a]));
  const grupos = [];
  const usados = new Set();

  recs.forEach((r) => {
    const bases = r.avs.map((n) => porAv.get(n)).filter((b) => b && !usados.has(b.key));
    if (!bases.length) return;
    bases.forEach((b) => usados.add(b.key));
    grupos.push({ bases, recs: [r] });
  });
  base.forEach((b) => {
    if (!usados.has(b.key)) grupos.push({ bases: [b], recs: [] });
  });

  let total = 0;
  let pendentes = 0;
  let desconhecido = false;

  grupos.forEach((g) => {
    const max = g.bases.reduce((s, b) => s + b.max, 0);
    const aplicada = dados.alunos.some((al) =>
      [...g.bases, ...g.recs].some((x) => al.notas[x.key] != null)
    );
    if (!isFinite(max)) {
      if (!aplicada) desconhecido = true;
      return;
    }
    total += max;
    if (!aplicada) pendentes += max;
  });

  const naoCriadas = desconhecido ? 0 : Math.max(0, CONFIG.notaMaxTrimestre - total);
  return { pendentes: pendentes + naoCriadas, naoCriadas, desconhecido };
}

// ------------------------------------------------------------
// CÁLCULO POR ESTUDANTE
// ------------------------------------------------------------
const fmt = (n) => (n == null ? "—" : (Math.round(n * 100) / 100).toFixed(1));
const ALVO_ANUAL = CONFIG.mediaAprovacao * CONFIG.numTrimestres;

function buscarAluno(dados, chave) {
  if (!dados) return null;
  return (
    dados.alunos.find((a) => a.chave === chave) ||
    dados.alunos.find((a) => a.chave.includes(chave) || chave.includes(a.chave)) ||
    null
  );
}

function classeNota(n) {
  if (n == null || !opcoes.cores) return "";
  return n < CONFIG.mediaAprovacao - EPS ? "rco-vermelho" : "rco-verde";
}

function calcularLinha(chave, parcialTela) {
  const { atual, t1, t2 } = estado;
  const aluno = buscarAluno(atual, chave);
  const carregando = !t1 || !t2;
  const n1 = buscarAluno(t1, chave)?.final ?? null;
  const n2 = buscarAluno(t2, chave)?.final ?? null;
  const n3 = aluno ? aluno.final : parcialTela;

  const vazio = (titulo = "") => ({ texto: carregando ? "…" : "—", classe: "", titulo });
  const linha = {
    t1: carregando ? vazio() : { texto: fmt(n1), classe: classeNota(n1), titulo: "Somatória do 1º trimestre" },
    t2: carregando ? vazio() : { texto: fmt(n2), classe: classeNota(n2), titulo: "Somatória do 2º trimestre" },
    meta: vazio(),
    media: vazio()
  };
  if (carregando) return linha;

  if (aluno?.situacao && aluno.final == null) {
    linha.meta.titulo = linha.media.titulo = aluno.situacao;
    return linha;
  }
  if (n1 == null || n2 == null) {
    linha.meta.titulo = linha.media.titulo = "Sem nota em um dos trimestres anteriores";
    return linha;
  }

  // Meta: quanto precisa somar no 3º para a média anual chegar a 6,0
  const meta = Math.max(0, ALVO_ANUAL - n1 - n2);
  const parcial = n3 ?? 0;
  const falta = Math.max(0, meta - parcial);
  linha.meta.texto = fmt(meta);
  if (falta <= EPS) {
    linha.meta.classe = opcoes.cores ? "rco-verde" : "";
    linha.meta.titulo = "Já atingiu a meta";
  } else if (meta > CONFIG.notaMaxTrimestre + EPS) {
    linha.meta.classe = opcoes.cores ? "rco-vermelho" : "";
    linha.meta.titulo = "Acima de 10: não alcança só com o 3º trimestre";
  } else {
    linha.meta.titulo = `Faltam ${fmt(falta)} (já tem ${fmt(parcial)} no 3º)`;
  }

  // Média anual: média dos três trimestres (3º com a nota atual)
  const media = (n1 + n2 + parcial) / CONFIG.numTrimestres;
  linha.media = {
    texto: fmt(media),
    classe: classeNota(media),
    titulo: `(${fmt(n1)} + ${fmt(n2)} + ${fmt(parcial)}) ÷ 3, com o 3º trimestre até agora`
  };
  return linha;
}

// ------------------------------------------------------------
// DOM: trimestre da tela e tabela do RCO
// ------------------------------------------------------------
function detectarTrimestreTela() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest(".rco-cel, .rco-barra-previsao, script, style, option")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
  });
  while (walker.nextNode()) {
    const m = walker.currentNode.nodeValue.match(/\b([123])\s*[º°ª]\s*Trimestre\b/i);
    if (m) return Number(m[1]);
  }
  return null;
}

const celulasOriginais = (tr) => Array.from(tr.children).filter((c) => !c.classList.contains("rco-cel"));

function localizarTabela() {
  for (const t of document.querySelectorAll("table")) {
    const textos = Array.from(t.querySelectorAll("th")).map((th) => th.textContent.toUpperCase());
    const temSomatoria = textos.some((x) => x.includes("SOMAT")) || t.querySelector("th.rco-th-somatoria");
    if (temSomatoria && textos.some((x) => x.includes("NOME"))) return t;
  }
  return null;
}

const ehThSomatoria = (c) => c.classList.contains("rco-th-somatoria") || /SOMAT/i.test(c.textContent);

// Troca o texto "Somatória" por "3º Tri" no próprio cabeçalho (assim sai certo ao copiar)
function trocarTituloSomatoria(th, ligado) {
  const walker = document.createTreeWalker(th, NodeFilter.SHOW_TEXT);
  const nos = [];
  while (walker.nextNode()) nos.push(walker.currentNode);
  nos.forEach((n) => {
    if (ligado) {
      if (/somat/i.test(n.nodeValue)) {
        n.__rcoOriginal = n.nodeValue;
        n.nodeValue = n.nodeValue.replace(/somat\S*/i, "3º Tri");
      }
    } else if (n.__rcoOriginal != null) {
      if (n.nodeValue.includes("3º Tri")) n.nodeValue = n.__rcoOriginal;
      delete n.__rcoOriginal;
    }
  });
}

function lerCabecalho(tabela) {
  const linhaCab = Array.from(tabela.querySelectorAll("tr")).find((tr) =>
    Array.from(tr.children).some((c) => c.tagName === "TH" && ehThSomatoria(c))
  );
  if (!linhaCab) return null;

  const ths = celulasOriginais(linhaCab);
  const textos = ths.map((th) => th.textContent.replace(/\s+/g, " ").trim().toUpperCase());
  const idxSomatoria = ths.findIndex(ehThSomatoria);
  const idxNome = textos.findIndex((t) => t.includes("NOME"));
  const idxsAvaliacoes = textos
    .map((t, i) => (/\bAV\s*\d/.test(t) || t.includes("RECUPERA") ? i : -1))
    .filter((i) => i >= 0 && i < idxSomatoria);

  return { linhaCab, ths, idxSomatoria, idxNome, idxsAvaliacoes };
}

function linhasDeDados(tabela, cab) {
  return Array.from(tabela.querySelectorAll("tr")).filter((tr) => {
    if (tr === cab.linhaCab) return false;
    const tds = celulasOriginais(tr);
    return tds.length > cab.idxSomatoria && tds.every((c) => c.tagName === "TD");
  });
}

const lerNumeroTexto = (t) => {
  const s = String(t || "").trim().replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
};

// Só escreve no DOM quando algo mudou (evita laço com o observador)
function definirCelula(cel, { texto, classe, titulo }) {
  if (cel.textContent !== texto) cel.textContent = texto;
  const cls = `rco-cel ${classe || ""}`.trim();
  if (cel.className !== cls) cel.className = cls;
  if ((cel.title || "") !== (titulo || "")) cel.title = titulo || "";
}

function trocarClasse(el, remover, adicionar) {
  remover.forEach((c) => c !== adicionar && el.classList.contains(c) && el.classList.remove(c));
  if (adicionar && !el.classList.contains(adicionar)) el.classList.add(adicionar);
}

// ------------------------------------------------------------
// BOTÃO LIGA/DESLIGA (sempre começa desligado)
// ------------------------------------------------------------
let modoPrevisao = false;
let modoTocado = false; // o professor já usou o botão nesta página

function garantirBarra(tabela) {
  let barra = document.querySelector(".rco-barra-previsao");
  if (!barra) {
    barra = document.createElement("div");
    barra.className = "rco-barra-previsao";

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "rco-switch";
    botao.setAttribute("role", "switch");
    botao.innerHTML = '<span class="rco-trilho"><span class="rco-bolinha"></span></span><span>Mostrar 1º e 2º trimestre</span>';
    botao.addEventListener("click", () => {
      modoPrevisao = !modoPrevisao;
      modoTocado = true;
      sincronizar();
    });

    const aviso = document.createElement("span");
    aviso.className = "rco-aviso";
    barra.append(botao, aviso);
  }
  if (tabela.previousElementSibling !== barra) tabela.insertAdjacentElement("beforebegin", barra);

  const botao = barra.querySelector(".rco-switch");
  if (botao.getAttribute("aria-checked") !== String(modoPrevisao)) {
    botao.setAttribute("aria-checked", String(modoPrevisao));
  }

  // só aparece texto se algo der errado
  const texto = estado.status?.tipo === "aviso" ? estado.status.texto : "";
  const aviso = barra.querySelector(".rco-aviso");
  if (aviso.textContent !== texto) aviso.textContent = texto;
}

function removerBarra() {
  document.querySelector(".rco-barra-previsao")?.remove();
}

// ------------------------------------------------------------
// COLUNAS EXTRAS NA TABELA DO RCO
// 1º Tri | 2º Tri | [Somatória → "3º Tri"] | Meta no 3º Tri | Média Anual
// ------------------------------------------------------------
const ANTES = [["t1", "1º Tri"], ["t2", "2º Tri"]];
const DEPOIS = [["meta", "Meta no 3º Tri"], ["media", "Média Anual"]];

// Garante um grupo de células vizinhas à célula de referência (a Somatória)
function garantirGrupo(tr, ref, colunas, lado, tag) {
  const achadas = [];
  let p = lado === "antes" ? ref.previousElementSibling : ref.nextElementSibling;
  const ordem = lado === "antes" ? [...colunas].reverse() : colunas;
  for (const [col] of ordem) {
    if (!p || !p.classList.contains("rco-cel") || p.dataset.col !== col) break;
    achadas.push(p);
    p = lado === "antes" ? p.previousElementSibling : p.nextElementSibling;
  }
  if (achadas.length === colunas.length) return lado === "antes" ? achadas.reverse() : achadas;

  const nomes = new Set(colunas.map(([c]) => c));
  Array.from(tr.children).forEach((c) => {
    if (c.classList.contains("rco-cel") && nomes.has(c.dataset.col)) c.remove();
  });

  const ancora = lado === "antes" ? ref : ref.nextSibling;
  return colunas.map(([col]) => {
    const c = document.createElement(tag);
    c.className = "rco-cel";
    c.dataset.col = col;
    tr.insertBefore(c, ancora);
    return c;
  });
}

function garantirColunas(tabela, cab) {
  const thSom = cab.ths[cab.idxSomatoria];
  if (!thSom.classList.contains("rco-th-somatoria")) thSom.classList.add("rco-th-somatoria");


  garantirGrupo(cab.linhaCab, thSom, ANTES, "antes", "th")
    .forEach((th, i) => definirCelula(th, { texto: ANTES[i][1], classe: "", titulo: "" }));
  garantirGrupo(cab.linhaCab, thSom, DEPOIS, "depois", "th")
    .forEach((th, i) => definirCelula(th, { texto: DEPOIS[i][1], classe: "", titulo: "" }));

  linhasDeDados(tabela, cab).forEach((tr) => {
    const tds = celulasOriginais(tr);
    const tdSom = tds[cab.idxSomatoria];
    const chave = normalizarNome(tds[cab.idxNome]?.textContent);
    const antes = garantirGrupo(tr, tdSom, ANTES, "antes", "td");
    const depois = garantirGrupo(tr, tdSom, DEPOIS, "depois", "td");

    if (!chave) {
      [...antes, ...depois].forEach((c) => definirCelula(c, { texto: "", classe: "", titulo: "" }));
      return;
    }
    const linha = calcularLinha(chave, lerNumeroTexto(tdSom.textContent));
    antes.forEach((c, i) => definirCelula(c, linha[ANTES[i][0]]));
    depois.forEach((c, i) => definirCelula(c, linha[DEPOIS[i][0]]));
  });
}

function removerColunas(tabela) {
  tabela.querySelectorAll(".rco-cel").forEach((c) => c.remove());
  tabela.querySelectorAll(".rco-th-somatoria").forEach((c) => {
    trocarTituloSomatoria(c, false);
    c.classList.remove("rco-th-somatoria");
  });

  ["rco-modo-previsao", "rco-negrito", "rco-mostrar-av", "rco-sem-meta", "rco-sem-media"]
    .forEach((c) => tabela.classList.remove(c));
}

function alternarClasse(el, classe, ligado) {
  if (el.classList.contains(classe) !== ligado) el.classList.toggle(classe, ligado);
}

function aplicarModo(tabela, cab) {
  alternarClasse(tabela, "rco-modo-previsao", modoPrevisao);
  alternarClasse(tabela, "rco-negrito", opcoes.negrito);
  alternarClasse(tabela, "rco-mostrar-av", !opcoes.ocultarAvaliacoes);
  alternarClasse(tabela, "rco-sem-meta", !opcoes.colunaMeta);
  alternarClasse(tabela, "rco-sem-media", !opcoes.colunaMedia);
  if (!cab.linhaCab.classList.contains("rco-cab")) cab.linhaCab.classList.add("rco-cab");
  trocarTituloSomatoria(cab.ths[cab.idxSomatoria], modoPrevisao);

  // esconde AV1, AV2, recuperações... enquanto o modo estiver ligado
  const css = cab.idxsAvaliacoes
    .map((i) =>
      `table.rco-modo-previsao:not(.rco-mostrar-av) tr.rco-cab > :nth-child(${i + 1}),` +
      `table.rco-modo-previsao:not(.rco-mostrar-av) tbody > tr > :nth-child(${i + 1}) { display: none; }`
    )
    .join("\n");
  let style = document.getElementById("rco-previsao-ocultas");
  if (!style) {
    style = document.createElement("style");
    style.id = "rco-previsao-ocultas";
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

function colorirSomatorias(tabela, cab) {
  linhasDeDados(tabela, cab).forEach((tr) => {
    const td = celulasOriginais(tr)[cab.idxSomatoria];
    if (!td.classList.contains("rco-td-somatoria")) td.classList.add("rco-td-somatoria");
    trocarClasse(td, ["rco-verde", "rco-vermelho"], classeNota(lerNumeroTexto(td.textContent)) || null);
  });
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO
// ------------------------------------------------------------
function sincronizar() {
  injetarEstilos();
  const tabela = localizarTabela();
  if (!tabela) {
    removerBarra();
    return;
  }
  const cab = lerCabecalho(tabela);
  if (!cab || cab.idxSomatoria < 0 || cab.idxNome < 0) return;

  colorirSomatorias(tabela, cab);

  if (!estado || estado.tri !== 3 || !opcoes.previsao) {
    removerColunas(tabela);
    removerBarra();
    return;
  }

  garantirBarra(tabela);
  garantirColunas(tabela, cab);
  aplicarModo(tabela, cab);
}

// chamado pelo fluxo principal quando os dados mudam
function atualizarPainel() {
  agendarSync();
}

let timerDom = null;
function agendarSync() {
  clearTimeout(timerDom);
  timerDom = setTimeout(sincronizar, 150);
}

new MutationObserver((muts) => {
  const relevante = muts.some((m) => {
    const alvo = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    return !alvo?.closest?.(".rco-cel, .rco-barra-previsao");
  });
  if (relevante) agendarSync();
}).observe(document.body, { childList: true, subtree: true, characterData: true });

agendarSync();

// ------------------------------------------------------------
// CSS – só verde/vermelho nas notas; o resto herda o visual do RCO
// ------------------------------------------------------------
function injetarEstilos() {
  if (document.getElementById("rco-previsao-style")) return;
  const style = document.createElement("style");
  style.id = "rco-previsao-style";
  style.textContent = `
    .rco-verde, .rco-verde *       { color: #2e7d32 !important; }
    .rco-vermelho, .rco-vermelho * { color: #d32f2f !important; }

    table:not(.rco-modo-previsao) .rco-cel { display: none; }

    table.rco-sem-meta .rco-cel[data-col="meta"],
    table.rco-sem-media .rco-cel[data-col="media"] { display: none; }

    /* modo ligado: números das colunas em negrito (opção do painel) */
    table.rco-modo-previsao.rco-negrito td.rco-cel,
    table.rco-modo-previsao.rco-negrito td.rco-td-somatoria,
    table.rco-modo-previsao.rco-negrito td.rco-td-somatoria * { font-weight: 700 !important; }


    .rco-barra-previsao {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 16px;
      padding: 8px 4px 10px;
    }
    .rco-switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 2px 4px;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .rco-switch:focus-visible { outline: 2px solid #1e88e5; outline-offset: 2px; border-radius: 4px; }
    .rco-trilho {
      position: relative;
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: #9e9e9e;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .rco-bolinha {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      transition: transform 0.15s;
    }
    .rco-switch[aria-checked="true"] .rco-trilho { background: #1e88e5; }
    .rco-switch[aria-checked="true"] .rco-bolinha { transform: translateX(16px); }
    .rco-aviso { color: #b26a00; }
    @media (prefers-reduced-motion: reduce) {
      .rco-trilho, .rco-bolinha { transition: none; }
    }
  `;
  document.head.appendChild(style);
}
