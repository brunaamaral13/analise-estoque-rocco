const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const SRC = path.join(__dirname, "MAPÃO VENDEDORES.xlsx");
const OUT_DIR = path.join(__dirname, "mapao-por-vendedor");
const PROPRIO_DIR = path.join(__dirname, "estoque-proprio-cliente");

const FILE_NAME = {
  DANI: "Dani",
  GEYSA: "Geysa",
  GIL: "Gilsan",
  MICHAEL: "Michael",
  RAFAELA: "Rafaela",
  ROSSANO: "Rossano",
  SALETE: "Salete",
};

const COL = {
  codigo: 0,
  vendedor: 1,
  codbarra: 16,
  isbn: 17,
  preco: 18,
  consignado: 19,
  perdesconto: 20,
};

function digitsFromNumber(value) {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1e15) return "";
  return String(Math.round(value));
}

function copyCell(cell, col) {
  if (!cell || cell.v == null || cell.v === "") return null;

  if ((col === COL.isbn || col === COL.codbarra) && typeof cell.v === "number") {
    const digits = digitsFromNumber(cell.v);
    if (!digits) return { t: "s", v: String(cell.v) };
    return { t: "s", v: digits, z: "@" };
  }

  if (col === COL.preco && typeof cell.v === "number") {
    return { t: "n", v: cell.v, z: "0.00" };
  }

  if (col === COL.consignado && typeof cell.v === "number") {
    return { t: "n", v: Math.round(cell.v), z: "0" };
  }

  const out = { t: cell.t || (typeof cell.v === "number" ? "n" : "s"), v: cell.v };
  if (cell.z && col !== COL.preco) out.z = cell.z;
  return out;
}

function headerKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_.-]+/g, "");
}

function normCode(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.round(value));
  return String(value).trim();
}

function normIsbn(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) return digitsFromNumber(value);
  return String(value).replace(/\D/g, "");
}

