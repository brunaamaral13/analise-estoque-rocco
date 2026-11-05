(() => {
  const RANK_FILE = "Mais vendidos Rocco.csv";
  const IDLE_DAYS = 90;

  const els = {
    rankMeta: document.getElementById("rankMeta"),
    mapaMeta: document.getElementById("mapaMeta"),
    btnImport: document.getElementById("btnImport"),
    fileMapa: document.getElementById("fileMapa"),
    clientBar: document.getElementById("clientBar"),
    clientSelect: document.getElementById("clientSelect"),
    clientQuery: document.getElementById("clientQuery"),
    clientList: document.getElementById("clientList"),
    clientMeta: document.getElementById("clientMeta"),
    sideKpis: document.getElementById("sideKpis"),
    kpiMatch: document.getElementById("kpiMatch"),
    kpiZero: document.getElementById("kpiZero"),
    kpiIdle: document.getElementById("kpiIdle"),
    topSub: document.getElementById("topSub"),
    q: document.getElementById("q"),
    filters: document.getElementById("filters"),
    emptyState: document.getElementById("emptyState"),
    grid: document.getElementById("grid"),
    tbody: document.getElementById("tbody"),
  };

  const state = {
    ranking: [],
    mapaRows: [],
    stockByIsbn: new Map(),
    clients: [],
    selectedClient: null,
    clientQuery: "",
    filter: "all",
    query: "",
  };

  function normalizeIsbn(value) {
    return String(value || "")
      .replace(/[^0-9Xx]/g, "")
      .toUpperCase();
  }

  function parseNumber(value) {
    if (value == null || value === "") return null;
    const cleaned = String(value).trim().replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
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
          titulo: r.titulo || "",
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
    const map = new Map();
    rows
      .filter((r) => String(r.codigo) === String(clientCode))
      .forEach((r) => {
        const isbn = normalizeIsbn(r.isbn || r.codbarra);
        if (!isbn) return;

        const prev = map.get(isbn) || {
          isbn,
          titulo: r.titulo || "",
          preco: parseNumber(r.preco),
          consignado: 0,
          fdias: null,
          vendido: 0,
        };

        prev.consignado += parseIntSafe(r.consignado) || 0;
        prev.vendido += parseIntSafe(r.vendido) || 0;

        const fdias = parseIntSafe(r.fdias);
        if (fdias != null) {
          prev.fdias = prev.fdias == null ? fdias : Math.max(prev.fdias, fdias);
        }
        if (prev.preco == null) prev.preco = parseNumber(r.preco);
        if (!prev.titulo) prev.titulo = r.titulo || "";

        map.set(isbn, prev);
      });
    return map;
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

  function filteredClients() {
    const q = state.clientQuery.trim().toLowerCase();
    if (!q) return state.clients;
    return state.clients.filter((c) => {
      const blob = `${c.codigo} ${c.nome} ${c.cidade} ${c.estado}`.toLowerCase();
      return blob.includes(q);
    });
  }

  function situation(stock) {
    if (!stock) return { key: "miss", label: "Fora do Mapão", className: "badge-miss" };
    if ((stock.consignado || 0) <= 0) return { key: "zero", label: "Sem estoque", className: "badge-zero" };
    if ((stock.fdias || 0) >= IDLE_DAYS) return { key: "idle", label: "Parado", className: "badge-idle" };
    return { key: "ok", label: "Com estoque", className: "badge-ok" };
  }

  function rowsForRender() {
    const q = state.query.trim().toLowerCase();

    return state.ranking
      .map((item) => {
        const stock = state.stockByIsbn.get(item.isbn) || null;
        const sit = situation(stock);
        return { ...item, stock, sit };
      })
      .filter((row) => {
        if (state.filter === "com" && row.sit.key !== "ok" && row.sit.key !== "idle") return false;
        if (state.filter === "sem" && row.sit.key !== "zero") return false;
        if (state.filter === "parado" && row.sit.key !== "idle") return false;
        if (!q) return true;
        const blob = `${row.titulo} ${row.autor} ${row.isbn}`.toLowerCase();
        return blob.includes(q);
      });
  }

  function updateKpis() {
    let match = 0;
    let zero = 0;
    let idle = 0;

    state.ranking.forEach((item) => {
      const stock = state.stockByIsbn.get(item.isbn);
      if (!stock) return;
      match += 1;
      if ((stock.consignado || 0) <= 0) zero += 1;
      else if ((stock.fdias || 0) >= IDLE_DAYS) idle += 1;
    });

    els.kpiMatch.textContent = match.toLocaleString("pt-BR");
    els.kpiZero.textContent = zero.toLocaleString("pt-BR");
    els.kpiIdle.textContent = idle.toLocaleString("pt-BR");
  }

  function renderClientPicker() {
    const hasClients = state.clients.length > 0;
    els.clientBar.hidden = !hasClients;
    if (!hasClients) return;

    const list = filteredClients();
    const selectedCode = state.selectedClient?.codigo || "";

    els.clientSelect.innerHTML = list.length
      ? list
        .map((c) => {
          const label = `${c.codigo} · ${c.nome}`;
          const selected = c.codigo === selectedCode ? " selected" : "";
          return `<option value="${escapeHtml(c.codigo)}"${selected}>${escapeHtml(label)}</option>`;
        })
        .join("")
      : `<option value="">Nenhum cliente encontrado</option>`;

    if (list.length && !list.some((c) => c.codigo === selectedCode)) {
      els.clientSelect.value = list[0].codigo;
    }

    els.clientList.innerHTML = list.length
      ? list
        .slice(0, 40)
        .map((c) => {
          const active = c.codigo === selectedCode ? " is-active" : "";
          const place = [c.cidade, c.estado].filter(Boolean).join("/");
          return `
            <button type="button" class="client-chip${active}" data-code="${escapeHtml(c.codigo)}" role="option" aria-selected="${c.codigo === selectedCode}">
              <strong>${escapeHtml(c.codigo)}</strong>
              <span>${escapeHtml(c.nome)}${place ? ` · ${escapeHtml(place)}` : ""}</span>
            </button>
          `;
        })
        .join("")
      : `<p class="client-list-empty">Nenhum cliente com esse código ou nome.</p>`;

    if (list.length > 40) {
      els.clientList.insertAdjacentHTML(
        "beforeend",
        `<p class="client-list-empty">Mostrando 40 de ${list.length}. Refine a pesquisa.</p>`
      );
    }
  }

  function render() {
    const hasClient = Boolean(state.selectedClient);
    els.emptyState.hidden = hasClient;
    els.grid.hidden = !hasClient;
    els.filters.hidden = !hasClient;
    els.sideKpis.hidden = !hasClient;
    els.q.disabled = !hasClient;

    renderClientPicker();

    if (!hasClient) return;

    updateKpis();
    const rows = rowsForRender();
    els.tbody.innerHTML = rows.map((row) => {
      const saldo = row.stock ? row.stock.consignado : null;
      const fdias = row.stock ? row.stock.fdias : null;
      const vendido = row.stock ? row.stock.vendido : null;
      const preco = row.stock?.preco;
      const rowClass = [
        row.sit.key === "zero" ? "row-zero" : "",
        row.sit.key === "idle" ? "row-idle" : "",
      ].filter(Boolean).join(" ");

      return `
        <tr class="${rowClass}">
          <td class="num">${row.ranking}</td>
          <td>
            <span class="title">${escapeHtml(row.titulo)}</span>
            <span class="author">${escapeHtml(row.autor || "—")}</span>
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
    const client = state.clients.find((c) => c.codigo === String(code));
    state.selectedClient = client || null;
    if (!client) {
      state.stockByIsbn = new Map();
      els.clientMeta.textContent = "";
      els.topSub.textContent = "Importe o Mapão do cliente para ver o saldo ao lado do ranking Rocco.";
      render();
      return;
    }

    state.stockByIsbn = buildClientStock(state.mapaRows, client.codigo);
    const place = [client.cidade, client.estado].filter(Boolean).join("/");
    els.clientMeta.textContent = place
      ? `Código ${client.codigo} · ${place}`
      : `Código ${client.codigo}`;
    els.topSub.textContent = `${client.nome} · ranking Rocco com saldo do Mapão`;
    render();
  }

  async function onMapaFile(file) {
    const buffer = await file.arrayBuffer();
    const text = decodeCsvBuffer(buffer);
    const rows = parseCsv(text);

    state.mapaRows = rows;
    state.clients = listClients(rows);
    state.clientQuery = "";
    els.clientQuery.value = "";
    els.mapaMeta.textContent = `${file.name} · ${rows.length.toLocaleString("pt-BR")} linhas · ${state.clients.length} cliente(s)`;

    selectClient(state.clients[0]?.codigo);
  }

  els.btnImport.addEventListener("click", () => els.fileMapa.click());
  els.fileMapa.addEventListener("change", async (e) => {
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
    renderClientPicker();
  });
  els.clientList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-code]");
    if (!btn) return;
    selectClient(btn.dataset.code);
  });

  els.q.addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });

  els.filters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    state.filter = btn.dataset.filter;
    els.filters.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip === btn);
    });
    render();
  });

  loadRanking();
})();
