// Google Apps Script - 用於提供名單同步 API
// 版本：效能最佳化版 by 蝦霸

function doGet(e) {
  // --- 設定區 ---
  const SPREADSHEET_ID = "請在這裡填入你的 Google Sheet ID"; // 把你的試算表 ID 貼在這裡
  const SHEET_INTERNAL = "Internal"; // 會內會員工作表名稱
  const SHEET_INVITE = "外會預約名單"; // 外會預約工作表名稱
  // --- 結束設定 ---

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const type = e.parameter.type;

  let data = [];
  let headers = [];

  try {
    if (type === 'internal') {
      // --- 效能關鍵：一次性讀取所有資料 ---
      const internalSheet = sheet.getSheetByName(SHEET_INTERNAL);
      const inviteSheet = sheet.getSheetByName(SHEET_INVITE);

      // 分別讀取兩個工作表的全部有效資料範圍
      const internalValues = internalSheet.getDataRange().getValues();
      const inviteValues = inviteSheet.getDataRange().getValues();

      // --- 高效合併 ---
      // 取得標頭 (假設 Internal 表單的標頭是標準)
      if (internalValues.length > 0) {
        headers = internalValues[0];
      }
      
      // 取得資料 (去掉標頭)
      const internalData = internalValues.length > 1 ? internalValues.slice(1) : [];
      const inviteData = inviteValues.length > 1 ? inviteValues.slice(1) : [];
      
      // 將會內會員放在前面，外會預約名單接在後面
      const combinedData = internalData.concat(inviteData);

      // 將資料陣列轉換為物件陣列，更方便前端使用
      data = combinedData.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || ""; // 如果某行資料少於標頭，避免出錯
        });
        return obj;
      });

    } else if (type === 'all') {
      // 處理 'all' 的邏輯 (根據記憶，是讀取 all_data sheet)
      const allDataSheet = sheet.getSheetByName("all_data");
      const allValues = allDataSheet.getDataRange().getValues();

      if (allValues.length > 0) {
        headers = allValues[0];
        const allData = allValues.length > 1 ? allValues.slice(1) : [];
        data = allData.map(row => {
          let obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || "";
          });
          return obj;
        });
      }
    }

    // 將最終的物件陣列轉換為 JSON 格式回傳
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString(), line: err.lineNumber }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
