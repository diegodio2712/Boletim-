// ============================================================
// Boletim+ | roda no contexto da página (world: MAIN)
// 1) Observa a consulta avaliacaoParcialAlunos que o RCO faz.
// 2) Quando o content.js pede, repete essa consulta para outro
//    codPeriodoAvaliacao, com os mesmos cabeçalhos (token e
//    consumerid). Os cabeçalhos nunca saem deste script.
// ============================================================
(() => {
  if (window.__RCO_PREVISAO_INJ__) return;
  window.__RCO_PREVISAO_INJ__ = true;

  const TAG = "rco-previsao";
  const HOST = "apigateway-educacao.paas.pr.gov.br";
  const CAMINHO = /\/relatorios\/avaliacaoParcialAlunos$/;
  const fetchOriginal = window.fetch;
  const bases = new Map(); // codClasse -> { url, headers }

  const enviar = (m) => window.postMessage({ [TAG]: m.tipo, ...m }, location.origin);

  function ehAlvo(u) {
    try {
      const x = new URL(u, location.href);
      return x.hostname === HOST && CAMINHO.test(x.pathname);
    } catch {
      return false;
    }
  }

  function headersObj(h) {
    try { return Object.fromEntries(new Headers(h || {}).entries()); } catch { return {}; }
  }

  function lerCampos(v) {
    try { return JSON.parse(v || "null"); } catch { return null; }
  }

  function registrar(url, headers, status, campos, dados) {
    if (status !== 200 || !Array.isArray(dados)) return;
    const x = new URL(url, location.href);
    const codClasse = x.searchParams.get("codClasse");
    const codPeriodo = Number(x.searchParams.get("codPeriodoAvaliacao"));
    if (!codClasse || !codPeriodo) return;
    bases.set(codClasse, { url: x.href, headers });
    enviar({ tipo: "alunos", codClasse, codPeriodo, campos, dados });
  }

  // ---------------- fetch ----------------
  window.fetch = async function (input, init) {
    const resp = await fetchOriginal.call(window, input, init);
    try {
      const req = input instanceof Request ? input : null;
      const url = req ? req.url : String(input);
      if (ehAlvo(url)) {
        const headers = { ...headersObj(req?.headers), ...headersObj(init?.headers) };
        const campos = lerCampos(resp.headers.get("fields"));
        resp.clone().json()
          .then((d) => registrar(url, headers, resp.status, campos, d))
          .catch(() => {});
      }
    } catch {}
    return resp;
  };

  // ---------------- XMLHttpRequest ----------------
  const XP = XMLHttpRequest.prototype;
  const { open, send, setRequestHeader } = XP;

  XP.open = function (m, u, ...resto) {
    this.__rcoPrev = ehAlvo(u) ? { url: new URL(String(u), location.href).href, headers: {} } : null;
    return open.call(this, m, u, ...resto);
  };

  XP.setRequestHeader = function (k, v) {
    if (this.__rcoPrev) this.__rcoPrev.headers[k.toLowerCase()] = v;
    return setRequestHeader.call(this, k, v);
  };

  XP.send = function (body) {
    const meta = this.__rcoPrev;
    if (meta) {
      this.addEventListener("load", () => {
        try {
          let dados;
          if (this.responseType === "json") dados = this.response;
          else if (this.responseType === "" || this.responseType === "text") dados = JSON.parse(this.responseText);
          else return;
          registrar(meta.url, meta.headers, this.status, lerCampos(this.getResponseHeader("fields")), dados);
        } catch {}
      });
    }
    return send.call(this, body);
  };

  // ---------------- pedidos do content.js ----------------
  window.addEventListener("message", async (ev) => {
    if (ev.source !== window || !ev.data || ev.data[TAG] !== "buscar") return;
    const { reqId, codClasse, codPeriodo } = ev.data;
    const r = { tipo: "resposta", reqId };

    try {
      const base = bases.get(String(codClasse));
      if (!base) throw new Error("consulta original não encontrada");
      const u = new URL(base.url);
      u.searchParams.set("codPeriodoAvaliacao", String(Number(codPeriodo)));

      const resp = await fetchOriginal.call(window, u.href, { headers: base.headers });
      r.status = resp.status;
      if (resp.status === 401 || resp.status === 403) throw new Error("sessão expirada, recarregue a página");
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      r.campos = lerCampos(resp.headers.get("fields"));
      r.dados = await resp.json();
    } catch (e) {
      r.erro = e.message || String(e);
    }

    enviar(r);
  });
})();
