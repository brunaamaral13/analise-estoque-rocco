function ensureSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Acessos");
  if (!sheet) {
    sheet = ss.insertSheet("Acessos");
    sheet.appendRow(["Data/hora", "Vendedor"]);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold");
  }
  return sheet;
}

function doGet(e) {
  var vendedor = "";
  if (e && e.parameter && e.parameter.vendedor) {
    vendedor = String(e.parameter.vendedor).trim();
  }
  if (vendedor) {
    ensureSheet_().appendRow([new Date(), vendedor]);
  }
  return ContentService
    .createTextOutput('{"ok":true}')
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return doGet(e);
}
