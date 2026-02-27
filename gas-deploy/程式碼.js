/**
 * ==========================================
 * 大園青商 簽到系統 - 自動抓取總表程式 (Openclaw修復版 v40)
 * ==========================================
 */

const CONFIG = {
  SPREADSHEET_ID: '1gsx9p9unR0Z--hMaRWNceftdAQf1LXnbH2WwpHTXyNQ',
  FOLDER_ID: '1O2LpYf2fO6m5XnQ_xS5y_9iPgKs6HlaL', 
  GUEST_SHEET_NAME: '外會預約名單',
  INTERNAL_SHEET_NAME: 'Internal',
  ALL_DATA_SHEET_NAME: 'All_Data',  // 修正：匹配實際工作表名稱（大寫）
  EXTERNAL_SHEET_NAME: 'External',   // 新增：External 工作表
  OFFICIALS_SHEET_NAME: 'Officials'  // 新增：Officials 工作表
};

function doGet(e) {
  const op = e.parameter.op;
  const type = e.parameter.type;

  if (op === 'get_all') {
    if (type === 'internal') {
      return handleGetInternalPlusGuest(); // 會內 + 外會預約
    } else {
      return handleGetAll(); // 全體名單 (all_data)
    }
  }
  return ContentService.createTextOutput("大園青商簽到服務運行中");
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  if (data.action === 'register') return handleRegistration(data);
  if (data.action === 'cleanup') return handleCleanup(data);
  return ContentService.createTextOutput(JSON.stringify({status: 'ok'})).setMimeType(ContentService.MimeType.JSON);
}

/** 獲取全體名單 (讀取 All_Data Sheet) - 格式：[姓名, 職稱, 分類, ?, ?, ID, Photo] */
function handleGetAll() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.ALL_DATA_SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sheet All_Data not found'})).setMimeType(ContentService.MimeType.JSON);
  
  var values = sheet.getDataRange().getValues();
  var results = [];
  
  // All_Data 格式：[姓名, 職稱, 分類, ?, ?, ID, Photo]
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue; // 沒姓名就跳過
    
    // 修正：ID 在 F 欄 (r[5])
    var rawId = r[5] ? r[5].toString() : ("u" + (1000 + i));
    // 如果 ID 是 #N/A 或包含非法字符，生成一個新的
    if (rawId.indexOf('#N/A') >= 0 || rawId.indexOf('#') >= 0 || rawId.indexOf('.') >= 0 || 
        rawId.indexOf('$') >= 0 || rawId.indexOf('/') >= 0 || rawId.indexOf('[') >= 0 || 
        rawId.indexOf(']') >= 0 || rawId.trim() === '') {
      rawId = "u" + (1000 + i);
    }
    var cleanId = rawId.trim().toLowerCase();
    
    results.push({
      id: cleanId, 
      name: r[0].toString(),
      title: r[1] ? r[1].toString() : "",
      group: r[2] ? r[2].toString() : "Internal",
      photo: r[6] ? r[6].toString() : ""
    });
  }
  // 修正：回傳統一格式 {status, data}
  return ContentService.createTextOutput(JSON.stringify({status: 'success', data: results}))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 獲取會內 + 外會預約名單 (合併 Internal 和 外會預約名單) */
function handleGetInternalPlusGuest() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var results = [];
  
  // 輔助函數：清理 ID
  function cleanId(rawId, prefix, index) {
    if (!rawId) return prefix + index;
    var id = rawId.toString();
    if (id.indexOf('#N/A') >= 0 || id.indexOf('#') >= 0 || id.indexOf('.') >= 0 || 
        id.indexOf('$') >= 0 || id.indexOf('/') >= 0 || id.indexOf('[') >= 0 || 
        id.indexOf(']') >= 0 || id.trim() === '') {
      return prefix + index;
    }
    return id.trim().toLowerCase();
  }
  
  // 1. 讀取 Internal (會內) - 格式：[姓名, 職稱, 分類, ?, ?, ID, Photo]
  var internalSheet = ss.getSheetByName(CONFIG.INTERNAL_SHEET_NAME);
  if (internalSheet) {
    var iValues = internalSheet.getDataRange().getValues();
    for (var i = 1; i < iValues.length; i++) {
      var r = iValues[i];
      if (!r[0]) continue;
      results.push({
        id: cleanId(r[5], "int_", i),
        name: r[0].toString(),
        title: r[1] ? r[1].toString() : "",
        group: "Internal",
        photo: r[6] ? r[6].toString() : ""
      });
    }
  }

  // 2. 讀取 外會預約名單 (Guest) - 格式：[時間, 姓名, 職稱, 單位, 分類, Email, QRCode, Photo, EventID]
  var guestSheet = ss.getSheetByName(CONFIG.GUEST_SHEET_NAME);
  if (guestSheet) {
    var gValues = guestSheet.getDataRange().getValues();
    for (var j = 1; j < gValues.length; j++) {
      var g = gValues[j];
      if (!g[1]) continue;
      results.push({
        id: "guest_" + j,
        name: g[1].toString(),
        title: g[2] ? g[2].toString() : "",
        group: g[4] ? g[4].toString() : "Guest",
        photo: g[7] ? g[7].toString() : ""
      });
    }
  }

  // 修正：回傳統一格式 {status, data}
  return ContentService.createTextOutput(JSON.stringify({status: 'success', data: results}))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 處理外會來賓預約 (健壯版本 v39) */
