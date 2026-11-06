/**
 * Cole este código em: planilha Google → Extensões → Apps Script
 * Depois publique como app da Web (executar como: você / acesso: qualquer pessoa).
 * Cole a URL gerada em ACCESS_LOG_URL no arquivo app.js
 *
 * Aba esperada: "Acessos" com colunas Data/hora | Vendedor
 */

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Acessos");
  if (!sheet) {
    sheet = ss.insertSheet("Acessos");
    sheet.appendRow(["Data/hora", "Vendedor"]);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold");
  }
  return sheet;
}

function doGet(e) {
  const vendedor = ((e && e.parameter && e.parameter.vendedor) || "").toString().trim();
  if (vendedor) {
    ensureSheet_().appendRow([new Date(), vendedor]);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let vendedor = "";
  try {
    if (e && e.postData && e.postData.contents) {
      const data = JSON.parse(e.postData.contents);
      vendedor = (data.vendedor || "").toString().trim();
    }
  } catch (err) {
    // ignore parse errors
  }
  if (!vendedor && e && e.parameter) {
    vendedor = (e.parameter.vendedor || "").toString().trim();
  }
  if (vendedor) {
    ensureSheet_().appendRow([new Date(), vendedor]);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