function toInt(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const n = Number(String(value).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function qtyCell(value) {
  return { t: "n", v: value, z: "0" };
}

/** codigo+ISBN mais recente da pasta estoque-proprio-cliente. */
function loadProprio() {
  const map = new Map();
  const usedFiles = [];
  if (!fs.existsSync(PROPRIO_DIR)) return { map, usedFiles };
  const files = fs.readdirSync(PROPRIO_DIR)
    .filter((name) => /\.xlsx$/i.test(name) && !name.startsWith("~$"))
    .map((name) => {
      const full = path.join(PROPRIO_DIR, name);
      return { name, full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => a.mtime - b.mtime);

  files.forEach((file) => {
    const wb = XLSX.readFile(file.full, { cellDates: false });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null, raw: true });
    if (!rows.length) return;
    const keys = Object.keys(rows[0]).map((raw) => ({ raw, key: headerKey(raw) }));
    const findCol = (aliases) => keys.find((item) => aliases.includes(item.key))?.raw;
    const cCodigo = findCol(["codigo"]);
    const cIsbn = findCol(["isbn"]);
    const cFisico = findCol(["estoquefisico", "fisico"]);
    const cComprado = findCol(["estoquecomprado", "comprado"]);
    if (!cCodigo || !cIsbn || !cFisico || !cComprado) {
      console.warn(`Ignorado (faltam codigo, ISBN, estoque fisico ou estoque comprado): ${file.name}`);
      return;
    }
    let rowsUsed = 0;
    rows.forEach((row) => {
      const code = normCode(row[cCodigo]);
      const isbn = normIsbn(row[cIsbn]);
      if (!code || !isbn) return;
      const fisico = toInt(row[cFisico]);
      const comprado = toInt(row[cComprado]);
      if (fisico == null && comprado == null) return;
      map.set(`${code}|${isbn}`, {
        fisico: fisico == null ? 0 : fisico,
        comprado: comprado == null ? 0 : comprado,
      });
      rowsUsed += 1;
    });
    usedFiles.push({ file: file.name, rows: rowsUsed });
  });
  return { map, usedFiles };
}

function sheetCellValue(sheet, r, c) {
  const cell = sheet[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : "";
}

function lookupProprio(sheet, r, proprio) {
  const code = normCode(sheetCellValue(sheet, r, COL.codigo));
  if (!code || !proprio.size) return null;
  const isbn = normIsbn(sheetCellValue(sheet, r, COL.isbn));
  const barra = normIsbn(sheetCellValue(sheet, r, COL.codbarra));
  if (isbn && proprio.has(`${code}|${isbn}`)) return proprio.get(`${code}|${isbn}`);
  if (barra && barra !== isbn && proprio.has(`${code}|${barra}`)) return proprio.get(`${code}|${barra}`);
  return null;
}

function canonicalHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function readAppCell(cell, headerName) {
  if (!cell) return "";
  if (cell.t === "n" && typeof cell.v === "number" && Number.isFinite(cell.v)) {
    const header = String(headerName || "").toLowerCase();
    const keepDecimals = /preco|preço|desconto|valor|percent|perc/.test(header);
    const forceFullDigits = !keepDecimals && (
      /isbn|codbarra|codigo|cnpj|cpf|cep|inscricao/.test(header)
      || Math.abs(cell.v) >= 1e10
    );
    if (forceFullDigits) {
      return Math.abs(cell.v) < 1e15
        ? String(Math.round(cell.v))
        : String(cell.v);
    }
    return cell.v.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 12 });
  }
  if (cell.w && !/[eE][+-]?\d+/.test(String(cell.w))) return String(cell.w).trim();
  if (typeof cell.v === "number" && Number.isFinite(cell.v)) return String(cell.v);
  if (cell.v != null && cell.v !== "") return String(cell.v).trim();
  return "";
}

function parseNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let cleaned = String(value).trim().replace(/\s/g, "");
  if (!cleaned) return null;
  cleaned = cleaned.replace(/^R\$/i, "").replace(/%$/g, "");
  if (!cleaned) return null;
  if (/^[+-]?\d+(?:[.,]\d+)?[eE][+-]?\d+$/.test(cleaned)) {
    const n = Number(cleaned.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = `${parts[0].replace(/\./g, "")}.${parts[1]}`;
    } else if (parts.length > 1 && parts.slice(1).every((p) => p.length === 3)) {
      cleaned = parts.join("");
    } else {
      cleaned = cleaned.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
      /* decimal */
    } else if (parts.length > 1 && parts.slice(1).every((p) => p.length === 3)) {
      cleaned = parts.join("");
    }
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function main() {
  const { map: proprio, usedFiles } = loadProprio();
  const wb = XLSX.readFile(SRC, { cellDates: false, cellNF: true, cellText: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const colCount = range.e.c - range.s.c + 1;

  const headers = [];
  for (let c = 0; c < colCount; c += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    let text = cell ? String(cell.v ?? "").trim() : "";
    if (canonicalHeader(text) === "preco") text = "preco";
    headers.push(text);
  }

  const groups = new Map();
  let blank = 0;
  const sourceStats = new Map();

  for (let r = range.s.r + 1; r <= range.e.r; r += 1) {
    const sellerCell = sheet[XLSX.utils.encode_cell({ r, c: COL.vendedor })];
    const seller = sellerCell ? String(sellerCell.v ?? "").trim() : "";
    if (!seller) {
      blank += 1;
      continue;
    }
    if (!groups.has(seller)) groups.set(seller, []);
    const row = [];
    for (let c = 0; c < colCount; c += 1) {
      row.push(copyCell(sheet[XLSX.utils.encode_cell({ r, c })], c));
    }
    row.proprio = lookupProprio(sheet, r, proprio);
    groups.get(seller).push(row);

    const preco = sheet[XLSX.utils.encode_cell({ r, c: COL.preco })];
    const saldo = sheet[XLSX.utils.encode_cell({ r, c: COL.consignado })];
    const st = sourceStats.get(seller) || { rows: 0, saldo: 0, precoSum: 0, badPreco: 0, badSaldo: 0 };
    st.rows += 1;
    if (!saldo || typeof saldo.v !== "number") st.badSaldo += 1;
    else st.saldo += saldo.v;
    if (!preco || typeof preco.v !== "number") st.badPreco += 1;
    else st.precoSum += preco.v;
    sourceStats.set(seller, st);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = [];

  let matchedRows = 0;
  for (const [seller, rows] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt"))) {
    const withProprio = rows.some((row) => row.proprio);
    const outHeaders = withProprio ? [...headers, "estoquecomprado", "estoquefisico"] : headers;
    const outCols = outHeaders.length;
    const outSheet = {};
    outHeaders.forEach((h, c) => {
      outSheet[XLSX.utils.encode_cell({ r: 0, c })] = { t: "s", v: h };
    });
    rows.forEach((row, i) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        outSheet[XLSX.utils.encode_cell({ r: i + 1, c })] = cell;
      });
      if (!withProprio || !row.proprio) return;
      matchedRows += 1;
      outSheet[XLSX.utils.encode_cell({ r: i + 1, c: colCount })] = qtyCell(row.proprio.comprado);
      outSheet[XLSX.utils.encode_cell({ r: i + 1, c: colCount + 1 })] = qtyCell(row.proprio.fisico);
    });
    outSheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: outCols - 1 },
    });
    outSheet["!cols"] = outHeaders.map((_, c) => {
      if (c === COL.isbn || c === COL.codbarra) return { wch: 16 };
      if (c === COL.preco) return { wch: 12 };
      if (c === COL.consignado) return { wch: 12 };
      return { wch: 18 };
    });

    const outBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outBook, outSheet, "MAPÃO");
    const label = FILE_NAME[seller] || seller;
    const fileName = `Mapao - ${label}.xlsx`;
    const filePath = path.join(OUT_DIR, fileName);
    XLSX.writeFile(outBook, filePath, { bookType: "xlsx", compression: true });

    const check = XLSX.readFile(filePath, {
      cellDates: false,
      cellNF: false,
      cellText: true,
    });
    const checkSheet = check.Sheets[check.SheetNames[0]];
    const checkRange = XLSX.utils.decode_range(checkSheet["!ref"]);
    const checkHeaders = [];
    for (let c = checkRange.s.c; c <= checkRange.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r: checkRange.s.r, c });
      checkHeaders.push(canonicalHeader(readAppCell(checkSheet[addr], "")));
    }
    let saldo = 0;
    let precoSum = 0;
    let badIsbn = 0;
    let badPreco = 0;
    let badSaldo = 0;
    let priceMismatch = 0;
    let saldoMismatch = 0;
    const sellersFound = new Set();
    let dataRows = 0;

    for (let r = checkRange.s.r + 1; r <= checkRange.e.r; r += 1) {
      const obj = {};
      let empty = true;
      checkHeaders.forEach((h, idx) => {
        const addr = XLSX.utils.encode_cell({ r, c: checkRange.s.c + idx });
        const value = readAppCell(checkSheet[addr], h);
        obj[h] = value;
        if (String(value).trim() !== "") empty = false;
      });
      if (empty) continue;
      dataRows += 1;
      sellersFound.add(String(obj.vendedor || "").trim());
      const isbn = String(obj.isbn || "").replace(/\D/g, "");
      const barra = String(obj.codbarra || "").replace(/\D/g, "");
      if (!/^97[89]\d{10}$/.test(isbn) && !/^97[89]\d{10}$/.test(barra)) badIsbn += 1;
      if (/[eE][+-]?\d+/.test(String(obj.isbn || "")) || /[eE][+-]?\d+/.test(String(obj.codbarra || ""))) {
        badIsbn += 1;
      }
      const preco = parseNumber(obj.preco);
      const qtd = parseNumber(obj.consignado);
      if (preco == null) badPreco += 1;
      else precoSum += preco;
      if (qtd == null || !Number.isInteger(qtd)) badSaldo += 1;
      else saldo += qtd;

      const srcRow = rows[dataRows - 1];
      const srcPreco = srcRow[COL.preco]?.v;
      const srcSaldo = srcRow[COL.consignado]?.v;
      if (typeof srcPreco === "number" && (preco == null || Math.abs(preco - srcPreco) > 0.001)) {
        priceMismatch += 1;
      }
      if (typeof srcSaldo === "number" && qtd !== srcSaldo) saldoMismatch += 1;
    }

    const src = sourceStats.get(seller);
    report.push({
      seller,
      file: fileName,
      rows: dataRows,
      srcRows: src.rows,
      saldo,
      srcSaldo: src.saldo,
      precoSum: Math.round(precoSum * 100) / 100,
      srcPrecoSum: Math.round(src.precoSum * 100) / 100,
      badIsbn,
      badPreco,
      badSaldo,
      priceMismatch,
      saldoMismatch,
      proprioRows: rows.filter((row) => row.proprio).length,
      sellersFound: [...sellersFound],
      bytes: fs.statSync(filePath).size,
    });
  }

  console.log(JSON.stringify({
    proprioFiles: usedFiles,
    proprioKeys: proprio.size,
    matchedRows,
    blankRowsIgnored: blank,
    files: report,
  }, null, 2));
}

main();
