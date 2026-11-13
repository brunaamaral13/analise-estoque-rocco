(() => {
  const RANK_FILE = "Mais vendidos Rocco.csv";
  const IDLE_DAYS = 90;
  const IDLE_DAYS_LONG = 180;
  const TOP_SALDO_RANK = 150;
  const TARGET_OK_SALDO = 8;
  const HIGH_RUPTURE_PCT = 40;
  const CHRONIC_STORE_PCT = 30;
  const PORTFOLIO_LIST_LIMIT = 5;
  const COVERAGE_BANDS = [
    { key: "lt50", label: "abaixo de 50%", min: 0, max: 49, fillClass: "is-down" },
    { key: "50_69", label: "de 50% a 69%", min: 50, max: 69, fillClass: "" },
    { key: "70_89", label: "de 70% a 89%", min: 70, max: 89, fillClass: "" },
    { key: "ge90", label: "a partir de 90%", min: 90, max: 100, fillClass: "is-ok" },
  ];
  const SELLER_STORAGE_KEY = "rocco_estoque_vendedor";
  const IGNORED_ANALYSIS_STORAGE_KEY = "rocco_estoque_ignored_analysis";

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
    mapaIsbnWarn: document.getElementById("mapaIsbnWarn"),
    mapaIsbnBanner: document.getElementById("mapaIsbnBanner"),
    btnImport: document.getElementById("btnImport"),
    btnImportMain: document.getElementById("btnImportMain"),
    emptyHint: document.getElementById("emptyHint"),
    fileMapa: document.getElementById("fileMapa"),
    clientBar: document.getElementById("clientBar"),
    clientSelect: document.getElementById("clientSelect"),
    sellerFilter: document.getElementById("sellerFilter"),
    clientQuery: document.getElementById("clientQuery"),
    clientResults: document.getElementById("clientResults"),
    clientMeta: document.getElementById("clientMeta"),
    btnToggleIsbnSearch: document.getElementById("btnToggleIsbnSearch"),
    isbnSearchPanel: document.getElementById("isbnSearchPanel"),
    isbnFieldQuery: document.getElementById("isbnFieldQuery"),
    titleFieldQuery: document.getElementById("titleFieldQuery"),
    isbnFieldResults: document.getElementById("isbnFieldResults"),
    titleFieldResults: document.getElementById("titleFieldResults"),
    isbnFieldWrap: document.getElementById("isbnFieldWrap"),
    titleFieldWrap: document.getElementById("titleFieldWrap"),
    productSelected: document.getElementById("productSelected"),
    btnClearIsbn: document.getElementById("btnClearIsbn"),
    isbnResults: document.getElementById("isbnResults"),
    isbnResultTitle: document.getElementById("isbnResultTitle"),
    isbnResultMeta: document.getElementById("isbnResultMeta"),
    isbnSumClients: document.getElementById("isbnSumClients"),
    isbnSumVolume: document.getElementById("isbnSumVolume"),
    isbnSumValue: document.getElementById("isbnSumValue"),
    isbnGrid: document.getElementById("isbnGrid"),
    isbnTbody: document.getElementById("isbnTbody"),
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
    titleResults: document.getElementById("titleResults"),
    titleSelected: document.getElementById("titleSelected"),
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
    portfolioOverview: document.getElementById("portfolioOverview"),
    portfolioTitle: document.getElementById("portfolioTitle"),
    portfolioSub: document.getElementById("portfolioSub"),
    portfolioScope: document.getElementById("portfolioScope"),
    btnClearPortfolioFilter: document.getElementById("btnClearPortfolioFilter"),
    portfolioKpis: document.getElementById("portfolioKpis"),
    portfolioBands: document.getElementById("portfolioBands"),
    portfolioOpp: document.getElementById("portfolioOpp"),
    portfolioRoteiro: document.getElementById("portfolioRoteiro"),
    portfolioWorst: document.getElementById("portfolioWorst"),
    portfolioRupture: document.getElementById("portfolioRupture"),
    portfolioIdle: document.getElementById("portfolioIdle"),
    portfolioIgnoredPanel: document.getElementById("portfolioIgnoredPanel"),
    portfolioIgnored: document.getElementById("portfolioIgnored"),
    portfolioChronic: document.getElementById("portfolioChronic"),
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
    sellerFilter: "",
    isbnSearchOpen: false,
    isbnFieldQuery: "",
    titleFieldQuery: "",
    selectedProducts: [],
    isbnResult: null,
    isbnSortKey: "saldo",
    isbnSortDir: "desc",
    filter: "all",
    query: "",
    selectedQueries: [],
    sortKey: "ranking",
    sortDir: "asc",
    mapaQuality: null,
    mapaIsbnQuality: null,
    portfolioOverview: null,
    portfolioClientFilter: null,
    ignoredAnalysisClients: loadIgnoredAnalysisClients(),
  };

  function loadIgnoredAnalysisClients() {
    try {
      const raw = sessionStorage.getItem(IGNORED_ANALYSIS_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(list) ? list.map((c) => String(c)) : []);
    } catch (err) {
      return new Set();
    }
  }

  function persistIgnoredAnalysisClients() {
    try {
      sessionStorage.setItem(
        IGNORED_ANALYSIS_STORAGE_KEY,
        JSON.stringify([...state.ignoredAnalysisClients])
      );
    } catch (err) {
      // ignore storage errors
    }
  }

  function ignoreAnalysisClient(code) {
    const key = String(code || "").trim();
    if (!key) return;
    state.ignoredAnalysisClients.add(key);
    persistIgnoredAnalysisClients();
    render();
  }

  function considerAnalysisClient(code) {
    const key = String(code || "").trim();
    if (!key) return;
    state.ignoredAnalysisClients.delete(key);
    persistIgnoredAnalysisClients();
    render();
  }

  function visibleAnalysisRows(rows) {
    const ignored = state.ignoredAnalysisClients;
    return (rows || [])
      .filter((c) => !ignored.has(String(c.codigo)))
      .slice(0, PORTFOLIO_LIST_LIMIT);
  }

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
      // Excel em notação científica perde dígitos (ex.: 9,78656E+12 → 9786560000000).
      if (raw.length >= 12 && /0{4,}$/.test(raw)) return "";
    }
    return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
  }

  function reliableRowIsbn(row) {
    return [...isbnAliases(row?.isbn), ...isbnAliases(row?.codbarra)].find(isReliableIsbn) || "";
  }

  function looksLikeExcelSciIsbn(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    // Só notação científica explícita (o Excel grava assim no CSV).
    if (/[eE][+-]?\d+/.test(raw)) return true;
    return false;
  }

  function assessMapaIsbnQuality(rows, sourceFormat = "") {
    let total = 0;
    let sciNotation = 0;
    let unreliable = 0;
    let reliable = 0;
    let empty = 0;
    const samples = [];

    rows.forEach((r) => {
      total += 1;
      const isbnRaw = String(r.isbn || "").trim();
      const barraRaw = String(r.codbarra || "").trim();
      if (!isbnRaw && !barraRaw) {
        empty += 1;
        unreliable += 1;
        return;
      }
      const sci = looksLikeExcelSciIsbn(isbnRaw) || looksLikeExcelSciIsbn(barraRaw);
      if (sci) {
        sciNotation += 1;
        if (samples.length < 3) samples.push(isbnRaw || barraRaw);
      }
      if (reliableRowIsbn(r)) reliable += 1;
      else unreliable += 1;
    });

    return {
      total,
      sciNotation,
      unreliable,
      reliable,
      empty,
      samples,
      sourceFormat,
      // Alerta forte só com notação científica real.
      hasProblem: sciNotation > 0,
    };
  }

  function renderMapaIsbnWarning() {
    const quality = state.mapaIsbnQuality;
    const show = Boolean(quality && quality.hasProblem && state.mapaRows.length);
    const pctSci = quality && quality.total
      ? Math.round((quality.sciNotation / quality.total) * 100)
      : 0;
    const sampleText = quality?.samples?.length
      ? ` Exemplos: ${quality.samples.join(", ")}.`
      : "";
    const formatHint = " No Excel, use =TEXTO(célula;\"0\") nas colunas isbn e codbarra, cole como valores e salve em .xlsx antes de importar.";

    const sideText = show
      ? `<strong>ISBN corrompido no arquivo</strong>${quality.sciNotation.toLocaleString("pt-BR")} linhas (${pctSci}%) com notação científica (ex.: 9,78656E+12).${sampleText}${formatHint}`
      : "";
    const bannerText = show
      ? `<strong>Atenção: ISBN inválido no arquivo importado</strong>${quality.sciNotation.toLocaleString("pt-BR")} de ${quality.total.toLocaleString("pt-BR")} linhas (${pctSci}%) estão com ISBN em notação científica.${sampleText}${formatHint}`
      : "";

    if (els.mapaIsbnWarn) {
      els.mapaIsbnWarn.hidden = !show;
      els.mapaIsbnWarn.innerHTML = sideText;
    }
    if (els.mapaIsbnBanner) {
      els.mapaIsbnBanner.hidden = !show;
      els.mapaIsbnBanner.innerHTML = bannerText;
    }
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
    let id = String(isbn);
    // Aceita ISBN-10 só se converter para um ISBN-13 de livro válido.
    if (/^\d{9}[\dX]$/.test(id)) {
      id = isbn10To13(id) || "";
    }
    if (!/^\d{13}$/.test(id)) return false;
    // Livros usam prefixo GS1 978/979.
    if (!/^97[89]/.test(id)) return false;
    // Excel em notação científica costuma gerar sequências longas de zero
    // (ex.: 9786555326253 → 9786560000001 / 6560000001).
    if (/0{4,}/.test(id.slice(6))) return false;
    if (/0{5,}$/.test(id)) return false;
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

  function matrixToObjects(matrix) {
    if (!matrix.length) return [];
    const headers = matrix[0].map((h) => String(h || "").trim().toLowerCase());
    return matrix.slice(1)
      .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = r[idx] == null ? "" : String(r[idx]).trim();
        });
        return obj;
      });
  }

  function excelValueToString(value, headerName) {
    if (value == null || value === "") return "";
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (typeof value === "number" && Number.isFinite(value)) {
      const header = String(headerName || "").toLowerCase();
      const forceFullDigits = /isbn|codbarra|codigo|cnpj|cpf|cep|inscricao/.test(header)
        || Math.abs(value) >= 1e10;
      if (forceFullDigits) {
        return Math.abs(value) < 1e15
          ? String(Math.round(value))
          : value.toLocaleString("fullwide", { useGrouping: false });
      }
      // Preço e percentuais: mantém casas, no formato que o parseNumber já lê.
      return String(value);
    }
    return String(value).trim();
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

    return matrixToObjects(rows);
  }

  function detectExcelKind(buffer) {
    const u8 = new Uint8Array(buffer);
    if (u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4B) return "xlsx"; // ZIP / xlsx
    if (u8.length >= 4 && u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0) {
      return "xls"; // OLE compound / xls
    }
    return null;
  }

  function readExcelCell(cell, headerName) {
    if (!cell) return "";
    // Número real do Excel: converte com todos os dígitos (evita 9.78e+12).
    if (cell.t === "n" && typeof cell.v === "number" && Number.isFinite(cell.v)) {
      return excelValueToString(cell.v, headerName);
    }
    // Texto formatado sem notação científica tem prioridade.
    if (cell.w && !/[eE][+-]?\d+/.test(String(cell.w))) {
      return String(cell.w).trim();
    }
    if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
      return excelValueToString(cell.v, headerName);
    }
    if (cell.v != null && cell.v !== "") return String(cell.v).trim();
    if (cell.w != null && cell.w !== "") return String(cell.w).trim();
    return "";
  }

  function parseExcelBuffer(buffer) {
    if (typeof XLSX === "undefined") {
      throw new Error("Biblioteca de Excel não carregou. Verifique a internet e tente de novo.");
    }
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: false,
      cellNF: false,
      cellText: true,
    });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) return [];

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r, c });
      headers.push(String(readExcelCell(sheet[addr], "") || "").trim().toLowerCase());
    }

    const objects = [];
    for (let r = range.s.r + 1; r <= range.e.r; r += 1) {
      const obj = {};
      let empty = true;
      headers.forEach((h, idx) => {
        if (!h) return;
        const c = range.s.c + idx;
        const addr = XLSX.utils.encode_cell({ r, c });
        const value = readExcelCell(sheet[addr], h);
        obj[h] = value;
        if (String(value).trim() !== "") empty = false;
      });
      if (!empty) objects.push(obj);
    }
    return objects;
  }

  function isExcelMapaFile(file, buffer) {
    if (buffer && detectExcelKind(buffer)) return true;
    const name = String(file?.name || "").toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls")
      || /spreadsheetml|ms-excel|excel/.test(String(file?.type || "").toLowerCase());
  }

  async function parseMapaFile(file) {
    const buffer = await file.arrayBuffer();
    const excelKind = detectExcelKind(buffer);
    if (excelKind || isExcelMapaFile(file, buffer)) {
      return {
        rows: parseExcelBuffer(buffer),
        sourceFormat: excelKind || "excel",
      };
    }
    throw new Error("Envie o Mapão em Excel (.xlsx ou .xls).");
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
      // Ranking novo: agregados da carteira precisam ser recalculados.
      invalidatePortfolioOverview();
      if (state.clients.length) render();
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

  function findStockForRankingIn(item, stockLookup, stockByKey) {
    for (const alias of item.aliases || isbnAliases(item.isbn)) {
      const key = stockLookup.get(alias);
      if (key && stockByKey.has(key)) return stockByKey.get(key);
    }
    if (item.titleKey) {
      const key = stockLookup.get(`T:${item.titleKey}`);
      if (key && stockByKey.has(key)) return stockByKey.get(key);
    }
    return null;
  }

  function findStockForRanking(item) {
    return findStockForRankingIn(item, state.stockLookup, state.stockByKey);
  }

  function rowSellerName(row) {
    return String(row?.vendedor || row?.["vendedor "] || "").trim();
  }

  function rowMatchesSellerFilter(row) {
    const seller = normalizeSearch(state.sellerFilter);
    if (!seller) return true;
    return normalizeSearch(rowSellerName(row)) === seller;
  }

  function listClients(rows) {
    const byCode = new Map();
    rows.forEach((r) => {
      const code = String(r.codigo || "").trim();
      if (!code) return;
      const vendedor = rowSellerName(r);
      if (!byCode.has(code)) {
        byCode.set(code, {
          codigo: code,
          nome: r.nome || "Cliente sem nome",
          cidade: r.cidade || "",
          estado: r.estado || "",
          vendedor: vendedor || "",
        });
        return;
      }
      const prev = byCode.get(code);
      if (!prev.vendedor && vendedor) prev.vendedor = vendedor;
    });
    return [...byCode.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function listMapaSellers(clients = state.clients) {
    const set = new Set();
    clients.forEach((c) => {
      const name = String(c.vendedor || "").trim();
      if (name) set.add(name);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function rowMatchesIsbn(row, aliasSet, queryDigits) {
    const aliases = [
      ...isbnAliases(row.isbn),
      ...isbnAliases(row.codbarra),
    ];
    if (aliases.some((alias) => aliasSet.has(alias))) return true;
    if (queryDigits.length >= 10) {
      const blob = `${expandIsbnCandidate(row.isbn)}${expandIsbnCandidate(row.codbarra)}`;
      if (blob.includes(queryDigits)) return true;
    }
    return false;
  }

  function findClientsByProduct({ rawQuery = "", exactTitle = "", exactIsbn = "" } = {}) {
    const q = String(rawQuery || exactTitle || exactIsbn || "").trim();
    if (!q || !state.mapaRows.length) return null;

    const aliasSet = new Set(isbnAliases(exactIsbn || q));
    const normalized = normalizeIsbn(exactIsbn || q);
    if (normalized) aliasSet.add(normalized);
    const queryDigits = String(exactIsbn || q).replace(/\D/g, "");
    const titleNeedle = normalizeTitle(exactTitle || (!exactIsbn && queryDigits.length < 10 ? q : ""));
    const hasIsbnNeedle = aliasSet.size > 0 || queryDigits.length >= 10;

    if (!hasIsbnNeedle && !titleNeedle) {
      return { query: q, titulo: "", isbn: "", clients: [] };
    }

    const byClient = new Map();
    let titulo = exactTitle || "";
    let isbn = normalized || (queryDigits.length >= 10 ? queryDigits : "");

    state.mapaRows.forEach((r) => {
      const matchIsbn = hasIsbnNeedle && rowMatchesIsbn(r, aliasSet, queryDigits);
      const matchTitle = titleNeedle
        && (
          exactTitle
            ? normalizeTitle(r.titulo) === titleNeedle
            : normalizeTitle(r.titulo).includes(titleNeedle)
        );
      if (!matchIsbn && !matchTitle) return;

      const code = String(r.codigo || "").trim();
      if (!code) return;

      const qty = parseIntSafe(r.consignado) || 0;
      const preco = parseNumber(r.preco);
      const desconto = parseNumber(r.perdesconto) || 0;
      const fator = Math.max(0, 1 - desconto / 100);
      const valor = preco != null && qty ? preco * qty * fator : 0;
      const fdias = parseIntSafe(r.fdias);
      const vendido = parseIntSafe(r.vendido) || 0;

      if (!titulo && r.titulo) titulo = r.titulo;
      const reliable = [...isbnAliases(r.isbn), ...isbnAliases(r.codbarra)].find(isReliableIsbn);
      if (reliable) isbn = reliable;

      const vendedor = rowSellerName(r);
      const prev = byClient.get(code) || {
        codigo: code,
        nome: r.nome || "Cliente sem nome",
        cidade: r.cidade || "",
        estado: r.estado || "",
        vendedor: vendedor || "",
        consignado: 0,
        valorLiquido: 0,
        fdias: null,
        vendido: 0,
      };

      prev.consignado += qty;
      prev.valorLiquido += valor;
      prev.vendido += vendido;
      if (fdias != null) prev.fdias = prev.fdias == null ? fdias : Math.max(prev.fdias, fdias);
      if (!prev.nome && r.nome) prev.nome = r.nome;
      if (!prev.vendedor && vendedor) prev.vendedor = vendedor;
      byClient.set(code, prev);
    });

    if (!titulo) {
      const ranked = state.ranking.find((item) => (item.aliases || []).some((a) => aliasSet.has(a)));
      if (ranked) {
        titulo = ranked.titulo;
        if (ranked.isbn) isbn = ranked.isbn;
      }
    }

    const seller = normalizeSearch(state.sellerFilter);
    const clients = [...byClient.values()]
      .filter((c) => (c.consignado || 0) > 0)
      .filter((c) => !seller || normalizeSearch(c.vendedor) === seller)
      .sort((a, b) => (b.consignado || 0) - (a.consignado || 0));

    return { query: q, titulo, isbn, clients };
  }

  function productKey(item) {
    const isbn = item?.isbn && isReliableIsbn(item.isbn) ? item.isbn : "";
    if (isbn) return `isbn:${isbn}`;
    if (item?.codlivro) return `cod:${String(item.codlivro).trim()}`;
    if (item?.titulo) return `title:${normalizeTitle(item.titulo)}`;
    return "";
  }

  function isbnQualityScore(isbn) {
    if (!isReliableIsbn(isbn)) return 0;
    const id = String(isbn);
    // Prefere ISBN-13 completo; penaliza aparência truncada.
    let score = id.length === 13 ? 20 : 10;
    if (/^97865|^97885|^979/.test(id)) score += 5;
    if (!/0{3,}/.test(id)) score += 3;
    return score;
  }

  function buildProductCatalog() {
    const byKey = new Map();
    const index = new Map();

    function resolveKey(ids) {
      for (const id of ids) {
        if (id && index.has(id)) return index.get(id);
      }
      return null;
    }

    function registerIds(primaryKey, ids) {
      ids.forEach((id) => {
        if (id) index.set(id, primaryKey);
      });
    }

    state.mapaRows.forEach((r) => {
      if (!rowMatchesSellerFilter(r)) return;
      const qty = parseIntSafe(r.consignado) || 0;
      if (qty <= 0) return;

      const isbn = reliableRowIsbn(r);
      const codlivro = String(r.codlivro || "").trim();
      const titulo = r.titulo || "Sem título";
      const titleKey = normalizeTitle(titulo);
      // Cruzar ISBN confiável + codlivro + título (ISBN corrompido no Excel não cria produto paralelo).
      const ids = [
        isbn ? `isbn:${isbn}` : "",
        codlivro ? `cod:${codlivro}` : "",
        titleKey ? `title:${titleKey}` : "",
      ].filter(Boolean);
      if (!ids.length) return;

      let key = resolveKey(ids);
      if (!key) {
        key = isbn ? `isbn:${isbn}` : (codlivro ? `cod:${codlivro}` : `title:${titleKey}`);
      }

      const prev = byKey.get(key) || {
        key,
        isbn: isbn || "",
        codlivro: codlivro || "",
        titulo,
        titleKey,
        volume: 0,
        clients: new Set(),
      };
      if (isbnQualityScore(isbn) > isbnQualityScore(prev.isbn)) prev.isbn = isbn;
      if (codlivro) prev.codlivro = codlivro;
      if ((!prev.titulo || prev.titulo === "Sem título") && r.titulo) {
        prev.titulo = r.titulo;
        prev.titleKey = titleKey;
      }
      prev.volume += qty;
      const code = String(r.codigo || "").trim();
      if (code) prev.clients.add(code);
      byKey.set(key, prev);
      registerIds(key, ids);
    });

    // Segunda passagem: se ainda restarem duplicatas do mesmo título, unifica no melhor ISBN.
    const byTitle = new Map();
    [...byKey.values()].forEach((item) => {
      const tKey = item.titleKey || normalizeTitle(item.titulo);
      if (!tKey) return;
      const prev = byTitle.get(tKey);
      if (!prev) {
        byTitle.set(tKey, item);
        return;
      }
      if (isbnQualityScore(item.isbn) > isbnQualityScore(prev.isbn)) {
        item.volume += prev.volume;
        prev.clients.forEach((c) => item.clients.add(c));
        if (!item.codlivro && prev.codlivro) item.codlivro = prev.codlivro;
        byTitle.set(tKey, item);
      } else {
        prev.volume += item.volume;
        item.clients.forEach((c) => prev.clients.add(c));
        if (!prev.codlivro && item.codlivro) prev.codlivro = item.codlivro;
        if (isbnQualityScore(item.isbn) > isbnQualityScore(prev.isbn)) prev.isbn = item.isbn;
      }
    });

    const merged = byTitle.size ? [...byTitle.values()] : [...byKey.values()];

    return merged
      .map((item) => ({
        key: item.isbn && isReliableIsbn(item.isbn)
          ? `isbn:${item.isbn}`
          : (item.codlivro ? `cod:${item.codlivro}` : `title:${item.titleKey || normalizeTitle(item.titulo)}`),
        isbn: item.isbn || "",
        codlivro: item.codlivro || "",
        titulo: item.titulo,
        volume: item.volume,
        clientCount: item.clients.size,
      }))
      .sort((a, b) => b.volume - a.volume || String(a.titulo).localeCompare(String(b.titulo), "pt-BR"));
  }

  function clearIsbnSearch() {
    state.isbnFieldQuery = "";
    state.titleFieldQuery = "";
    state.selectedProducts = [];
    state.isbnResult = null;
    if (els.isbnFieldQuery) els.isbnFieldQuery.value = "";
    if (els.titleFieldQuery) els.titleFieldQuery.value = "";
    if (els.btnClearIsbn) els.btnClearIsbn.hidden = true;
    setProductResultsOpen("isbn", false);
    setProductResultsOpen("title", false);
    if (els.isbnFieldResults) els.isbnFieldResults.innerHTML = "";
    if (els.titleFieldResults) els.titleFieldResults.innerHTML = "";
    if (els.productSelected) {
      els.productSelected.hidden = true;
      els.productSelected.innerHTML = "";
    }
  }

  function clearClientSelection() {
    state.selectedClient = null;
    state.stockByKey = new Map();
    state.stockLookup = new Map();
    state.mapaQuality = null;
    if (els.clientMeta) els.clientMeta.textContent = "";
    if (els.clientSelect) els.clientSelect.value = "";
    if (els.clientQuery) {
      state.clientQuery = "";
      els.clientQuery.value = "";
    }
  }

  function productMatchesRow(product, row) {
    if (!product || !row) return false;

    if (product.isbn) {
      const set = new Set(isbnAliases(product.isbn));
      const normalized = normalizeIsbn(product.isbn);
      if (normalized) set.add(normalized);
      const digits = String(normalized || product.isbn).replace(/\D/g, "");
      if (rowMatchesIsbn(row, set, digits)) return true;
    }

    const productCod = String(product.codlivro || "").trim();
    const rowCod = String(row.codlivro || "").trim();
    if (productCod && rowCod && productCod === rowCod) return true;

    const productTitle = normalizeTitle(product.titulo || "");
    if (productTitle && normalizeTitle(row.titulo) === productTitle) return true;

    return false;
  }

  function findClientsBySelectedProducts(selected) {
    if (!selected.length || !state.mapaRows.length) {
      return { query: "", titulo: "", isbn: "", clients: [], selectedCount: 0 };
    }

    const byClient = new Map();

    state.mapaRows.forEach((r) => {
      const selectedHit = selected.some((p) => productMatchesRow(p, r));
      if (!selectedHit) return;

      const code = String(r.codigo || "").trim();
      if (!code) return;

      const qty = parseIntSafe(r.consignado) || 0;
      const preco = parseNumber(r.preco);
      const desconto = parseNumber(r.perdesconto) || 0;
      const fator = Math.max(0, 1 - desconto / 100);
      const valor = preco != null && qty ? preco * qty * fator : 0;
      const fdias = parseIntSafe(r.fdias);
      const vendido = parseIntSafe(r.vendido) || 0;

      const vendedor = rowSellerName(r);
      const prev = byClient.get(code) || {
        codigo: code,
        nome: r.nome || "Cliente sem nome",
        cidade: r.cidade || "",
        estado: r.estado || "",
        vendedor: vendedor || "",
        consignado: 0,
        valorLiquido: 0,
        fdias: null,
        vendido: 0,
      };

      prev.consignado += qty;
      prev.valorLiquido += valor;
      prev.vendido += vendido;
      if (fdias != null) prev.fdias = prev.fdias == null ? fdias : Math.max(prev.fdias, fdias);
      if (!prev.nome && r.nome) prev.nome = r.nome;
      if (!prev.vendedor && vendedor) prev.vendedor = vendedor;
      byClient.set(code, prev);
    });

    const seller = normalizeSearch(state.sellerFilter);
    const clients = [...byClient.values()]
      .filter((c) => (c.consignado || 0) > 0)
      .filter((c) => !seller || normalizeSearch(c.vendedor) === seller)
      .sort((a, b) => (b.consignado || 0) - (a.consignado || 0));

    return {
      query: selected.map((p) => p.titulo || p.isbn).join(", "),
      titulo: selected.length === 1 ? (selected[0].titulo || selected[0].isbn) : `${selected.length} itens selecionados`,
      isbn: selected.length === 1 ? (selected[0].isbn || "") : "",
      clients,
      selectedCount: selected.length,
    };
  }

  function refreshSelectedProductResults() {
    if (els.btnClearIsbn) els.btnClearIsbn.hidden = state.selectedProducts.length === 0;
    if (!state.selectedProducts.length) {
      state.isbnResult = null;
      renderSelectedProductChips();
      render();
      return;
    }
    if (state.selectedClient) clearClientSelection();
    state.isbnSearchOpen = true;
    state.isbnResult = findClientsBySelectedProducts(state.selectedProducts);
    renderSelectedProductChips();
    render();
  }

  function toggleProductSelection(item) {
    const key = item.key || productKey(item);
    if (!key) return;
    const idx = state.selectedProducts.findIndex((p) => p.key === key);
    if (idx >= 0) {
      state.selectedProducts.splice(idx, 1);
    } else {
      state.selectedProducts.push({
        key,
        isbn: item.isbn || "",
        codlivro: item.codlivro || "",
        titulo: item.titulo || "",
      });
    }
    refreshSelectedProductResults();
  }

  function isProductSelected(item) {
    const key = item.key || productKey(item);
    return state.selectedProducts.some((p) => p.key === key);
  }

  function renderSelectedProductChips() {
    if (!els.productSelected) return;
    if (!state.selectedProducts.length) {
      els.productSelected.hidden = true;
      els.productSelected.innerHTML = "";
      return;
    }
    els.productSelected.hidden = false;
    els.productSelected.innerHTML = state.selectedProducts.map((p) => {
      const label = p.titulo || p.isbn || "Item";
      const meta = p.isbn && p.titulo ? p.isbn : "";
      return `
        <button type="button" class="product-chip" data-key="${escapeHtml(p.key)}" title="Clique para remover">
          ${escapeHtml(label)}${meta ? ` · ${escapeHtml(meta)}` : ""}
          <span aria-hidden="true">×</span>
        </button>
      `;
    }).join("");
  }

  function setProductResultsOpen(kind, open) {
    const box = kind === "isbn" ? els.isbnFieldResults : els.titleFieldResults;
    const input = kind === "isbn" ? els.isbnFieldQuery : els.titleFieldQuery;
    const wrap = input?.closest(".isbn-search");
    if (!box) return;
    box.hidden = !open;
    if (wrap) wrap.classList.toggle("is-open", open);
    if (input) input.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function filterProductCatalog(kind, query) {
    const q = String(query || "").trim().toLowerCase();
    const catalog = buildProductCatalog();
    if (!q) {
      // Mostra selecionados + top itens para facilitar multi-seleção.
      const selected = catalog.filter((item) => isProductSelected(item));
      const rest = catalog.filter((item) => !isProductSelected(item)).slice(0, 12);
      return [...selected, ...rest].slice(0, 20);
    }

    const titleQ = normalizeTitle(q);
    const aliasSet = new Set(isbnAliases(q));
    const normalized = normalizeIsbn(q);
    if (normalized) aliasSet.add(normalized);
    const qDigits = q.replace(/\D/g, "");

    return catalog
      .filter((item) => {
        if (kind === "isbn") {
          const blob = `${item.isbn || ""}`.toLowerCase();
          if (blob.includes(qDigits) || blob.includes(q)) return true;
          if (qDigits.length >= 8 && (item.isbn || "").includes(qDigits)) return true;
          return [...aliasSet].some((a) => (item.isbn || "") === a);
        }
        const blob = `${item.titulo || ""}`.toLowerCase();
        return blob.includes(q) || (titleQ && normalizeTitle(item.titulo).includes(titleQ));
      })
      .slice(0, 20);
  }

  function renderProductFieldResults(kind, list) {
    const box = kind === "isbn" ? els.isbnFieldResults : els.titleFieldResults;
    if (!box) return;
    const q = kind === "isbn" ? state.isbnFieldQuery.trim() : state.titleFieldQuery.trim();

    if (!list.length) {
      box.innerHTML = `<p class="product-results-empty">Nenhuma opção encontrada.</p>`;
      setProductResultsOpen(kind, Boolean(q) || state.selectedProducts.length > 0);
      return;
    }

    box.innerHTML = `
      <div class="product-results-head">Clique para selecionar ou tirar a seleção</div>
      ${list.map((item) => {
        const selected = isProductSelected(item);
        const isbnLabel = item.isbn || "Sem ISBN";
        const meta = [
          `${item.clientCount.toLocaleString("pt-BR")} cliente(s)`,
          `Saldo ${item.volume.toLocaleString("pt-BR")}`,
        ].join(" · ");
        return `
          <button type="button" class="product-result${selected ? " is-selected" : ""}" data-kind="${kind}" data-key="${escapeHtml(item.key)}" data-isbn="${escapeHtml(item.isbn || "")}" data-titulo="${escapeHtml(item.titulo || "")}" data-codlivro="${escapeHtml(item.codlivro || "")}" role="option" aria-selected="${selected}">
            <strong>${escapeHtml(kind === "isbn" ? isbnLabel : item.titulo)}</strong>
            <span>${escapeHtml(kind === "isbn" ? (item.titulo || "—") : isbnLabel)}</span>
            <small>${escapeHtml(meta)}</small>
            <span class="pick-hint">${selected ? "Selecionado — clique para remover" : "Clique para selecionar"}</span>
          </button>
        `;
      }).join("")}
    `;
    setProductResultsOpen(kind, true);
  }

  function runProductSearch({ rawQuery = "", exactTitle = "", exactIsbn = "" } = {}) {
    // Compatibilidade: seleção única vinda da busca do topo.
    const catalog = buildProductCatalog();
    let item = null;
    if (exactIsbn) {
      item = catalog.find((p) => p.isbn && (p.isbn === normalizeIsbn(exactIsbn) || p.isbn === expandIsbnCandidate(exactIsbn) || isbnAliases(exactIsbn).includes(p.isbn)));
    }
    if (!item && exactTitle) {
      const needle = normalizeTitle(exactTitle);
      item = catalog.find((p) => normalizeTitle(p.titulo) === needle);
    }
    if (!item && rawQuery) {
      const list = filterProductCatalog("title", rawQuery);
      item = list[0] || filterProductCatalog("isbn", rawQuery)[0] || null;
    }
    if (!item) {
      clearIsbnSearch();
      render();
      return;
    }
    if (!isProductSelected(item)) toggleProductSelection(item);
    else refreshSelectedProductResults();
  }

  function runIsbnSearch(rawQuery) {
    runProductSearch({ rawQuery });
  }

  function isbnSortValue(client, key) {
    const uf = [client.cidade, client.estado].filter(Boolean).join("/") || "";
    switch (key) {
      case "codigo": {
        const n = Number(String(client.codigo || "").replace(/\D/g, ""));
        return Number.isFinite(n) && String(client.codigo || "").replace(/\D/g, "") ? n : String(client.codigo || "");
      }
      case "cliente":
        return String(client.nome || "");
      case "uf":
        return uf;
      case "saldo":
        return client.consignado || 0;
      case "valor":
        return client.valorLiquido || 0;
      case "fdias":
        return client.fdias == null ? -1 : client.fdias;
      case "vendido":
        return client.vendido || 0;
      default:
        return 0;
    }
  }

  function compareIsbnClients(a, b) {
    const av = isbnSortValue(a, state.isbnSortKey);
    const bv = isbnSortValue(b, state.isbnSortKey);
    let cmp = 0;
    if (typeof av === "string" || typeof bv === "string") {
      cmp = String(av).localeCompare(String(bv), "pt-BR", { numeric: true, sensitivity: "base" });
    } else {
      cmp = av === bv ? 0 : av < bv ? -1 : 1;
    }
    if (cmp === 0) {
      cmp = String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    }
    return state.isbnSortDir === "asc" ? cmp : -cmp;
  }

  function renderIsbnResults() {
    if (!els.isbnResults) return;
    const result = state.isbnResult;
    const show = Boolean(result && state.selectedProducts.length && !state.selectedClient);
    els.isbnResults.hidden = !show;
    if (!show) return;

    const clients = [...(result.clients || [])].sort(compareIsbnClients);
    const volume = clients.reduce((acc, c) => acc + (c.consignado || 0), 0);
    const valor = clients.reduce((acc, c) => acc + (c.valorLiquido || 0), 0);
    const title = result.titulo || "Itens selecionados";
    const isbnLabel = result.isbn || "";

    if (els.isbnResultTitle) els.isbnResultTitle.textContent = title;
    if (els.isbnResultMeta) {
      const label = state.selectedProducts.length > 1
        ? `${state.selectedProducts.length} itens`
        : (isbnLabel ? `ISBN ${isbnLabel}` : "Título/ISBN");
      els.isbnResultMeta.textContent = clients.length
        ? `${label} · ${clients.length.toLocaleString("pt-BR")} cliente(s) com estoque`
        : `${label} · nenhum cliente com saldo consignado`;
    }
    if (els.isbnSumClients) els.isbnSumClients.textContent = clients.length.toLocaleString("pt-BR");
    if (els.isbnSumVolume) els.isbnSumVolume.textContent = volume.toLocaleString("pt-BR");
    if (els.isbnSumValue) els.isbnSumValue.textContent = money(valor);

    if (els.isbnGrid) {
      els.isbnGrid.querySelectorAll("th.sortable").forEach((th) => {
        const key = th.dataset.sort;
        const active = key === state.isbnSortKey;
        th.setAttribute("aria-sort", active ? (state.isbnSortDir === "asc" ? "ascending" : "descending") : "none");
        th.classList.toggle("is-sorted", active);
        th.classList.toggle("is-asc", active && state.isbnSortDir === "asc");
        th.classList.toggle("is-desc", active && state.isbnSortDir === "desc");
      });
    }

    if (els.isbnTbody) {
      if (!clients.length) {
        els.isbnTbody.innerHTML = `
          <tr>
            <td colspan="7">Nenhum cliente com os itens selecionados em estoque no Mapão importado.</td>
          </tr>
        `;
      } else {
        els.isbnTbody.innerHTML = clients.map((c) => {
          const uf = [c.cidade, c.estado].filter(Boolean).join("/") || "—";
          const seller = c.vendedor ? ` · ${c.vendedor}` : "";
          return `
            <tr data-code="${escapeHtml(c.codigo)}">
              <td>${escapeHtml(c.codigo)}</td>
              <td>${escapeHtml(c.nome)}${seller ? `<span class="author">${escapeHtml(seller.trim())}</span>` : ""}</td>
              <td>${escapeHtml(uf)}</td>
              <td class="num">${(c.consignado || 0).toLocaleString("pt-BR")}</td>
              <td class="num">${money(c.valorLiquido || 0)}</td>
              <td class="num fdias">${c.fdias == null ? "—" : c.fdias.toLocaleString("pt-BR")}</td>
              <td class="num">${(c.vendido || 0).toLocaleString("pt-BR")}</td>
            </tr>
          `;
        }).join("");
      }
    }
  }

  function normalizeSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  // Clientes do vendedor do Mapão selecionado (ou todos, sem filtro).
  function clientsInSellerScope() {
    const seller = normalizeSearch(state.sellerFilter);
    if (!seller) return state.clients;
    return state.clients.filter((c) => normalizeSearch(c.vendedor) === seller);
  }

  function filteredClients({ ignorePortfolio = false } = {}) {
    const q = normalizeSearch(state.clientQuery);
    let base = clientsInSellerScope();
    if (!ignorePortfolio && state.portfolioClientFilter) {
      const overview = ensurePortfolioOverview();
      const codes = codesForPortfolioFilter(state.portfolioClientFilter, overview);
      if (codes) {
        const allowed = new Set(codes.map(String));
        base = base.filter((c) => allowed.has(String(c.codigo)));
      }
    }
    return base.filter((c) => {
      if (!q) return true;
      const blob = normalizeSearch(`${c.codigo} ${c.nome} ${c.cidade} ${c.estado} ${c.vendedor}`);
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

  function reliableIsbnValue(value) {
    if (!value || value === "—") return "";
    const normalized = normalizeIsbn(value) || expandIsbnCandidate(value);
    return isReliableIsbn(normalized) ? normalized : "";
  }

  function titleQueryKey(item) {
    const isbn = reliableIsbnValue(item?.isbn);
    if (isbn) return `isbn:${isbn}`;
    const title = normalizeTitle(item?.titulo || item?.query || "");
    if (title) return `title:${title}`;
    return "";
  }

  function rowMatchesSelectedQuery(row, item) {
    if (!row || !item) return false;

    const itemKey = item.key || titleQueryKey(item);
    if (!itemKey) return false;

    // Mesma chave usada na seleção (ISBN confiável ou título normalizado).
    if (itemKey === titleQueryKey(row)) return true;
    if (row.stock && itemKey === titleQueryKey({
      isbn: row.stock.isbn,
      titulo: row.stock.titulo || row.stock.titleKey,
    })) return true;

    const rowTitle = normalizeTitle(row.titulo || "");
    const stockTitle = row.stock?.titleKey || normalizeTitle(row.stock?.titulo || "");
    const itemTitle = normalizeTitle(item.titulo || item.query || "");

    if (itemKey.startsWith("title:") && (itemKey === `title:${rowTitle}` || (stockTitle && itemKey === `title:${stockTitle}`))) {
      return true;
    }

    if (itemKey.startsWith("isbn:")) {
      const want = itemKey.slice(5);
      const rowAliases = new Set([
        ...isbnAliases(row.isbn),
        ...isbnAliases(row.stock?.isbn),
      ]);
      if (want && rowAliases.has(want)) return true;
    }

    if (itemTitle && (rowTitle === itemTitle || stockTitle === itemTitle)) return true;
    return false;
  }

  function isTitleQuerySelected(item) {
    const key = item?.key || titleQueryKey(item);
    return Boolean(key) && state.selectedQueries.some((q) => q.key === key);
  }

  function toggleTitleQuerySelection(item) {
    const key = item?.key || titleQueryKey(item);
    if (!key) return;
    const idx = state.selectedQueries.findIndex((q) => q.key === key);
    if (idx >= 0) {
      state.selectedQueries.splice(idx, 1);
    } else {
      state.selectedQueries.push({
        key,
        isbn: reliableIsbnValue(item.isbn),
        titulo: item.titulo || item.query || "",
        query: item.query || item.titulo || reliableIsbnValue(item.isbn) || "",
      });
    }
  }

  function clearSelectedQueries() {
    state.selectedQueries = [];
    state.query = "";
    if (els.q) els.q.value = "";
    setTitleResultsOpen(false);
    if (els.titleResults) els.titleResults.innerHTML = "";
    renderSelectedTitleChips();
  }

  function renderSelectedTitleChips() {
    if (!els.titleSelected) return;
    if (!state.selectedQueries.length) {
      els.titleSelected.hidden = true;
      els.titleSelected.innerHTML = "";
      return;
    }
    els.titleSelected.hidden = false;
    els.titleSelected.innerHTML = state.selectedQueries.map((item) => {
      const label = item.titulo || item.isbn || item.query || "Título";
      return `
        <button type="button" class="product-chip" data-key="${escapeHtml(item.key)}" title="Clique para remover">
          <span>${escapeHtml(label)}</span>
          <span aria-hidden="true">×</span>
        </button>
      `;
    }).join("");
  }

  function rowsMatchingTitleSelection(allRows = buildAllRows()) {
    const selected = state.selectedQueries;
    if (selected.length) {
      return allRows.filter((row) => selected.some((item) => rowMatchesSelectedQuery(row, item)));
    }
    const q = state.query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((row) => {
      const blob = `${row.titulo} ${row.autor} ${row.isbn}`.toLowerCase();
      return blob.includes(q);
    });
  }

  function rowMatchesSituationFilter(row) {
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
    return true;
  }

  function rowsForRender() {
    return rowsMatchingTitleSelection()
      .filter(rowMatchesSituationFilter)
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

  function updateKpis(rows) {
    let match = 0;
    let zero = 0;
    let idle90 = 0;
    let idle180 = 0;

    rows.forEach((row) => {
      const stock = row.stock;
      if (row.inRanking && stock) match += 1;
      if (!stock || (stock.consignado || 0) <= 0) zero += 1;
      if (stock && (stock.fdias || 0) >= IDLE_DAYS) idle90 += 1;
      if (stock && (stock.fdias || 0) >= IDLE_DAYS_LONG) idle180 += 1;
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

  // Itens do ranking que entram no cálculo de saldo/ruptura (Top 150).
  function topSaldoRankingItems() {
    return state.ranking.filter((item) => item.ranking != null && item.ranking >= 1 && item.ranking <= TOP_SALDO_RANK);
  }

  // Métricas do Top 150 sobre o estoque de UM cliente (mesma regra de saldo/potencial/parado
  // usada em updateActionKpis, mas sem depender das linhas da tabela / recorte de títulos).
  function computeTop150Metrics(stockByKey, stockLookup, top150Items = topSaldoRankingItems()) {
    let urgent = 0;
    let alert = 0;
    let acerto = 0;
    let idle180Count = 0;
    let top150 = 0;
    let withStock = 0;
    let rupture = 0;
    let valorParado = 0;
    let potencial = 0;
    const rupturedItems = [];

    top150Items.forEach((item) => {
      top150 += 1;
      const stock = findStockForRankingIn(item, stockLookup, stockByKey);
      const saldo = stock ? (stock.consignado || 0) : 0;
      const unit = unitNetPrice(stock);

      if (!stock || saldo <= 0) {
        rupture += 1;
        urgent += 1;
        rupturedItems.push(item);
        if (unit != null) potencial += TARGET_OK_SALDO * unit;
        return;
      }

      withStock += 1;
      if (saldo <= 3) {
        urgent += 1;
        if (unit != null) potencial += Math.max(TARGET_OK_SALDO - saldo, 0) * unit;
      } else if (saldo <= 7) {
        alert += 1;
        if (unit != null) potencial += Math.max(TARGET_OK_SALDO - saldo, 0) * unit;
      }
    });

    stockByKey.forEach((stock) => {
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

    return {
      top150,
      withStock,
      rupture,
      pctStock,
      pctRupture,
      urgent,
      alert,
      acerto,
      idle180Count,
      valorParado,
      potencial,
      rupturedItems,
    };
  }

  function coverageBandKey(pctStock) {
    const band = COVERAGE_BANDS.find((b) => pctStock >= b.min && pctStock <= b.max);
    return band ? band.key : "lt50";
  }

  function invalidatePortfolioOverview() {
    state.portfolioOverview = null;
  }

  // Agregados da carteira sobre os clientes informados (já filtrados pelo vendedor do Mapão).
  function computePortfolioOverview(clients) {
    const list = Array.isArray(clients) ? clients : [];
    const clientCount = list.length;
    const bandCodes = Object.fromEntries(COVERAGE_BANDS.map((b) => [b.key, []]));
    const highRuptureCodes = [];
    const below50Codes = [];
    const ge90Codes = [];
    const clientRows = [];
    const titleRupture = new Map();
    const top150Items = topSaldoRankingItems();
    let sumCoverage = 0;
    let sumPotencial = 0;
    let sumValorParado = 0;

    // Agrupa o Mapão por cliente uma única vez (evita varrer todas as linhas por cliente).
    const rowsByClient = new Map();
    state.mapaRows.forEach((row) => {
      const code = String(row.codigo || "").trim();
      if (!code) return;
      const bucket = rowsByClient.get(code);
      if (bucket) bucket.push(row);
      else rowsByClient.set(code, [row]);
    });

    list.forEach((client) => {
      const clientRowsRaw = rowsByClient.get(String(client.codigo)) || [];
      const built = buildClientStock(clientRowsRaw, client.codigo);
      const metrics = computeTop150Metrics(built.byKey, built.lookup, top150Items);
      const band = coverageBandKey(metrics.pctStock);
      bandCodes[band].push(client.codigo);
      if (metrics.pctStock < 50) below50Codes.push(client.codigo);
      if (metrics.pctStock >= 90) ge90Codes.push(client.codigo);
      if (metrics.pctRupture >= HIGH_RUPTURE_PCT) highRuptureCodes.push(client.codigo);

      sumCoverage += metrics.pctStock;
      sumPotencial += metrics.potencial;
      sumValorParado += metrics.valorParado;

      metrics.rupturedItems.forEach((item) => {
        const key = item.isbn || item.titleKey || String(item.ranking);
        const prev = titleRupture.get(key) || {
          key,
          isbn: item.isbn || "",
          titulo: item.titulo || "",
          ranking: item.ranking,
          storeCount: 0,
        };
        prev.storeCount += 1;
        titleRupture.set(key, prev);
      });

      // Totais do Mapão inteiro do cliente (não só Top 150).
      let isbnsConsignados = 0;
      let volumeConsignado = 0;
      built.byKey.forEach((stock) => {
        const qty = stock.consignado || 0;
        if (qty <= 0) return;
        isbnsConsignados += 1;
        volumeConsignado += qty;
      });

      clientRows.push({
        codigo: client.codigo,
        nome: client.nome,
        cidade: client.cidade || "",
        estado: client.estado || "",
        pctStock: metrics.pctStock,
        pctRupture: metrics.pctRupture,
        rupture: metrics.rupture,
        valorParado: metrics.valorParado,
        potencial: metrics.potencial,
        isbnsConsignados,
        volumeConsignado,
        score: (100 - metrics.pctStock) + metrics.pctRupture,
      });
    });

    const avgCoverage = clientCount ? Math.round(sumCoverage / clientCount) : 0;
    const bands = COVERAGE_BANDS.map((b) => ({
      ...b,
      count: bandCodes[b.key].length,
      pct: clientCount ? Math.round((bandCodes[b.key].length / clientCount) * 100) : 0,
    }));

    const minChronicStores = Math.max(1, Math.ceil(clientCount * (CHRONIC_STORE_PCT / 100)));
    const chronicAll = [...titleRupture.values()]
      .filter((t) => t.storeCount >= minChronicStores)
      .sort((a, b) => b.storeCount - a.storeCount || (a.ranking || 0) - (b.ranking || 0));
    const chronicTitles = chronicAll
      .slice(0, PORTFOLIO_LIST_LIMIT)
      .map((t) => ({
        ...t,
        storePct: clientCount ? Math.round((t.storeCount / clientCount) * 100) : 0,
      }));

    const byName = (a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    // Listas completas: o recorte (e lojas desconsideradas) é aplicado só na renderização
    // do roteiro/prioridades, sem afetar o overview geral.
    const worstCoverage = [...clientRows]
      .sort((a, b) => a.pctStock - b.pctStock || b.rupture - a.rupture || byName(a, b));
    const mostRupture = [...clientRows]
      .sort((a, b) => b.rupture - a.rupture || a.pctStock - b.pctStock || byName(a, b));
    const mostIdleValue = [...clientRows]
      .sort((a, b) => b.valorParado - a.valorParado || byName(a, b));
    const roteiro = [...clientRows]
      .sort((a, b) => b.score - a.score || a.pctStock - b.pctStock || byName(a, b));

    return {
      // Escopo do cache: vendedor do Mapão usado no cálculo.
      sellerKey: normalizeSearch(state.sellerFilter),
      clientCount,
      avgCoverage,
      below50Count: below50Codes.length,
      ge90Count: ge90Codes.length,
      highRuptureCount: highRuptureCodes.length,
      bands,
      bandCodes,
      below50Codes,
      ge90Codes,
      highRuptureCodes,
      potencial: sumPotencial,
      valorParado: sumValorParado,
      chronicTitleCount: chronicAll.length,
      clientRows,
      roteiro,
      worstCoverage,
      mostRupture,
      mostIdleValue,
      chronicTitles,
    };
  }

  // Cache de state.portfolioOverview; recalcula se o vendedor do Mapão mudou.
  function ensurePortfolioOverview() {
    if (!state.clients.length || !state.ranking.length) {
      state.portfolioOverview = null;
      return null;
    }
    const sellerKey = normalizeSearch(state.sellerFilter);
    if (!state.portfolioOverview || state.portfolioOverview.sellerKey !== sellerKey) {
      state.portfolioOverview = computePortfolioOverview(clientsInSellerScope());
    }
    return state.portfolioOverview;
  }

  function portfolioFilterLabel(filter) {
    if (!filter) return "";
    if (filter.type === "band") {
      const band = COVERAGE_BANDS.find((b) => b.key === filter.key);
      return band ? `Cobertura ${band.label}` : "Faixa de cobertura";
    }
    if (filter.type === "below50") return "Cobertura abaixo de 50%";
    if (filter.type === "ge90") return "Cobertura a partir de 90%";
    if (filter.type === "highRupture") {
      return `Alta ruptura (a partir de ${HIGH_RUPTURE_PCT}% do Top 150 sem saldo)`;
    }
    return "Filtro da carteira";
  }

  function codesForPortfolioFilter(filter, overview) {
    if (!filter || !overview) return null;
    if (filter.type === "band") return overview.bandCodes[filter.key] || [];
    if (filter.type === "below50") return overview.below50Codes || [];
    if (filter.type === "ge90") return overview.ge90Codes || [];
    if (filter.type === "highRupture") return overview.highRuptureCodes || [];
    return null;
  }

  function setPortfolioClientFilter(filter) {
    const current = state.portfolioClientFilter;
    const same = current
      && filter
      && current.type === filter.type
      && current.key === filter.key;
    state.portfolioClientFilter = same ? null : filter;
    if (els.clientQuery) {
      state.clientQuery = "";
      els.clientQuery.value = "";
    }
    render();
    if (els.clientSelect) els.clientSelect.focus();
  }

  function clearPortfolioClientFilter() {
    state.portfolioClientFilter = null;
    render();
  }

  // Título crônico: reaproveita a busca por título/ISBN (clientes que ainda têm o item).
  function openChronicTitle(item) {
    if (!item) return;
    clearClientSelection();
    state.selectedProducts = [{
      key: productKey(item) || `isbn:${item.isbn || item.key || ""}`,
      isbn: item.isbn || "",
      codlivro: "",
      titulo: item.titulo || "",
    }];
    state.isbnSearchOpen = true;
    refreshSelectedProductResults();
  }

  function portfolioStockLabel(c) {
    const isbns = Number(c.isbnsConsignados || 0);
    const volume = Number(c.volumeConsignado || 0);
    return `${isbns.toLocaleString("pt-BR")} isbns consignados - volume total de ${volume.toLocaleString("pt-BR")} ex.`;
  }

  function renderPortfolioClientList(target, rows, valueFn, { ignorable = false } = {}) {
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = `<li><p class="portfolio-empty-note">Nenhum cliente neste recorte.</p></li>`;
      return;
    }
    target.innerHTML = rows.map((c) => {
      const place = [c.cidade, c.estado].filter(Boolean).join("/");
      const meta = [c.codigo, place].filter(Boolean).join(" · ");
      const ignoreBtn = ignorable
        ? `<button type="button" class="portfolio-ignore-btn" data-portfolio-ignore="${escapeHtml(c.codigo)}" title="Tirar esta loja do roteiro e das prioridades" aria-label="Desconsiderar ${escapeHtml(c.nome)}">ignorar</button>`
        : "";
      return `
        <li class="portfolio-list-row">
          <button type="button" class="portfolio-list-open" data-portfolio-client="${escapeHtml(c.codigo)}">
            <span class="portfolio-item-main">
              <strong>${escapeHtml(c.nome)}</strong>
              <span>${escapeHtml(meta || c.codigo)}</span>
            </span>
            <span class="portfolio-item-stock" title="ISBNs com saldo e volume total consignado no Mapão deste cliente">${escapeHtml(portfolioStockLabel(c))}</span>
            <em>${escapeHtml(valueFn(c))}</em>
          </button>
          ${ignoreBtn}
        </li>
      `;
    }).join("");
  }

  function renderIgnoredAnalysisList(overview) {
    if (!els.portfolioIgnoredPanel || !els.portfolioIgnored) return;
    const ignored = state.ignoredAnalysisClients;
    if (!ignored.size) {
      els.portfolioIgnoredPanel.hidden = true;
      els.portfolioIgnored.innerHTML = "";
      return;
    }
    const rows = (overview.clientRows || []).filter((c) => ignored.has(String(c.codigo)));
    // Códigos órfãos (mapa antigo) ainda aparecem para poder reverter.
    const known = new Set(rows.map((c) => String(c.codigo)));
    ignored.forEach((code) => {
      if (known.has(code)) return;
      rows.push({ codigo: code, nome: code, cidade: "", estado: "", pctStock: null, rupture: null, valorParado: null });
    });
    rows.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    els.portfolioIgnoredPanel.hidden = false;
    els.portfolioIgnored.innerHTML = rows.map((c) => {
      const place = [c.cidade, c.estado].filter(Boolean).join("/");
      const meta = [c.codigo, place].filter(Boolean).join(" · ");
      const detail = c.pctStock == null
        ? "desconsiderada na análise"
        : `cobertura ${c.pctStock}% · ${Number(c.rupture || 0).toLocaleString("pt-BR")} títulos faltando do top 150`;
      const stock = c.pctStock == null ? "" : `
            <span class="portfolio-item-stock">${escapeHtml(portfolioStockLabel(c))}</span>`;
      return `
        <li class="portfolio-list-row is-ignored">
          <button type="button" class="portfolio-list-open" data-portfolio-client="${escapeHtml(c.codigo)}">
            <span class="portfolio-item-main">
              <strong>${escapeHtml(c.nome)}</strong>
              <span>${escapeHtml(meta || c.codigo)}</span>
            </span>
            ${stock}
            <em>${escapeHtml(detail)}</em>
          </button>
          <button type="button" class="portfolio-ignore-btn is-restore" data-portfolio-consider="${escapeHtml(c.codigo)}" title="Voltar a considerar no roteiro e nas prioridades" aria-label="Considerar ${escapeHtml(c.nome)}">voltar</button>
        </li>
      `;
    }).join("");
  }

  function renderPortfolioOverview(overviewArg) {
    if (!els.portfolioOverview) return;
    const overview = overviewArg || ensurePortfolioOverview();
    if (!overview) {
      els.portfolioOverview.hidden = true;
      return;
    }

    const filter = state.portfolioClientFilter;
    const filterActive = Boolean(filter);
    const sellerLabel = state.sellerFilter ? ` — ${state.sellerFilter}` : "";
    if (els.portfolioTitle) {
      els.portfolioTitle.textContent = `Visão geral da carteira${sellerLabel}`;
    }
    if (els.portfolioScope) {
      const clientsLabel = `${overview.clientCount.toLocaleString("pt-BR")} cliente(s)`;
      const sellerScope = state.sellerFilter ? `, vendedor ${state.sellerFilter}` : "";
      els.portfolioScope.textContent = filterActive
        ? `${clientsLabel}${sellerScope}. Filtro: ${portfolioFilterLabel(filter)}`
        : `${clientsLabel}${sellerScope}. Base: mais vendidos Rocco (Top ${TOP_SALDO_RANK})`;
    }
    if (els.btnClearPortfolioFilter) {
      els.btnClearPortfolioFilter.hidden = !filterActive;
    }

    if (els.portfolioKpis) {
      const kpis = [
        {
          key: "clients",
          label: "Clientes na carteira",
          value: overview.clientCount.toLocaleString("pt-BR"),
          meta: state.sellerFilter
            ? `Lojas do vendedor ${state.sellerFilter} neste Mapão`
            : "Total de lojas neste Mapão",
        },
        {
          key: "avg",
          label: "Cobertura média do Top 150",
          value: `${overview.avgCoverage}%`,
          meta: "Em média, quanto do Top 150 as lojas têm em estoque",
        },
        {
          key: "below50",
          label: "Cobertura abaixo de 50%",
          value: overview.below50Count.toLocaleString("pt-BR"),
          meta: "Lojas com menos da metade do Top 150 em estoque",
          tone: "is-warn",
          filter: { type: "below50" },
        },
        {
          key: "ge90",
          label: "Cobertura a partir de 90%",
          value: overview.ge90Count.toLocaleString("pt-BR"),
          meta: "Lojas com quase todo o Top 150 em estoque",
          tone: "is-ok",
          filter: { type: "ge90" },
        },
        {
          key: "highRupture",
          label: "Alta ruptura",
          value: overview.highRuptureCount.toLocaleString("pt-BR"),
          meta: `Lojas com pelo menos ${HIGH_RUPTURE_PCT}% do Top 150 sem saldo`,
          tone: "is-alert",
          filter: { type: "highRupture" },
        },
      ];

      els.portfolioKpis.innerHTML = kpis.map((kpi) => {
        const active = filter
          && kpi.filter
          && filter.type === kpi.filter.type
          && filter.key === kpi.filter.key;
        const tag = kpi.filter ? "button" : "div";
        const attrs = kpi.filter
          ? `type="button" data-portfolio-filter-type="${escapeHtml(kpi.filter.type)}" class="portfolio-kpi is-clickable ${kpi.tone || ""}${active ? " is-active" : ""}"`
          : `class="portfolio-kpi ${kpi.tone || ""}"`;
        return `
          <${tag} ${attrs}>
            <span class="portfolio-kpi-label">${escapeHtml(kpi.label)}</span>
            <strong class="portfolio-kpi-value">${escapeHtml(kpi.value)}</strong>
            <span class="portfolio-kpi-meta">${escapeHtml(kpi.meta)}</span>
          </${tag}>
        `;
      }).join("");
    }

    if (els.portfolioBands) {
      els.portfolioBands.innerHTML = overview.bands.map((band) => {
        const active = filter && filter.type === "band" && filter.key === band.key;
        return `
          <li>
            <button type="button" class="portfolio-band${active ? " is-active" : ""}" data-portfolio-band="${escapeHtml(band.key)}">
              <span class="portfolio-band-label">${escapeHtml(band.label)}</span>
              <span class="portfolio-band-track"><span class="portfolio-band-fill ${band.fillClass || ""}" style="--w:${band.pct}%"></span></span>
              <span class="portfolio-band-n">${band.count.toLocaleString("pt-BR")}</span>
            </button>
          </li>
        `;
      }).join("");
    }

    if (els.portfolioOpp) {
      els.portfolioOpp.innerHTML = `
        <div>
          <dt>Potencial de reposição no Top 150 (até saldo 8)</dt>
          <dd>${money(overview.potencial)}</dd>
        </div>
        <div>
          <dt>Valor parado há 180 dias ou mais</dt>
          <dd>${money(overview.valorParado)}</dd>
        </div>
        <div>
          <dt>Títulos do Top 150 sem saldo em pelo menos ${CHRONIC_STORE_PCT}% das lojas</dt>
          <dd>${overview.chronicTitleCount.toLocaleString("pt-BR")} títulos</dd>
        </div>
      `;
    }

    renderPortfolioClientList(
      els.portfolioRoteiro,
      visibleAnalysisRows(overview.roteiro),
      (c) => `cobertura ${c.pctStock}%, ${c.rupture.toLocaleString("pt-BR")} títulos faltando do top 150`,
      { ignorable: true }
    );
    renderPortfolioClientList(
      els.portfolioWorst,
      visibleAnalysisRows(overview.worstCoverage),
      (c) => `cobertura ${c.pctStock}% do top 150`,
      { ignorable: true }
    );
    renderPortfolioClientList(
      els.portfolioRupture,
      visibleAnalysisRows(overview.mostRupture),
      (c) => `${c.rupture.toLocaleString("pt-BR")} títulos faltando do top 150`,
      { ignorable: true }
    );
    renderPortfolioClientList(
      els.portfolioIdle,
      visibleAnalysisRows(overview.mostIdleValue),
      (c) => money(c.valorParado),
      { ignorable: true }
    );
    renderIgnoredAnalysisList(overview);

    if (els.portfolioChronic) {
      if (!overview.chronicTitles.length) {
        els.portfolioChronic.innerHTML = `<li><p class="portfolio-empty-note">Nenhum título do Top 150 está sem saldo em pelo menos ${CHRONIC_STORE_PCT}% das lojas.</p></li>`;
      } else {
        els.portfolioChronic.innerHTML = overview.chronicTitles.map((t) => `
          <li>
            <button type="button" data-portfolio-chronic="${escapeHtml(t.key)}" data-isbn="${escapeHtml(t.isbn || "")}" data-titulo="${escapeHtml(t.titulo || "")}">
              <span class="portfolio-item-main">
                <strong>${escapeHtml(t.titulo || t.isbn || "Sem título")}</strong>
                <span>${escapeHtml(t.isbn || "Sem ISBN")}${t.ranking != null ? ` · ranking ${t.ranking}` : ""}</span>
              </span>
              <em>sem saldo em ${t.storeCount.toLocaleString("pt-BR")} lojas (${t.storePct}%)</em>
            </button>
          </li>
        `).join("");
      }
    }
  }

  function updateActionKpis(rows) {
    let urgent = 0;
    let alert = 0;
    let acerto = 0;
    let idle180Count = 0;
    let top150 = 0;
    let withStock = 0;
    let rupture = 0;
    let valorParado = 0;
    let potencial = 0;

    rows.forEach((row) => {
      const stock = row.stock;
      const saldo = stock ? (stock.consignado || 0) : 0;
      const inTop150 = row.inRanking && row.ranking != null && row.ranking >= 1 && row.ranking <= TOP_SALDO_RANK;

      if (inTop150) {
        top150 += 1;
        if (!stock || saldo <= 0) {
          rupture += 1;
          urgent += 1;
          const unit = unitNetPrice(stock);
          if (unit != null) potencial += TARGET_OK_SALDO * unit;
        } else {
          withStock += 1;
          const unit = unitNetPrice(stock);
          if (saldo <= 3) {
            urgent += 1;
            if (unit != null) potencial += Math.max(TARGET_OK_SALDO - saldo, 0) * unit;
          } else if (saldo <= 7) {
            alert += 1;
            if (unit != null) potencial += Math.max(TARGET_OK_SALDO - saldo, 0) * unit;
          }
        }
      } else if (row.sit?.key === "urgent") {
        urgent += 1;
      } else if (row.sit?.key === "alert") {
        alert += 1;
      }

      if (stock && saldo > 0) {
        const fdias = stock.fdias || 0;
        if (fdias >= IDLE_DAYS) acerto += 1;
        if (fdias >= IDLE_DAYS_LONG) {
          idle180Count += 1;
          valorParado += stock.valorLiquido || 0;
        }
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
    els.sumCoverage.textContent = top150 ? `${pctStock}% com saldo` : (rows.length ? "—": "—");
    els.sumCoverageMeta.textContent = top150
      ? `${pctRupture}% em ruptura · ${withStock}/${top150} com estoque`
      : `${rows.length.toLocaleString("pt-BR")} título(s) no recorte`;
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

  function hasClearableFilters() {
    return Boolean(
      state.selectedClient
      || state.sellerFilter
      || state.portfolioClientFilter
      || state.filter !== "all"
      || state.query.trim()
      || state.selectedQueries.length
      || state.selectedProducts.length
    );
  }

  function updateActiveFilters() {
    const client = state.selectedClient;
    const filterLabel = FILTER_LABELS[state.filter] || state.filter;
    const search = state.query.trim();
    const selectedTitles = state.selectedQueries;
    const searchLabel = selectedTitles.length
      ? selectedTitles.map((item) => item.titulo || item.isbn || item.query).filter(Boolean).join(", ")
      : search;
    const canClear = hasClearableFilters();

    if (els.btnClearFilters) {
      els.btnClearFilters.hidden = !canClear;
    }

    if (els.sideActiveFilters) {
      if (!client && !state.sellerFilter && !state.portfolioClientFilter) {
        els.sideActiveFilters.innerHTML = `<li>Nenhum cliente selecionado</li>`;
      } else {
        els.sideActiveFilters.innerHTML = `
          ${state.sellerFilter ? `<li><strong>Vendedor do Mapão</strong>${escapeHtml(state.sellerFilter)}</li>` : ""}
          ${state.portfolioClientFilter ? `<li><strong>Filtro carteira</strong>${escapeHtml(portfolioFilterLabel(state.portfolioClientFilter))}</li>` : ""}
          <li><strong>Cliente</strong>${client ? `${escapeHtml(client.codigo)} · ${escapeHtml(client.nome)}` : "Nenhum"}</li>
          <li><strong>Base</strong>Mais vendidos Rocco (Top 500)</li>
          <li><strong>Filtro da tabela</strong>${escapeHtml(filterLabel)}</li>
          <li><strong>Busca de título</strong>${searchLabel ? escapeHtml(searchLabel) : "Nenhuma"}</li>
        `;
      }
    }

    if (els.mainActiveFilters) {
      if (!client && !state.sellerFilter && !state.portfolioClientFilter && !canClear) {
        els.mainActiveFilters.hidden = true;
        els.mainActiveFilters.innerHTML = "";
        return;
      }

      els.mainActiveFilters.hidden = false;
      const tone = filterTone(state.filter);
      const hasActiveFilter = state.filter !== "all";
      const searchChips = selectedTitles.length
        ? selectedTitles.map((item) => {
          const label = item.titulo || item.isbn || item.query || "Título";
          return `<button type="button" class="filter-chip is-removable" data-clear="search-item" data-key="${escapeHtml(item.key)}" title="Remover título"><em>Título</em> ${escapeHtml(label)} <span class="chip-x" aria-hidden="true">×</span></button>`;
        }).join("")
        : (search
          ? `<button type="button" class="filter-chip is-removable" data-clear="search" title="Remover busca"><em>Busca</em> ${escapeHtml(search)} <span class="chip-x" aria-hidden="true">×</span></button>`
          : "");
      els.mainActiveFilters.innerHTML = `
        ${state.seller ? `<button type="button" class="filter-chip is-removable" data-clear="seller" title="Trocar usuário"><em>Usuário</em> ${escapeHtml(state.seller)} <span class="chip-x" aria-hidden="true">×</span></button>` : ""}
        ${state.sellerFilter ? `<button type="button" class="filter-chip is-removable" data-clear="seller-filter" title="Remover filtro de vendedor"><em>Vendedor Mapão</em> ${escapeHtml(state.sellerFilter)} <span class="chip-x" aria-hidden="true">×</span></button>` : ""}
        ${state.portfolioClientFilter ? `<button type="button" class="filter-chip is-removable" data-clear="portfolio-filter" title="Remover filtro da carteira"><em>Carteira</em> ${escapeHtml(portfolioFilterLabel(state.portfolioClientFilter))} <span class="chip-x" aria-hidden="true">×</span></button>` : ""}
        ${client ? `<button type="button" class="filter-chip is-removable" data-clear="client" title="Remover cliente"><em>Cliente</em> ${escapeHtml(client.codigo)} · ${escapeHtml(client.nome)} <span class="chip-x" aria-hidden="true">×</span></button>` : ""}
        <span class="filter-chip"><em>Base</em> Mais vendidos</span>
        ${hasActiveFilter
          ? `<button type="button" class="filter-chip is-removable ${tone}" data-clear="filter" title="Remover filtro"><em>Filtro</em> ${escapeHtml(filterLabel)} <span class="chip-x" aria-hidden="true">×</span></button>`
          : `<span class="filter-chip ${tone}"><em>Filtro</em> ${escapeHtml(filterLabel)}</span>`}
        ${searchChips}
        <button type="button" class="clear-filters-main" id="btnClearFiltersMain"${canClear ? "" : " disabled"}>Limpar filtros</button>
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
    clearSelectedQueries();
    clearIsbnSearch();
    state.sellerFilter = "";
    state.portfolioClientFilter = null;
    invalidatePortfolioOverview();
    if (els.sellerFilter) els.sellerFilter.value = "";
    clearClientSelection();
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
        const seller = c.vendedor ? `Vendedor ${c.vendedor}` : "";
        const meta = [place, seller].filter(Boolean).join(" · ");
        return `
          <button type="button" class="client-result${active}" data-code="${escapeHtml(c.codigo)}" role="option" aria-selected="${state.selectedClient?.codigo === c.codigo}">
            <strong>${escapeHtml(c.codigo)}</strong>
            <span>${escapeHtml(c.nome)}</span>
            ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
          </button>
        `;
      }).join("")}
      ${more}
    `;
    setClientResultsOpen(true);
  }

  function renderSellerFilterOptions() {
    if (!els.sellerFilter) return;
    const sellers = listMapaSellers();
    const current = state.sellerFilter || "";
    els.sellerFilter.innerHTML = `
      <option value="">Todos os vendedores</option>
      ${sellers.map((name) => `
        <option value="${escapeHtml(name)}"${name === current ? " selected" : ""}>${escapeHtml(name)}</option>
      `).join("")}
    `;
    els.sellerFilter.value = current;
    els.sellerFilter.disabled = sellers.length === 0;
  }

  // Cliente selecionado fora do vendedor/busca atual: limpa sem reentrar no render.
  function dropOutOfScopeClient() {
    if (!state.selectedClient || !state.clients.length) return;
    const code = state.selectedClient.codigo;
    // Filtro da carteira não derruba o cliente aberto (ele vem das listas da visão geral).
    if (filteredClients({ ignorePortfolio: true }).some((c) => c.codigo === code)) return;
    state.selectedClient = null;
    state.stockByKey = new Map();
    state.stockLookup = new Map();
    state.mapaQuality = null;
    if (els.clientMeta) els.clientMeta.textContent = "";
  }

  function renderClientPicker() {
    const hasClients = state.clients.length > 0;
    if (els.clientBar) els.clientBar.hidden = !hasClients;
    if (!hasClients) return;

    renderSellerFilterOptions();

    const selectedCode = state.selectedClient?.codigo || "";
    const visible = filteredClients();
    const selectedVisible = visible.some((c) => c.codigo === selectedCode);
    const optionClients = selectedCode && !selectedVisible ? [state.selectedClient, ...visible] : visible;
    const placeholderSelected = selectedCode ? "" : " selected";
    const options = optionClients
      .map((c) => {
        const seller = c.vendedor ? ` · ${c.vendedor}` : "";
        const label = `${c.codigo} · ${c.nome}${seller}`;
        const selected = c.codigo === selectedCode ? " selected" : "";
        return `<option value="${escapeHtml(c.codigo)}"${selected}>${escapeHtml(label)}</option>`;
      })
      .join("");

    const placeholder = state.portfolioClientFilter
      ? `Selecione um cliente (${visible.length.toLocaleString("pt-BR")} filtrado(s))`
      : `Selecione um cliente (${visible.length})`;
    els.clientSelect.innerHTML = `<option value=""${placeholderSelected}>${escapeHtml(placeholder)}</option>${options}`;
    els.clientSelect.value = selectedCode;
    renderClientResults(visible);
  }

  function updateEmptyState() {
    if (state.selectedClient) return;
    if (state.isbnResult && state.selectedProducts.length) return;

    const hasMapa = state.clients.length > 0;
    if (els.btnImportMain) els.btnImportMain.hidden = hasMapa;
    if (els.emptyHint) els.emptyHint.hidden = hasMapa;

    if (hasMapa && ensurePortfolioOverview()) {
      els.topSub.textContent = state.seller
        ? `${state.seller} · visão geral da carteira · escolha um cliente para detalhar.`
        : "Visão geral da carteira · escolha um cliente para detalhar.";
    } else if (hasMapa) {
      els.emptyTitle.textContent = "Escolha um cliente";
      els.emptyText.textContent = `Mapão importado com ${state.clients.length.toLocaleString("pt-BR")} cliente(s). Escolha um cliente acima, ou busque por título/ISBN à direita para ver quem tem o item em estoque.`;
      els.topSub.textContent = state.seller
        ? `${state.seller} · selecione um cliente para analisar o estoque.`
        : "Selecione um cliente para analisar o estoque.";
    } else {
      els.emptyTitle.textContent = "Pronto para o cruzamento";
      els.emptyText.textContent = "Importe o Mapão em Excel (.xlsx ou .xls) para cruzar o estoque do cliente com os mais vendidos Rocco.";
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
    dropOutOfScopeClient();
    const hasClient = Boolean(state.selectedClient);
    const hasIsbnView = Boolean(state.isbnResult && state.selectedProducts.length && !hasClient);
    const hasMapa = state.clients.length > 0;
    const showPortfolio = hasMapa && !hasClient && !hasIsbnView;
    const portfolioData = showPortfolio ? ensurePortfolioOverview() : null;

    if (els.isbnSearchPanel) els.isbnSearchPanel.hidden = !state.isbnSearchOpen;
    if (els.btnToggleIsbnSearch) {
      els.btnToggleIsbnSearch.hidden = state.clients.length === 0;
      els.btnToggleIsbnSearch.textContent = state.isbnSearchOpen ? "Ocultar busca por título/ISBN" : "Buscar por título/ISBN";
    }

    if (els.emptyState) els.emptyState.hidden = hasClient || hasIsbnView || Boolean(portfolioData);
    if (els.portfolioOverview) els.portfolioOverview.hidden = !portfolioData;
    if (els.grid) els.grid.hidden = !hasClient;
    if (els.summary) els.summary.hidden = !hasClient;
    if (els.actions) els.actions.hidden = !hasClient;
    if (els.filters) els.filters.hidden = !hasClient;
    if (els.sideKpis) els.sideKpis.hidden = !hasClient;
    if (els.q) {
      els.q.disabled = !(hasClient || state.clients.length > 0);
      els.q.placeholder = hasClient
        ? "Buscar e selecionar títulos neste cliente"
        : "Buscar título ou ISBN nos clientes";
    }

    renderClientPicker();
    updateEmptyState();
    updateActiveFilters();
    renderSelectedProductChips();
    renderSelectedTitleChips();
    renderMapaIsbnWarning();
    renderIsbnResults();
    if (portfolioData) renderPortfolioOverview(portfolioData);

    if (hasIsbnView && els.topSub) {
      const n = state.isbnResult.clients.length;
      const label = state.isbnResult.titulo || state.isbnResult.isbn || "Itens selecionados";
      els.topSub.textContent = state.seller
        ? `${state.seller} · ${label}: ${n.toLocaleString("pt-BR")} cliente(s) com estoque`
        : `${label}: ${n.toLocaleString("pt-BR")} cliente(s) com estoque`;
    }

    if (!hasClient) return;

    updateSortHeaders();
    const scopedRows = rowsMatchingTitleSelection();
    const rows = scopedRows.filter(rowMatchesSituationFilter).sort(compareRows);
    // KPIs/roteiro acompanham o recorte de títulos; a tabela aplica também o chip de situação.
    updateKpis(scopedRows);
    if (els.actions) updateActionKpis(scopedRows);
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
    const changed = client?.codigo !== state.selectedClient?.codigo;
    state.selectedClient = client || null;
    if (changed) {
      state.selectedQueries = [];
      state.query = "";
      if (els.q) els.q.value = "";
      setTitleResultsOpen(false);
      if (els.titleResults) els.titleResults.innerHTML = "";
    }
    if (client) {
      // Análise de cliente é o fluxo principal: fecha o resultado secundário de ISBN.
      clearIsbnSearch();
    }
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
    const bits = [`Código ${client.codigo}`];
    if (place) bits.push(place);
    if (client.vendedor) bits.push(`Vendedor ${client.vendedor}`);
    els.clientMeta.textContent = bits.join(" · ");
    els.topSub.textContent = `${client.nome} · ranking Rocco com saldo do Mapão`;

    render();
  }

  async function onMapaFile(file) {
    const parsed = await parseMapaFile(file);
    const rows = parsed.rows;
    const quality = assessMapaIsbnQuality(rows, parsed.sourceFormat);

    state.mapaRows = rows;
    state.clients = listClients(rows);
    state.clientQuery = "";
    state.sellerFilter = "";
    state.selectedClient = null;
    state.stockByKey = new Map();
    state.stockLookup = new Map();
    state.mapaQuality = null;
    state.mapaIsbnQuality = quality;
    state.portfolioClientFilter = null;
    invalidatePortfolioOverview();
    clearIsbnSearch();
    clearSelectedQueries();
    els.clientQuery.value = "";
    if (els.sellerFilter) els.sellerFilter.value = "";
    els.clientMeta.textContent = "";

    const baseMeta = `${file.name} · Excel · ${rows.length.toLocaleString("pt-BR")} linhas · ${state.clients.length} cliente(s) · ISBN ok ${quality.reliable.toLocaleString("pt-BR")}`;
    if (quality.sciNotation > 0) {
      const pct = Math.round((quality.sciNotation / Math.max(quality.total, 1)) * 100);
      els.mapaMeta.textContent = `${baseMeta} · aviso: ${quality.sciNotation.toLocaleString("pt-BR")} ISBN(s) em notação científica (${pct}%)`;
    } else {
      els.mapaMeta.textContent = baseMeta;
    }

    render();
  }

  els.btnImport.addEventListener("click", () => openMapaPicker());
  if (els.btnImportMain) {
    els.btnImportMain.addEventListener("click", () => openMapaPicker());
  }

  if (els.btnClearPortfolioFilter) {
    els.btnClearPortfolioFilter.addEventListener("click", () => clearPortfolioClientFilter());
  }

  if (els.portfolioOverview) {
    els.portfolioOverview.addEventListener("click", (e) => {
      const ignoreBtn = e.target.closest("[data-portfolio-ignore]");
      if (ignoreBtn) {
        ignoreAnalysisClient(ignoreBtn.dataset.portfolioIgnore);
        return;
      }

      const considerBtn = e.target.closest("[data-portfolio-consider]");
      if (considerBtn) {
        considerAnalysisClient(considerBtn.dataset.portfolioConsider);
        return;
      }

      const clientBtn = e.target.closest("[data-portfolio-client]");
      if (clientBtn) {
        selectClient(clientBtn.dataset.portfolioClient);
        return;
      }

      const chronicBtn = e.target.closest("[data-portfolio-chronic]");
      if (chronicBtn) {
        openChronicTitle({
          key: chronicBtn.dataset.portfolioChronic,
          isbn: chronicBtn.dataset.isbn || "",
          titulo: chronicBtn.dataset.titulo || "",
        });
        return;
      }

      const bandBtn = e.target.closest("[data-portfolio-band]");
      if (bandBtn) {
        setPortfolioClientFilter({ type: "band", key: bandBtn.dataset.portfolioBand });
        return;
      }

      const filterBtn = e.target.closest("[data-portfolio-filter-type]");
      if (filterBtn) {
        setPortfolioClientFilter({ type: filterBtn.dataset.portfolioFilterType });
      }
    });
  }

  if (els.btnToggleIsbnSearch) {
    els.btnToggleIsbnSearch.addEventListener("click", () => {
      if (!state.clients.length) return;
      state.isbnSearchOpen = !state.isbnSearchOpen;
      if (!state.isbnSearchOpen) clearIsbnSearch();
      render();
      if (state.isbnSearchOpen && els.isbnFieldQuery) els.isbnFieldQuery.focus();
    });
  }

  function onProductFieldInput(kind, value) {
    if (kind === "isbn") state.isbnFieldQuery = value;
    else state.titleFieldQuery = value;
    renderProductFieldResults(kind, filterProductCatalog(kind, value));
  }

  if (els.isbnFieldQuery) {
    els.isbnFieldQuery.addEventListener("input", (e) => onProductFieldInput("isbn", e.target.value));
    els.isbnFieldQuery.addEventListener("focus", () => {
      renderProductFieldResults("isbn", filterProductCatalog("isbn", state.isbnFieldQuery));
    });
    els.isbnFieldQuery.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setProductResultsOpen("isbn", false);
    });
  }

  if (els.titleFieldQuery) {
    els.titleFieldQuery.addEventListener("input", (e) => onProductFieldInput("title", e.target.value));
    els.titleFieldQuery.addEventListener("focus", () => {
      renderProductFieldResults("title", filterProductCatalog("title", state.titleFieldQuery));
    });
    els.titleFieldQuery.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setProductResultsOpen("title", false);
    });
  }

  function bindProductResultsClicks(box) {
    if (!box) return;
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", (e) => {
      const btn = e.target.closest(".product-result");
      if (!btn) return;
      toggleProductSelection({
        key: btn.dataset.key,
        isbn: btn.dataset.isbn || "",
        codlivro: btn.dataset.codlivro || "",
        titulo: btn.dataset.titulo || "",
      });
      const kind = btn.dataset.kind === "isbn" ? "isbn" : "title";
      const q = kind === "isbn" ? state.isbnFieldQuery : state.titleFieldQuery;
      renderProductFieldResults(kind, filterProductCatalog(kind, q));
    });
  }
  bindProductResultsClicks(els.isbnFieldResults);
  bindProductResultsClicks(els.titleFieldResults);

  if (els.productSelected) {
    els.productSelected.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-key]");
      if (!chip) return;
      const key = chip.dataset.key;
      state.selectedProducts = state.selectedProducts.filter((p) => p.key !== key);
      refreshSelectedProductResults();
      if (state.isbnFieldQuery) renderProductFieldResults("isbn", filterProductCatalog("isbn", state.isbnFieldQuery));
      if (state.titleFieldQuery) renderProductFieldResults("title", filterProductCatalog("title", state.titleFieldQuery));
    });
  }

  if (els.btnClearIsbn) {
    els.btnClearIsbn.addEventListener("click", () => {
      clearIsbnSearch();
      render();
      if (els.isbnFieldQuery) els.isbnFieldQuery.focus();
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#isbnFieldWrap")) setProductResultsOpen("isbn", false);
    if (!e.target.closest("#titleFieldWrap")) setProductResultsOpen("title", false);
  });

  if (els.isbnTbody) {
    els.isbnTbody.addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-code]");
      if (!row) return;
      selectClient(row.dataset.code);
      state.isbnSearchOpen = false;
      render();
    });
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
      els.mapaMeta.textContent = err?.message
        ? `Falha ao ler o Mapão: ${err.message}`
        : "Falha ao ler o Mapão Excel (.xlsx ou .xls).";
    }
  });

  els.clientSelect.addEventListener("change", (e) => selectClient(e.target.value));
  if (els.sellerFilter) {
    els.sellerFilter.addEventListener("change", (e) => {
      state.sellerFilter = e.target.value || "";
      invalidatePortfolioOverview();
      if (state.selectedProducts.length) {
        state.isbnResult = findClientsBySelectedProducts(state.selectedProducts);
      }
      render();
      if (!state.selectedClient && state.query.trim()) {
        renderTitleResults(titleSuggestions(state.query));
      }
      if (state.isbnSearchOpen) {
        if (state.isbnFieldQuery) {
          renderProductFieldResults("isbn", filterProductCatalog("isbn", state.isbnFieldQuery));
        }
        if (state.titleFieldQuery) {
          renderProductFieldResults("title", filterProductCatalog("title", state.titleFieldQuery));
        }
      }
    });
  }
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

  function setTitleResultsOpen(open) {
    if (!els.titleResults) return;
    els.titleResults.hidden = !open;
    const search = els.q?.closest(".search");
    if (search) search.classList.toggle("is-open", open);
    if (els.q) els.q.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function mapaProductSuggestions(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q || !state.mapaRows.length) return [];

    const titleQ = normalizeTitle(q);
    const aliasSet = new Set(isbnAliases(q));
    const normalized = normalizeIsbn(q);
    if (normalized) aliasSet.add(normalized);
    const qDigits = q.replace(/\D/g, "");
    const byKey = new Map();

    state.mapaRows.forEach((r) => {
      if (!rowMatchesSellerFilter(r)) return;
      const qty = parseIntSafe(r.consignado) || 0;
      if (qty <= 0) return;

      const matchIsbn = rowMatchesIsbn(r, aliasSet, qDigits);
      const titleKey = normalizeTitle(r.titulo);
      const matchTitle = titleQ && titleKey.includes(titleQ);
      const blob = `${r.titulo || ""} ${r.isbn || ""} ${r.codbarra || ""}`.toLowerCase();
      if (!matchIsbn && !matchTitle && !blob.includes(q)) return;

      const isbn = reliableRowIsbn(r);
      const codlivro = String(r.codlivro || "").trim();
      // Mesma identidade do catálogo: ISBN confiável, senão código do livro, senão título.
      const key = isbn
        ? `isbn:${isbn}`
        : (codlivro ? `cod:${codlivro}` : (titleKey || String(r.titulo || "").toLowerCase()));
      if (!key) return;

      const prev = byKey.get(key) || {
        titulo: r.titulo || "Sem título",
        isbn: isbn || "",
        volume: 0,
        clients: new Set(),
      };
      if (!prev.titulo && r.titulo) prev.titulo = r.titulo;
      if (isbnQualityScore(isbn) > isbnQualityScore(prev.isbn)) prev.isbn = isbn;
      prev.volume += qty;
      const code = String(r.codigo || "").trim();
      if (code) prev.clients.add(code);
      byKey.set(key, prev);
    });

    return [...byKey.values()]
      .map((item) => ({
        titulo: item.titulo,
        isbn: item.isbn,
        volume: item.volume,
        clientCount: item.clients.size,
      }))
      .sort((a, b) => b.volume - a.volume || String(a.titulo).localeCompare(String(b.titulo), "pt-BR"))
      .slice(0, 20);
  }

  function titleSuggestions(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];

    if (!state.selectedClient) {
      if (!state.clients.length) return [];
      return mapaProductSuggestions(query);
    }

    const seen = new Set();
    const matches = [];
    buildAllRows().forEach((row) => {
      const blob = `${row.titulo} ${row.autor} ${row.isbn}`.toLowerCase();
      if (!blob.includes(q)) return;
      const key = `${row.isbn}|${row.titulo}`;
      if (seen.has(key)) return;
      seen.add(key);
      matches.push(row);
    });

    return matches
      .sort((a, b) => {
        const aRank = a.inRanking ? a.ranking : Number.POSITIVE_INFINITY;
        const bRank = b.inRanking ? b.ranking : Number.POSITIVE_INFINITY;
        if (aRank !== bRank) return aRank - bRank;
        return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR");
      })
      .slice(0, 20);
  }

  function renderTitleResults(list) {
    if (!els.titleResults) return;
    const q = state.query.trim();
    const crossClient = !state.selectedClient && state.clients.length > 0;
    if (!state.selectedClient && !crossClient) {
      setTitleResultsOpen(false);
      els.titleResults.innerHTML = "";
      return;
    }

    if (state.selectedClient && !q && state.selectedQueries.length) {
      els.titleResults.innerHTML = `
        <div class="title-results-head">${state.selectedQueries.length.toLocaleString("pt-BR")} título(s) selecionado(s) — digite para adicionar mais</div>
        ${state.selectedQueries.map((item) => `
          <button type="button" class="title-result is-selected" data-mode="filter" data-isbn="${escapeHtml(item.isbn || "")}" data-titulo="${escapeHtml(item.titulo || "")}" data-query="${escapeHtml(item.query || item.titulo || item.isbn || "")}" role="option" aria-selected="true">
            <strong>${escapeHtml(item.titulo || item.isbn || "Título")}</strong>
            <span>${escapeHtml(item.isbn || "—")}</span>
            <span class="pick-hint">Selecionado — clique para remover</span>
          </button>
        `).join("")}
      `;
      setTitleResultsOpen(true);
      return;
    }

    if (!q) {
      setTitleResultsOpen(false);
      els.titleResults.innerHTML = "";
      return;
    }

    if (!list.length) {
      els.titleResults.innerHTML = `<p class="title-results-empty">Nenhum título ou ISBN com esse texto.</p>`;
      setTitleResultsOpen(true);
      return;
    }

    if (crossClient) {
      const sellerHint = state.sellerFilter
        ? ` no vendedor ${state.sellerFilter}`
        : "";
      els.titleResults.innerHTML = `
        <div class="title-results-head">${list.length.toLocaleString("pt-BR")} título(s)${escapeHtml(sellerHint)} — clique para ver clientes com estoque</div>
        ${list.map((item) => {
          const meta = [
            `${item.clientCount.toLocaleString("pt-BR")} cliente(s)`,
            `Saldo ${item.volume.toLocaleString("pt-BR")}`,
          ].join(" · ");
          return `
            <button type="button" class="title-result" data-mode="clients" data-isbn="${escapeHtml(item.isbn || "")}" data-titulo="${escapeHtml(item.titulo || "")}" role="option">
              <strong>${escapeHtml(item.titulo || "Sem título")}</strong>
              <span>${escapeHtml(item.isbn || "Sem ISBN")}</span>
              <small>${escapeHtml(meta)}</small>
            </button>
          `;
        }).join("")}
      `;
      setTitleResultsOpen(true);
      return;
    }

    els.titleResults.innerHTML = `
      <div class="title-results-head">${list.length.toLocaleString("pt-BR")} sugestão(ões) — clique para selecionar vários títulos</div>
      ${list.map((row) => {
        const selected = isTitleQuerySelected(row);
        const saldo = row.stock?.consignado;
        const meta = [
          row.isbn || "",
          row.inRanking ? `Ranking ${row.ranking}` : "Fora do ranking",
          saldo == null ? "Sem saldo" : `Saldo ${saldo.toLocaleString("pt-BR")}`,
        ].filter(Boolean).join(" · ");
        return `
          <button type="button" class="title-result${selected ? " is-selected" : ""}" data-mode="filter" data-isbn="${escapeHtml(row.isbn || "")}" data-titulo="${escapeHtml(row.titulo || "")}" data-query="${escapeHtml(row.titulo || row.isbn || "")}" role="option" aria-selected="${selected}">
            <strong>${escapeHtml(row.titulo || "Sem título")}</strong>
            <span>${escapeHtml(row.autor || "—")}</span>
            <small>${escapeHtml(meta)}</small>
            <span class="pick-hint">${selected ? "Selecionado — clique para remover" : "Clique para selecionar"}</span>
          </button>
        `;
      }).join("")}
    `;
    setTitleResultsOpen(true);
  }

  els.q.addEventListener("input", (e) => {
    state.query = e.target.value;
    renderTitleResults(titleSuggestions(state.query));

    // Sem cliente: ISBN completo já lista os clientes; título só sugere na lista.
    if (!state.selectedClient && state.clients.length) {
      const digits = state.query.replace(/\D/g, "");
      if (digits.length >= 10) {
        runProductSearch({ exactIsbn: state.query });
        return;
      }
      if (!state.query.trim() && state.isbnResult) {
        clearIsbnSearch();
      }
    }

    if (state.selectedClient && !state.selectedQueries.length) render();
  });
  els.q.addEventListener("focus", () => {
    if (state.query.trim() || state.selectedQueries.length) {
      renderTitleResults(titleSuggestions(state.query));
    }
  });
  els.q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setTitleResultsOpen(false);
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (state.selectedClient) {
      const list = titleSuggestions(state.query);
      if (!list.length) return;
      toggleTitleQuerySelection(list[0]);
      state.query = "";
      if (els.q) els.q.value = "";
      renderSelectedTitleChips();
      renderTitleResults(titleSuggestions(""));
      render();
      return;
    }
    if (!state.clients.length) return;
    const list = titleSuggestions(state.query);
    if (!list.length) return;
    const first = list[0];
    runProductSearch({
      exactTitle: first.titulo || "",
      exactIsbn: first.isbn || "",
      rawQuery: first.isbn || first.titulo || state.query,
    });
    setTitleResultsOpen(false);
  });
  if (els.titleResults) {
    els.titleResults.addEventListener("mousedown", (e) => e.preventDefault());
    els.titleResults.addEventListener("click", (e) => {
      const btn = e.target.closest(".title-result");
      if (!btn) return;
      if (btn.dataset.mode === "clients") {
        if (els.q) els.q.value = btn.dataset.titulo || btn.dataset.isbn || "";
        state.query = els.q?.value || "";
        runProductSearch({
          exactTitle: btn.dataset.titulo || "",
          exactIsbn: btn.dataset.isbn || "",
          rawQuery: btn.dataset.isbn || btn.dataset.titulo || "",
        });
        setTitleResultsOpen(false);
        return;
      }
      toggleTitleQuerySelection({
        isbn: btn.dataset.isbn || "",
        titulo: btn.dataset.titulo || "",
        query: btn.dataset.query || "",
      });
      state.query = "";
      if (els.q) els.q.value = "";
      renderSelectedTitleChips();
      renderTitleResults(titleSuggestions(""));
      render();
      if (els.q) els.q.focus();
    });
  }
  if (els.titleSelected) {
    els.titleSelected.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-key]");
      if (!btn) return;
      const key = btn.dataset.key;
      state.selectedQueries = state.selectedQueries.filter((item) => item.key !== key);
      renderSelectedTitleChips();
      renderTitleResults(titleSuggestions(state.query));
      render();
    });
  }
  document.addEventListener("click", (e) => {
    if (!els.titleResults || els.titleResults.hidden) return;
    if (e.target.closest(".title-search-wrap")) return;
    setTitleResultsOpen(false);
  });

  if (els.btnClearFilters) {
    els.btnClearFilters.addEventListener("click", () => clearTableFilters());
  }

  if (els.mainActiveFilters) {
    els.mainActiveFilters.addEventListener("click", (e) => {
      if (e.target.closest("#btnClearFiltersMain, .clear-filters-main")) {
        clearTableFilters();
        return;
      }
      const chip = e.target.closest("[data-clear]");
      if (!chip) return;
      const action = chip.dataset.clear;
      if (action === "filter") {
        state.filter = "all";
        syncFilterActiveState();
        render();
        return;
      }
      if (action === "search") {
        clearSelectedQueries();
        render();
        return;
      }
      if (action === "search-item") {
        const key = chip.dataset.key;
        state.selectedQueries = state.selectedQueries.filter((item) => item.key !== key);
        renderSelectedTitleChips();
        render();
        return;
      }
      if (action === "client") {
        clearIsbnSearch();
        clearSelectedQueries();
        selectClient("");
        return;
      }
      if (action === "seller-filter") {
        state.sellerFilter = "";
        invalidatePortfolioOverview();
        if (els.sellerFilter) els.sellerFilter.value = "";
        if (state.selectedProducts.length) {
          state.isbnResult = findClientsBySelectedProducts(state.selectedProducts);
        }
        render();
        return;
      }
      if (action === "portfolio-filter") {
        clearPortfolioClientFilter();
        return;
      }
      if (action === "seller") {
        showSellerGate();
      }
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

  if (els.isbnGrid) {
    els.isbnGrid.querySelector("thead").addEventListener("click", (e) => {
      const th = e.target.closest("th.sortable");
      if (!th) return;
      const key = th.dataset.sort;
      if (!key) return;

      if (state.isbnSortKey === key) {
        state.isbnSortDir = state.isbnSortDir === "asc" ? "desc" : "asc";
      } else {
        state.isbnSortKey = key;
        state.isbnSortDir = key === "cliente" || key === "uf" || key === "codigo" ? "asc" : "desc";
      }
      renderIsbnResults();
    });
  }

  initSellerGate();
  loadRanking();
})();
