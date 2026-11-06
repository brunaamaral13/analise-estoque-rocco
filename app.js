(() => {
  const RANK_FILE = "Mais vendidos Rocco.csv";
  const IDLE_DAYS = 90;
  const IDLE_DAYS_LONG = 180;
  const TOP_SALDO_RANK = 150;
  const TARGET_OK_SALDO = 8;
  const SELLER_STORAGE_KEY = "rocco_estoque_vendedor";

  // URL do Apps Script (planilha de acessos).
  const ACCESS_LOG_URL = "https://script.google.com/macros/s/AKfycbwN9jd81SoPOJ5LuhA-e3PHld7Ql_On7hU2fG2LwZa6BKoODqHhMP6XmKHeeSbuzMeg/exec";

  const SELLERS = [
    "Bruna",
    "Geysa",
    "Gilsan",
    "Michael",
    "Rafaela",
    "Rossano",
    "Salete",
    "Silvia",
  ];

  const els = {
    sellerGate: document.getElementById("sellerGate"),
    sellerGateList: document.getElementById("sellerGateList"),
    btnSellerContinue: document.getElementById("btnSellerContinue"),
    appShell: document.getElementById("appShell"),
    sellerNameLabel: document.getElementById("sellerNameLabel"),
    btnChangeSeller: document.getElementById("btnChangeSeller"),
    rankMeta: document.getElementById("rankMeta"),
    mapaMeta: document.getElementById("mapaMeta"),
    btnImport: document.getElementById("btnImport"),
    btnImportMain: document.getElementById("btnImportMain"),
    emptyHint: document.getElementById("emptyHint"),
    fileMapa: document.getElementById("fileMapa"),
    clientBar: document.getElementById("clientBar"),
    clientSelect: document.getElementById("clientSelect"),
    clientQuery: document.getElementById("clientQuery"),
    clientResults: document.getElementById("clientResults"),
    clientMeta: document.getElementById("clientMeta"),
    sideKpis: document.getElementById("sideKpis"),
    kpiMatch: document.getElementById("kpiMatch"),
    kpiZero: document.getElementById("kpiZero"),
    kpiIdle: document.getElementById("kpiIdle"),
    kpiIdle180: document.getElementById("kpiIdle180"),
    topSub: document.getElementById("topSub"),
    sideActiveFilters: document.getElementById("sideActiveFilters"),
    mainActiveFilters: document.getElementById("mainActiveFilters"),
    btnClearFilters: document.getElementById("btnClearFilters"),
    q: document.getElementById("q"),
    summary: document.getElementById("summary"),
    sumIsbns: document.getElementById("sumIsbns"),
    sumVolume: document.getElementById("sumVolume"),
    sumValue: document.getElementById("sumValue"),
    actions: document.getElementById("actions"),
    sumRoteiro: document.getElementById("sumRoteiro"),
    sumCoverage: document.getElementById("sumCoverage"),
    sumCoverageMeta: document.getElementById("sumCoverageMeta"),
    sumIdleValue: document.getElementById("sumIdleValue"),
    sumIdleMeta: document.getElementById("sumIdleMeta"),
    sumRestockValue: document.getElementById("sumRestockValue"),
    filters: document.getElementById("filters"),
    emptyState: document.getElementById("emptyState"),
    emptyTitle: document.getElementById("emptyTitle"),
    emptyText: document.getElementById("emptyText"),
    grid: document.getElementById("grid"),
    tbody: document.getElementById("tbody"),
  };

  const state = {
    seller: null,
    sellerPick: null,
    ranking: [],
    mapaRows: [],
    stockByKey: new Map(),
    stockLookup: new Map(),
    clients: [],
    selectedClient: null,
    clientQuery: "",
    filter: "all",
    query: "",
    sortKey: "ranking",
    sortDir: "asc",
    mapaQuality: null,
  };

  function logSellerAccess(vendedor) {
    if (!ACCESS_LOG_URL || !vendedor) return;
    const url = `${ACCESS_LOG_URL}${ACCESS_LOG_URL.includes("?") ? "&" : "?"}vendedor=${encodeURIComponent(vendedor)}&t=${Date.now()}`;
    // Image + fetch: mais confiável com o redirect do Apps Script
    try {
      const img = new Image();
      img.src = url;
    } catch (err) {
      // ignore
    }
    fetch(url, { method: "GET", mode: "no-cors", keepalive: true }).catch(() => {});
  }

  function renderSellerGateOptions() {
    if (!els.sellerGateList) return;
    els.sellerGateList.innerHTML = SELLERS.map((name) => `
      <button type="button" class="seller-gate-option${state.sellerPick === name ? " is-selected" : ""}" data-seller="${escapeHtml(name)}" role="option" aria-selected="${state.sellerPick === name ? "true" : "false"}">
        ${escapeHtml(name)}
      </button>
    `).join("");
    if (els.btnSellerContinue) els.btnSellerContinue.disabled = !state.sellerPick;
  }

  function showSellerGate() {
    state.sellerPick = state.seller && SELLERS.includes(state.seller) ? state.seller : null;
    if (els.sellerGate) els.sellerGate.hidden = false;
    if (els.appShell) els.appShell.hidden = true;
    if (els.btnImport) els.btnImport.disabled = true;
    if (els.btnImportMain) els.btnImportMain.disabled = true;
    renderSellerGateOptions();
  }

  function enterApp(vendedor, { log = true } = {}) {
    if (!SELLERS.includes(vendedor)) return;
    state.seller = vendedor;
    state.sellerPick = vendedor;
    try {
      sessionStorage.setItem(SELLER_STORAGE_KEY, vendedor);
    } catch (err) {
      // ignore storage errors
    }
    if (els.sellerNameLabel) els.sellerNameLabel.textContent = vendedor;
    if (els.sellerGate) els.sellerGate.hidden = true;
    if (els.appShell) els.appShell.hidden = false;
    if (els.btnImport) els.btnImport.disabled = false;
    if (els.btnImportMain) els.btnImportMain.disabled = false;
    if (els.topSub && !state.selectedClient) {
      els.topSub.textContent = `${vendedor} · importe o Mapão do cliente para ver o saldo ao lado do ranking Rocco.`;
    }
    if (log) logSellerAccess(vendedor);
  }

  function initSellerGate() {
    let saved = "";
    try {
      saved = sessionStorage.getItem(SELLER_STORAGE_KEY) || "";
    } catch (err) {
      saved = "";
    }

    if (els.sellerGateList) {
      els.sellerGateList.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-seller]");
        if (!btn) return;
        state.sellerPick = btn.dataset.seller;
        renderSellerGateOptions();
      });
    }

    if (els.btnSellerContinue) {
      els.btnSellerContinue.addEventListener("click", () => {
        if (!state.sellerPick) return;
        enterApp(state.sellerPick, { log: true });
      });
    }

    if (els.btnChangeSeller) {
      els.btnChangeSeller.addEventListener("click", () => showSellerGate());
    }

    if (saved && SELLERS.includes(saved)) {
      // Mesma aba/sessão: não regrava acesso
      enterApp(saved, { log: false });
    } else {
      showSellerGate();
    }
  }

  function parseNumber(value) {
    if (value == null || value === "") return null;
    let cleaned = String(value).trim();
    if (/[eE][+-]?\d+/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function expandIsbnCandidate(value) {
    if (value == null || value === "") return "";
    let raw = String(value).trim();
    if (/[eE][+-]?\d+/.test(raw)) {
      const n = Number(raw.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) return "";
      raw = String(Math.round(n));
    }
    return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
  }

  function isbn10To13(isbn10) {
    const core = String(isbn10 || "").toUpperCase();
    if (!/^\d{9}[\dX]$/.test(core)) return "";
    const body = `978${core.slice(0, 9)}`;
    let sum = 0;
    for (let i = 0; i < 12; i += 1) {
      sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return `${body}${check}`;
  }

  function isbn13To10(isbn13) {
    const core = String(isbn13 || "");
    if (!/^978\d{10}$/.test(core)) return "";
    const body = core.slice(3, 12);
    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(body[i]) * (10 - i);
    const checkNum = (11 - (sum % 11)) % 11;
    const check = checkNum === 10 ? "X" : String(checkNum);
    return `${body}${check}`;
  }

  function isReliableIsbn(isbn) {
    if (!isbn) return false;
    if (!/^\d{9}[\dX]$|^\d{13}$/.test(isbn)) return false;
    // Excel costuma truncar ISBN-13 em notação científica (muitos zeros no fim).
    if (isbn.length === 13 && /0{5,}$/.test(isbn)) return false;
    return true;
  }

  function normalizeIsbn(value) {
    const isbn = expandIsbnCandidate(value);
    if (!isbn) return "";
    if (isbn.length === 10) return isbn10To13(isbn) || isbn;
    if (isbn.length === 13) return isbn;
    return isbn;
  }

  function isbnAliases(value) {
    const aliases = new Set();
    const raw = expandIsbnCandidate(value);
    const normalized = normalizeIsbn(value);
    [raw, normalized].forEach((v) => {
      if (v) aliases.add(v);
    });
    if (normalized && normalized.length === 13) {
      const as10 = isbn13To10(normalized);
      if (as10) aliases.add(as10);
    }
    if (raw && raw.length === 10) {
      const as13 = isbn10To13(raw);
      if (as13) aliases.add(as13);
    }
    return [...aliases].filter(isReliableIsbn);
  }

  function normalizeTitle(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function parseIntSafe(value) {
    const n = parseNumber(value);
    return n == null ? null : Math.round(n);
  }

  function money(value) {
    if (value == null) return "—";
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ";") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (ch !== "\r") {
        cell += ch;
      }
    }

    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows[0].map((h) => String(h || "").trim().toLowerCase());
    return rows.slice(1)
      .filter((r) => r.some((c) => String(c || "").trim() !== ""))
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = r[idx] == null ? "" : String(r[idx]).trim();
        });
        return obj;
      });
  }

  function scoreText(text) {
    let score = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (ch === "\uFFFD") score -= 50;
      else if (
        "áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ".includes(ch) ||
        (code >= 0xc0 && code <= 0xff)
      ) {
        score += 3;
      }
    }
    return score;
  }

  function decodeCsvBuffer(buffer) {
    const utf8 = new TextDecoder("utf-8").decode(buffer);
    let ansi = utf8;
    try {
      ansi = new TextDecoder("windows-1252").decode(buffer);
    } catch {
      /* ignore */
    }
    if (utf8.includes("\uFFFD")) return ansi;
    return scoreText(ansi) > scoreText(utf8) ? ansi : utf8;
  }

  async function loadRanking() {
    try {
      const res = await fetch(encodeURI(RANK_FILE));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const text = decodeCsvBuffer(buffer);
      const rows = parseCsv(text);

      state.ranking = rows
        .map((r) => ({
          isbn: normalizeIsbn(r.isbn),
          aliases: isbnAliases(r.isbn),
          titulo: r.titulo || "",
          titleKey: normalizeTitle(r.titulo || ""),
          autor: r.autor || "",
          ranking: parseIntSafe(r.ranking),
        }))
        .filter((r) => r.isbn && r.ranking != null && r.ranking > 0)
        .sort((a, b) => a.ranking - b.ranking);

      const last = state.ranking.at(-1)?.ranking || "—";
      els.rankMeta.textContent = `${state.ranking.length.toLocaleString("pt-BR")} títulos no ranking (1 a ${last})`;
    } catch (err) {
      console.error(err);
      els.rankMeta.textContent = "Não foi possível carregar o ranking. Abra o dashboard por um servidor local (não pelo file://).";
    }
  }

  function buildClientStock(rows, clientCode) {
    const byKey = new Map();
    const lookup = new Map();
    let totalRows = 0;
    let badIsbnRows = 0;

    function registerAlias(alias, key) {
      if (!alias || lookup.has(alias)) return;
      lookup.set(alias, key);
    }

    rows
      .filter((r) => String(r.codigo) === String(clientCode))
      .forEach((r) => {
        totalRows += 1;
        const aliases = [
          ...isbnAliases(r.isbn),
          ...isbnAliases(r.codbarra),
        ];
        const reliable = aliases.find(isReliableIsbn) || "";
        if (!reliable) badIsbnRows += 1;

        const titleKey = normalizeTitle(r.titulo || "");
        const codLivro = String(r.codlivro || "").trim();
        const key = reliable
          || (codLivro ? `COD:${codLivro}` : "")
          || (titleKey ? `TIT:${titleKey}` : "")
          || `ROW:${totalRows}`;

        const prev = byKey.get(key) || {
          key,
          isbn: reliable || "",
          titulo: r.titulo || "",
          titleKey,
          preco: parseNumber(r.preco),
          consignado: 0,
          valorLiquido: 0,
          fdias: null,
          vendido: 0,
          matchedRanking: false,
        };

        const qty = parseIntSafe(r.consignado) || 0;
        const preco = parseNumber(r.preco);
        const desconto = parseNumber(r.perdesconto) || 0;
        const fator = Math.max(0, 1 - desconto / 100);

        prev.consignado += qty;
        prev.vendido += parseIntSafe(r.vendido) || 0;
        if (preco != null && qty) {
          prev.valorLiquido += preco * qty * fator;
        }

        const fdias = parseIntSafe(r.fdias);
        if (fdias != null) {
          prev.fdias = prev.fdias == null ? fdias : Math.max(prev.fdias, fdias);
        }
        if (prev.preco == null) prev.preco = preco;
        if (!prev.titulo) prev.titulo = r.titulo || "";
        if (!prev.isbn && reliable) prev.isbn = reliable;

        byKey.set(key, prev);
        aliases.forEach((alias) => registerAlias(alias, key));
        if (titleKey) registerAlias(`T:${titleKey}`, key);
        if (codLivro) registerAlias(`COD:${codLivro}`, key);
      });

    return {
      byKey,
      lookup,
      totalRows,
      badIsbnRows,
      uniqueTitles: byKey.size,
    };
  }

  function findStockForRanking(item) {
    for (const alias of item.aliases || isbnAliases(item.isbn)) {
      const key = state.stockLookup.get(alias);
      if (key && state.stockByKey.has(key)) return state.stockByKey.get(key);
    }
    if (item.titleKey) {
      const key = state.stockLookup.get(`T:${item.titleKey}`);
      if (key && state.stockByKey.has(key)) return state.stockByKey.get(key);
    }
    return null;
  }

  function listClients(rows) {
    const byCode = new Map();
    rows.forEach((r) => {
      const code = String(r.codigo || "").trim();
      if (!code) return;
      if (!byCode.has(code)) {
        byCode.set(code, {
          codigo: code,
          nome: r.nome || "Cliente sem nome",
          cidade: r.cidade || "",
          estado: r.estado || "",
        });
      }
    });
    return [...byCode.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function normalizeSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function filteredClients() {
    const q = normalizeSearch(state.clientQuery);
    if (!q) return state.clients;
    return state.clients.filter((c) => {
      const blob = normalizeSearch(`${c.codigo} ${c.nome} ${c.cidade} ${c.estado}`);
      return blob.includes(q) || normalizeSearch(c.codigo).startsWith(q);
    });
  }

  function pickBestClientMatch(list, query) {
    const q = normalizeSearch(query);
    if (!q || !list.length) return null;
    const exactCode = list.find((c) => normalizeSearch(c.codigo) === q);
    if (exactCode) return exactCode;
    if (list.length === 1) return list[0];
    return null;
  }

  function situation(stock, ranking) {
      if (!stock) {
      if (ranking != null) {
        return {
          key: "rupture",
          label: "Em ruptura,<br>repor com urgência",
          className: "badge-urgent",
        };
      }
      return { key: "miss", label: "Fora do Mapão", className: "badge-miss" };
    }

    const saldo = stock.consignado || 0;
    const inTop150 = ranking != null && ranking >= 1 && ranking <= TOP_SALDO_RANK;

    if (saldo <= 0) return { key: "zero", label: "Sem estoque", className: "badge-zero" };

    const fdias = stock.fdias || 0;

    // 180+ dias: sempre "Pedir devolução", mesmo no Top 150.
    if (fdias >= IDLE_DAYS_LONG) {
      return {
        key: "idle180",
        label: "Pedir<br>devolução",
        className: "badge-return",
      };
    }

    // Reposição do Top 150 tem prioridade sobre acerto 90+.
    if (inTop150) {
      if (saldo <= 3) return { key: "urgent", label: "Repor com<br>urgência", className: "badge-urgent" };
      if (saldo <= 7) return { key: "alert", label: "Alerta<br>reposição", className: "badge-alert" };
    }

    if (fdias >= IDLE_DAYS) {
      return {
        key: "idle",
        label: "Puxar acerto/<br>pedir devolução",
        className: "badge-idle",
      };
    }

    if (inTop150) return { key: "ok", label: "Com saldo", className: "badge-ok" };
    return { key: "ok", label: "Com estoque", className: "badge-ok" };
  }

  function buildAllRows() {
    const matchedKeys = new Set();

    const ranked = state.ranking.map((item) => {
      const stock = findStockForRanking(item);
      if (stock) {
        stock.matchedRanking = true;
        matchedKeys.add(stock.key);
      }
      return {
        isbn: item.isbn,
        titulo: item.titulo,
        autor: item.autor || "",
        ranking: item.ranking,
        inRanking: true,
        stock,
        sit: situation(stock, item.ranking),
      };
    });

    const extras = [...state.stockByKey.values()]
      .filter((stock) => !matchedKeys.has(stock.key))
      .map((stock) => ({
        isbn: stock.isbn || "—",
        titulo: stock.titulo || "Sem título",
        autor: "",
        ranking: null,
        inRanking: false,
        stock,
        sit: situation(stock, null),
      }))
      .sort((a, b) => {
        const saldoDiff = (b.stock.consignado || 0) - (a.stock.consignado || 0);
        if (saldoDiff !== 0) return saldoDiff;
        return (b.stock.fdias || 0) - (a.stock.fdias || 0);
      });

    return ranked.concat(extras);
  }

  function sortValue(row, key) {
    switch (key) {
      case "ranking":
        return row.inRanking ? row.ranking : Number.POSITIVE_INFINITY;
      case "titulo":
        return (row.titulo || "").toLocaleLowerCase("pt-BR");
      case "isbn":
        return row.isbn || "";
      case "preco":
        return row.stock?.preco == null ? Number.NEGATIVE_INFINITY : row.stock.preco;
      case "saldo":
        return row.stock?.consignado == null ? Number.NEGATIVE_INFINITY : row.stock.consignado;
      case "fdias":
        return row.stock?.fdias == null ? Number.NEGATIVE_INFINITY : row.stock.fdias;
      case "vendido":
        return row.stock?.vendido == null ? Number.NEGATIVE_INFINITY : row.stock.vendido;
      case "situacao":
        return String(row.sit?.label || "").replace(/<br\s*\/?>/gi, " ");
      default:
        return 0;
    }
  }

  function compareRows(a, b) {
    const av = sortValue(a, state.sortKey);
    const bv = sortValue(b, state.sortKey);
    let cmp = 0;

    if (typeof av === "string" || typeof bv === "string") {
      cmp = String(av).localeCompare(String(bv), "pt-BR", { numeric: true, sensitivity: "base" });
    } else {
      cmp = av - bv;
    }

    if (cmp === 0) {
      const ar = a.inRanking ? a.ranking : Number.POSITIVE_INFINITY;
      const br = b.inRanking ? b.ranking : Number.POSITIVE_INFINITY;
      cmp = ar - br;
      if (cmp === 0) cmp = String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR");
    }

    return state.sortDir === "asc" ? cmp : -cmp;
  }

  function rowsForRender() {
    const q = state.query.trim().toLowerCase();

    return buildAllRows()
      .filter((row) => {
        if (state.filter === "ranking" && !row.inRanking) return false;
        if (state.filter === "extra" && row.inRanking) return false;
        if (
          state.filter === "com"
          && !["ok", "idle", "idle180", "alert", "urgent"].includes(row.sit.key)
        ) return false;
        if (
          state.filter === "sem"
          && row.sit.key !== "zero"
          && row.sit.key !== "rupture"
        ) return false;
        if (state.filter === "urgent" && row.sit.key !== "urgent") return false;
        if (state.filter === "alert" && row.sit.key !== "alert") return false;
        if (state.filter === "parado90") {
          if ((row.stock?.consignado || 0) <= 0) return false;
          if ((row.stock?.fdias || 0) < IDLE_DAYS) return false;
        }
        if (state.filter === "parado180") {
          if ((row.stock?.consignado || 0) <= 0) return false;
          if ((row.stock?.fdias || 0) < IDLE_DAYS_LONG) return false;
        }
        if (!q) return true;
        const blob = `${row.titulo} ${row.autor} ${row.isbn}`.toLowerCase();
        return blob.includes(q);
      })
      .sort(compareRows);
  }

  function updateSortHeaders() {
    els.grid.querySelectorAll("th.sortable").forEach((th) => {
      const key = th.dataset.sort;
      const active = key === state.sortKey;
      th.setAttribute("aria-sort", active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none");
      th.classList.toggle("is-sorted", active);
      th.classList.toggle("is-asc", active && state.sortDir === "asc");
      th.classList.toggle("is-desc", active && state.sortDir === "desc");
    });
  }

  function updateKpis() {
    let match = 0;
    let zero = 0;
    let idle90 = 0;
    let idle180 = 0;
    const matchedKeys = new Set();

    state.ranking.forEach((item) => {
      const stock = findStockForRanking(item);
      if (!stock) {
        zero += 1;
        return;
      }
      match += 1;
      matchedKeys.add(stock.key);
      if ((stock.consignado || 0) <= 0) zero += 1;
      if ((stock.fdias || 0) >= IDLE_DAYS) idle90 += 1;
      if ((stock.fdias || 0) >= IDLE_DAYS_LONG) idle180 += 1;
    });

    state.stockByKey.forEach((stock) => {
      if (matchedKeys.has(stock.key)) return;
      if ((stock.consignado || 0) <= 0) zero += 1;
      if ((stock.fdias || 0) >= IDLE_DAYS) idle90 += 1;
      if ((stock.fdias || 0) >= IDLE_DAYS_LONG) idle180 += 1;
    });

    els.kpiMatch.textContent = match.toLocaleString("pt-BR");
    els.kpiZero.textContent = zero.toLocaleString("pt-BR");
    els.kpiIdle.textContent = idle90.toLocaleString("pt-BR");
    els.kpiIdle180.textContent = idle180.toLocaleString("pt-BR");
  }

  function updateSummary(rows) {
    let isbns = 0;
    let volume = 0;
    let valor = 0;

    rows.forEach((row) => {
      if (!row.stock) return;
      const qty = row.stock.consignado || 0;
      if (qty <= 0) return;
      isbns += 1;
      volume += qty;
      valor += row.stock.valorLiquido || 0;
    });

    els.sumIsbns.textContent = isbns.toLocaleString("pt-BR");
    els.sumVolume.textContent = volume.toLocaleString("pt-BR");
    els.sumValue.textContent = money(valor);
  }

  function unitNetPrice(stock) {
    if (!stock) return null;
    if ((stock.consignado || 0) > 0 && (stock.valorLiquido || 0) > 0) {
      return stock.valorLiquido / stock.consignado;
    }
    return stock.preco == null ? null : stock.preco;
  }

  function updateActionKpis() {
    let urgent = 0;
    let alert = 0;
    let acerto = 0;
    let idle180Count = 0;
    let top150 = 0;
    let withStock = 0;
    let rupture = 0;
    let valorParado = 0;
    let potencial = 0;

    state.ranking.forEach((item) => {
      if (item.ranking > TOP_SALDO_RANK) return;
      top150 += 1;
      const stock = findStockForRanking(item);
      const saldo = stock ? (stock.consignado || 0) : 0;

      if (!stock || saldo <= 0) {
        rupture += 1;
        urgent += 1;
        const unit = unitNetPrice(stock);
        if (unit != null) potencial += TARGET_OK_SALDO * unit;
        return;
      }

      withStock += 1;
      const unit = unitNetPrice(stock);

      if (saldo <= 3) {
        urgent += 1;
        if (unit != null) potencial += Math.max(TARGET_OK_SALDO - saldo, 0) * unit;
      } else if (saldo <= 7) {
        alert += 1;
        if (unit != null) potencial += Math.max(TARGET_OK_SALDO - saldo, 0) * unit;
      }
    });

    state.stockByKey.forEach((stock) => {
      if ((stock.consignado || 0) <= 0) return;
      const fdias = stock.fdias || 0;
      if (fdias >= IDLE_DAYS) acerto += 1;
      if (fdias >= IDLE_DAYS_LONG) {
        idle180Count += 1;
        valorParado += stock.valorLiquido || 0;
      }
    });

    const pctStock = top150 ? Math.round((withStock / top150) * 100) : 0;
    const pctRupture = top150 ? Math.round((rupture / top150) * 100) : 0;

    const icoUrgent = `<svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v6M12 16.2v.8"/></svg>`;
    const icoAlert = `<svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8 21 19.2H3L12 3.8Z"/><path d="M12 9.4v5M12 16.6v.8"/></svg>`;
    const icoIdle = `<svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 7.2A6.2 6.2 0 0 1 18 10"/><path d="M16.8 7.5 18 10l-2.5.4"/><path d="M16.8 16.8A6.2 6.2 0 0 1 6 14"/><path d="M7.2 16.5 6 14l2.5-.4"/></svg>`;
    const icoReturn = `<svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>`;

    els.sumRoteiro.innerHTML = `
      <span class="roteiro-actions">
        <button type="button" class="is-urgent" data-filter="urgent">${icoUrgent}${urgent.toLocaleString("pt-BR")} repor urgente</button>
        <button type="button" class="is-alert" data-filter="alert">${icoAlert}${alert.toLocaleString("pt-BR")} alerta</button>
        <button type="button" class="is-idle" data-filter="parado90">${icoIdle}${acerto.toLocaleString("pt-BR")} puxar acerto/pedir devolução (90+)</button>
        <button type="button" class="is-return" data-filter="parado180">${icoReturn}${idle180Count.toLocaleString("pt-BR")} pedir devolução (180+)</button>
      </span>
    `;
    syncFilterActiveState();
    els.sumCoverage.textContent = `${pctStock}% com saldo`;
    els.sumCoverageMeta.textContent = `${pctRupture}% em ruptura · ${withStock}/${top150} com estoque`;
    els.sumIdleValue.textContent = money(valorParado);
    els.sumIdleMeta.textContent = `${idle180Count.toLocaleString("pt-BR")} ISBN(s) parados há 180+ dias`;
    els.sumRestockValue.textContent = money(potencial);
  }

  const FILTER_LABELS = {
    all: "Todos",
    ranking: "Top 500",
    extra: "Fora do ranking",
    com: "Com estoque",
    sem: "Sem estoque",
    urgent: "Repor com urgência",
    alert: "Alerta reposição",
    parado90: "Puxar acerto/pedir devolução (90+ dias)",
    parado180: "Pedir devolução (180+ dias)",
  };

  function filterTone(filterKey) {
    if (filterKey === "urgent" || filterKey === "sem") return "is-danger";
    if (filterKey === "alert" || filterKey === "parado90" || filterKey === "parado180") return "is-warn";
    return "";
  }

  function updateActiveFilters() {
    const client = state.selectedClient;
    const filterLabel = FILTER_LABELS[state.filter] || state.filter;
    const search = state.query.trim();
    const hasTableFilter = state.filter !== "all" || Boolean(search);

    if (els.btnClearFilters) {
      els.btnClearFilters.hidden = !client || !hasTableFilter;
    }

    if (els.sideActiveFilters) {
      if (!client) {
        els.sideActiveFilters.innerHTML = `<li>Nenhum cliente selecionado</li>`;
      } else {
        els.sideActiveFilters.innerHTML = `
          <li><strong>Cliente</strong>${escapeHtml(client.codigo)} · ${escapeHtml(client.nome)}</li>
          <li><strong>Base</strong>Mais vendidos Rocco (Top 500)</li>
          <li><strong>Filtro da tabela</strong>${escapeHtml(filterLabel)}</li>
          <li><strong>Busca de título</strong>${search ? escapeHtml(search) : "Nenhuma"}</li>
        `;
      }
    }

    if (els.mainActiveFilters) {
      if (!client) {
        els.mainActiveFilters.hidden = true;
        els.mainActiveFilters.innerHTML = "";
        return;
      }

      els.mainActiveFilters.hidden = false;
      const tone = filterTone(state.filter);
      els.mainActiveFilters.innerHTML = `
        ${state.seller ? `<span class="filter-chip"><em>Vendedor</em> ${escapeHtml(state.seller)}</span>` : ""}
        <span class="filter-chip"><em>Cliente</em> ${escapeHtml(client.codigo)} · ${escapeHtml(client.nome)}</span>
        <span class="filter-chip"><em>Base</em> Mais vendidos</span>
        <span class="filter-chip ${tone}"><em>Filtro</em> ${escapeHtml(filterLabel)}</span>
        ${search ? `<span class="filter-chip"><em>Busca</em> ${escapeHtml(search)}</span>` : ""}
        <button type="button" class="clear-filters-main" id="btnClearFiltersMain"${hasTableFilter ? "" : " disabled"}>Limpar filtros</button>
      `;
    }
  }

  function syncFilterActiveState() {
    const active = state.filter;
    els.filters.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.filter === active);
      chip.setAttribute("aria-pressed", chip.dataset.filter === active ? "true" : "false");
    });
    if (els.sumRoteiro) {
      els.sumRoteiro.querySelectorAll("[data-filter]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === active);
        btn.setAttribute("aria-pressed", btn.dataset.filter === active ? "true" : "false");
      });
    }
  }

  function applyFilter(filterKey) {
    // Clique de novo no mesmo filtro desativa (volta para Todos).
    if (filterKey !== "all" && state.filter === filterKey) {
      state.filter = "all";
    } else {
      state.filter = filterKey;
    }
    syncFilterActiveState();
    render();
  }

  function clearTableFilters() {
    state.filter = "all";
    state.query = "";
    if (els.q) els.q.value = "";
    syncFilterActiveState();
    render();
  }

  function setClientResultsOpen(open) {
    if (!els.clientResults) return;
    els.clientResults.hidden = !open;
    const search = els.clientQuery?.closest(".client-search");
    if (search) search.classList.toggle("is-open", open);
    if (els.clientQuery) els.clientQuery.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function renderClientResults(list) {
    if (!els.clientResults) return;

    const q = state.clientQuery.trim();
    if (!q) {
      setClientResultsOpen(false);
      els.clientResults.innerHTML = "";
      return;
    }

    if (!list.length) {
      els.clientResults.innerHTML = `<p class="client-results-empty">Nenhum cliente com esse código ou nome.</p>`;
      setClientResultsOpen(true);
      return;
    }

    const shown = list.slice(0, 30);
    const more = list.length > shown.length
      ? `<p class="client-results-empty">Mostrando ${shown.length} de ${list.length}. Continue digitando para refinar.</p>`
      : "";

    els.clientResults.innerHTML = `
      <div class="client-results-head">${list.length.toLocaleString("pt-BR")} cliente(s) — clique para selecionar</div>
      ${shown.map((c) => {
        const place = [c.cidade, c.estado].filter(Boolean).join("/");
        const active = state.selectedClient?.codigo === c.codigo ? " is-active" : "";
        return `
          <button type="button" class="client-result${active}" data-code="${escapeHtml(c.codigo)}" role="option" aria-selected="${state.selectedClient?.codigo === c.codigo}">
            <strong>${escapeHtml(c.codigo)}</strong>
            <span>${escapeHtml(c.nome)}</span>
            ${place ? `<small>${escapeHtml(place)}</small>` : ""}
          </button>
        `;
      }).join("")}
      ${more}
    `;
    setClientResultsOpen(true);
  }

  function renderClientPicker() {
    const hasClients = state.clients.length > 0;
    if (els.clientBar) els.clientBar.hidden = !hasClients;
    if (!hasClients) return;

    const selectedCode = state.selectedClient?.codigo || "";
    const placeholderSelected = selectedCode ? "" : " selected";
    // Select always keeps the full client list.
    const options = state.clients
      .map((c) => {
        const label = `${c.codigo} · ${c.nome}`;
        const selected = c.codigo === selectedCode ? " selected" : "";
        return `<option value="${escapeHtml(c.codigo)}"${selected}>${escapeHtml(label)}</option>`;
      })
      .join("");

    els.clientSelect.innerHTML = `<option value=""${placeholderSelected}>Selecione um cliente</option>${options}`;
    els.clientSelect.value = selectedCode;
    renderClientResults(filteredClients());
  }

  function updateEmptyState() {
    if (state.selectedClient) return;

    const hasMapa = state.clients.length > 0;
    if (els.btnImportMain) els.btnImportMain.hidden = hasMapa;
    if (els.emptyHint) els.emptyHint.hidden = hasMapa;

    if (hasMapa) {
      els.emptyTitle.textContent = "Escolha um cliente";
      els.emptyText.textContent = `Mapão importado com ${state.clients.length.toLocaleString("pt-BR")} cliente(s). Use a busca ou a lista acima para selecionar e carregar o cruzamento.`;
      els.topSub.textContent = state.seller
        ? `${state.seller} · selecione um cliente para analisar o estoque.`
        : "Selecione um cliente para analisar o estoque.";
    } else {
      els.emptyTitle.textContent = "Pronto para o cruzamento";
      els.emptyText.textContent = "Importe o CSV do Mapão para cruzar o estoque do cliente com os mais vendidos Rocco.";
      els.topSub.textContent = state.seller
        ? `${state.seller} · importe o Mapão do cliente para ver o saldo ao lado do ranking Rocco.`
        : "Importe o Mapão do cliente para ver o saldo ao lado do ranking Rocco.";
    }
  }

  function openMapaPicker() {
    if (!state.seller) {
      showSellerGate();
      return;
    }
    els.fileMapa.click();
  }

  function render() {
    const hasClient = Boolean(state.selectedClient);
    if (els.emptyState) els.emptyState.hidden = hasClient;
    if (els.grid) els.grid.hidden = !hasClient;
    if (els.summary) els.summary.hidden = !hasClient;
    if (els.actions) els.actions.hidden = !hasClient;
    if (els.filters) els.filters.hidden = !hasClient;
    if (els.sideKpis) els.sideKpis.hidden = !hasClient;
    if (els.q) els.q.disabled = !hasClient;

    renderClientPicker();
    updateEmptyState();
    updateActiveFilters();

    if (!hasClient) return;

    updateKpis();
    if (els.actions) updateActionKpis();
    updateSortHeaders();
    const rows = rowsForRender();
    updateSummary(rows);
    els.tbody.innerHTML = rows.map((row) => {
      const saldo = row.stock ? row.stock.consignado : null;
      const fdias = row.stock ? row.stock.fdias : null;
      const vendido = row.stock ? row.stock.vendido : null;
      const preco = row.stock?.preco;
      const rowClass = [
        row.sit.key === "zero" || row.sit.key === "urgent" || row.sit.key === "rupture" ? "row-zero" : "",
        row.sit.key === "alert" ? "row-alert" : "",
        row.sit.key === "idle" ? "row-idle" : "",
      ].filter(Boolean).join(" ");

      const rankCell = row.inRanking
        ? row.ranking
        : `<span class="rank-extra">Fora</span>`;

      return `
        <tr class="${rowClass}${row.inRanking ? "" : " row-extra"}">
          <td class="num">${rankCell}</td>
          <td>
            <span class="title" title="${escapeHtml(row.titulo)}">${escapeHtml(row.titulo)}</span>
            <span class="author" title="${escapeHtml(row.autor || "")}">${escapeHtml(row.autor || (row.inRanking ? "—" : "Somente no Mapão"))}</span>
          </td>
          <td><span class="isbn">${escapeHtml(row.isbn)}</span></td>
          <td class="num">${money(preco)}</td>
          <td class="num ${saldo === 0 ? "saldo-zero" : ""}">${saldo == null ? "—" : saldo.toLocaleString("pt-BR")}</td>
          <td class="num fdias">${fdias == null ? "—" : fdias.toLocaleString("pt-BR")}</td>
          <td class="num">${vendido == null ? "—" : vendido.toLocaleString("pt-BR")}</td>
          <td><span class="badge ${row.sit.className}">${row.sit.label}</span></td>
        </tr>
      `;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function selectClient(code) {
    const client = String(code || "")
      ? state.clients.find((c) => c.codigo === String(code))
      : null;
    state.selectedClient = client || null;
    if (!client) {
      state.stockByKey = new Map();
      state.stockLookup = new Map();
      state.mapaQuality = null;
      els.clientMeta.textContent = "";
      render();
      return;
    }

    const built = buildClientStock(state.mapaRows, client.codigo);
    state.stockByKey = built.byKey;
    state.stockLookup = built.lookup;
    state.mapaQuality = built;
    const place = [client.cidade, client.estado].filter(Boolean).join("/");
    els.clientMeta.textContent = place
      ? `Código ${client.codigo} · ${place}`
      : `Código ${client.codigo}`;
    els.topSub.textContent = `${client.nome} · ranking Rocco com saldo do Mapão`;

    if (built.badIsbnRows > 0) {
      const pct = Math.round((built.badIsbnRows / Math.max(built.totalRows, 1)) * 100);
      els.mapaMeta.textContent = `${els.mapaMeta.textContent.split(" · aviso:")[0]} · aviso: ${built.badIsbnRows.toLocaleString("pt-BR")} linhas (${pct}%) com ISBN inválido no Excel; cruzamento usa título/código do livro quando possível`;
    }

    render();
  }

  async function onMapaFile(file) {
    const buffer = await file.arrayBuffer();
    const text = decodeCsvBuffer(buffer);
    const rows = parseCsv(text);

    state.mapaRows = rows;
    state.clients = listClients(rows);
    state.clientQuery = "";
    state.selectedClient = null;
    state.stockByKey = new Map();
    state.stockLookup = new Map();
    state.mapaQuality = null;
    els.clientQuery.value = "";
    els.clientMeta.textContent = "";
    els.mapaMeta.textContent = `${file.name} · ${rows.length.toLocaleString("pt-BR")} linhas · ${state.clients.length} cliente(s)`;

    render();
  }

  els.btnImport.addEventListener("click", () => openMapaPicker());
  if (els.btnImportMain) {
    els.btnImportMain.addEventListener("click", () => openMapaPicker());
  }
  els.fileMapa.addEventListener("change", async (e) => {
    if (!state.seller) {
      showSellerGate();
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onMapaFile(file);
    } catch (err) {
      console.error(err);
      els.mapaMeta.textContent = "Falha ao ler o CSV do Mapão.";
    }
  });

  els.clientSelect.addEventListener("change", (e) => selectClient(e.target.value));
  els.clientQuery.addEventListener("input", (e) => {
    state.clientQuery = e.target.value;
    renderClientResults(filteredClients());

    const list = filteredClients();
    const best = pickBestClientMatch(list, state.clientQuery);
    if (
      best
      && best.codigo !== state.selectedClient?.codigo
      && /^\d+$/.test(state.clientQuery.trim())
      && normalizeSearch(best.codigo) === normalizeSearch(state.clientQuery)
    ) {
      selectClient(best.codigo);
    }
  });
  els.clientQuery.addEventListener("focus", () => {
    if (state.clientQuery.trim()) renderClientResults(filteredClients());
  });
  els.clientQuery.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setClientResultsOpen(false);
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const list = filteredClients();
    const best = pickBestClientMatch(list, state.clientQuery) || list[0];
    if (!best) return;
    selectClient(best.codigo);
    setClientResultsOpen(false);
  });
  els.clientResults.addEventListener("mousedown", (e) => {
    // Keep focus behavior predictable before click selection.
    e.preventDefault();
  });
  els.clientResults.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-code]");
    if (!btn) return;
    selectClient(btn.dataset.code);
    state.clientQuery = "";
    els.clientQuery.value = "";
    setClientResultsOpen(false);
  });
  document.addEventListener("click", (e) => {
    if (!els.clientResults || els.clientResults.hidden) return;
    if (e.target.closest(".client-search-wrap")) return;
    setClientResultsOpen(false);
  });

  els.q.addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });

  if (els.btnClearFilters) {
    els.btnClearFilters.addEventListener("click", () => clearTableFilters());
  }

  if (els.mainActiveFilters) {
    els.mainActiveFilters.addEventListener("click", (e) => {
      if (!e.target.closest("#btnClearFiltersMain, .clear-filters-main")) return;
      clearTableFilters();
    });
  }

  els.filters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    applyFilter(btn.dataset.filter);
  });

  els.actions.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    applyFilter(btn.dataset.filter);
  });

  els.grid.querySelector("thead").addEventListener("click", (e) => {
    const th = e.target.closest("th.sortable");
    if (!th) return;
    const key = th.dataset.sort;
    if (!key) return;

    if (state.sortKey === key) {
      state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDir = key === "titulo" || key === "isbn" || key === "situacao" ? "asc" : "desc";
      if (key === "ranking") state.sortDir = "asc";
    }
    render();
  });

  initSellerGate();
  loadRanking();
})();