function handleRegistration(data) {
  var result = { status: 'pending' };
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var guestSheet = ss.getSheetByName(CONFIG.GUEST_SHEET_NAME) || ss.insertSheet(CONFIG.GUEST_SHEET_NAME);
    if (guestSheet.getLastRow() === 0) {
      guestSheet.appendRow(["時間", "姓名", "職稱", "單位/分會", "分類", "Email", "QRCode_ID", "照片網址", "EventID"]);
    }

    // 1. 處理照片 (獨立 try-catch，失敗不影響寫入)
    var photoUrl = "";
    var fileId = "";
    try {
      if (data.photoData) {
        var folder;
        try { folder = DriveApp.getFolderById(CONFIG.FOLDER_ID); } catch(e) { folder = DriveApp.getRootFolder(); }
        var blob = Utilities.newBlob(Utilities.base64Decode(data.photoData), data.photoType || "image/jpeg", (data.eventId || "evt") + "_" + (data.name || "guest") + ".jpg");
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
        fileId = file.getId();
      }
    } catch (photoErr) {
      // 照片處理失敗，記錄 log 或忽略
      photoUrl = "Error: " + photoErr.toString(); 
    }

    // 2. 寫入試算表 (這一步最重要，不能死)
    var qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent((data.name||"") + "_" + (data.eventId||""));
    var qrCodeId = (data.name||"") + "_" + (data.eventId||"");
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    
    // 確保所有欄位都有值，避免 undefined
    guestSheet.appendRow([
      now, 
      data.name || "", 
      data.title || "", 
      data.chapter || "", 
      data.group || "", 
      data.email || "", 
      qrCodeId, 
      photoUrl, 
      data.eventId || ""
    ]);
    
    // 3. 寄送 Email (獨立 try-catch，失敗不影響結果)
    try {
      if (data.email) {
        var htmlBody = 
          '<div style="font-family: \'Microsoft JhengHei\', sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">' +
            '<div style="background: linear-gradient(135deg, #0097D7 0%, #005780 100%); padding: 20px; text-align: center; color: white;">' +
              '<h1 style="margin: 0;">大園青年商會</h1>' +
              '<p style="margin: 5px 0 0;">歡迎您的蒞臨</p>' +
            '</div>' +
            '<div style="padding: 30px; text-align: center;">' +
              '<p style="font-size: 1.2rem; color: #333;">親愛的 <b>' + (data.chapter || "") + ' ' + (data.name || "") + ' ' + (data.title || "") + '</b> 您好：</p>' +
              '<p style="color: #666;">感謝您的預約，這是您專屬的報到 QR Code。</p>' +
              '<img src="' + qrCodeUrl + '" style="width: 200px; height: 200px; margin: 20px auto; border: 5px solid #f0f2f5;">' +
              '<p style="color: #666; font-size: 0.9rem;">請於報到處出示此碼完成報到</p>' +
              '<div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 8px;">' +
                '<p style="margin: 5px 0; font-size: 0.9rem;">會議 ID: ' + (data.eventId || "") + '</p>' +
              '</div>' +
            '</div>' +
            '<div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 0.8rem; color: #999;">' +
              '© JCI DAYUAN 2026 | 蝦霸自動化系統' +
            '</div>' +
          '</div>';

        MailApp.sendEmail({
          to: data.email,
          subject: "【大園青商】預約成功通知 - " + (data.name || "") + " 先生/小姐",
          htmlBody: htmlBody
        });
      }
    } catch (emailErr) {
       // Email 寄送失敗，不影響回傳成功
    }

    result = { status: 'success', fileId: fileId };

  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

/** 清理功能 (修正為精準清理) */
function handleCleanup(data) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var guestSheet = ss.getSheetByName(CONFIG.GUEST_SHEET_NAME);
    if (guestSheet) {
      var values = guestSheet.getDataRange().getValues();
      for (var i = values.length - 1; i >= 1; i--) {
        if (values[i][8] === data.eventId) { guestSheet.deleteRow(i + 1); }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON);
  }
}
