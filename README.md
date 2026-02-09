# JCI Check-in System (Shrimp Ba Enhanced Edition)

## 專案簡介
這是一個為 JCI 大園青商會設計的活動報到系統，支援現場掃描 QR Code、手動簽到、以及從 Google Sheet 同步名單。

## 架構說明 (Firebase First, GAS Backup)

本系統採用 **Firebase Realtime Database** 作為主要數據庫，確保現場操作的高效與即時性。Google Apps Script (GAS) 僅作為備份與通知服務。

1.  **Frontend**: HTML5 + Vanilla JS + Firebase SDK (v9 compat)
    -   `index.html`: 主控台 (報到、儀表板、Kiosk 模式)
    -   `invite.html`: 來賓預約頁面 (生成 QR Code)
2.  **Backend (Realtime)**: Firebase Realtime Database
    -   `events_meta`: 存儲活動基本資訊
    -   `events_data`: 存儲來賓名單與簽到狀態
3.  **Backend (Async/Backup)**: Google Apps Script
    -   負責發送 Email 通知
    -   負責備份照片到 Google Drive
    -   提供名單同步 API (從 Google Sheet 讀取)

## 最新變更 (2026-02-09)

-   **Firebase 寫入優化**: `invite.html` 改用 `timestamp` 生成 `visitorId`，徹底解決同名覆蓋問題。
-   **GAS 同步邏輯增強**: 
    -   `invite.html` 使用 `no-cors` 模式發送 POST 請求，避免跨域阻擋。
    -   `index.html` 的同步邏輯修正，正確解析 `{ status: 'success', data: [...] }` 格式。
-   **UI 改進**:
    -   優化手機版漢堡選單體驗。
    -   修正捲動按鈕 (Back to Top / Bottom) 的觸發條件與樣式。
    -   儀表板 (Dashboard) 增加防呆提示。

## 安裝與部署

1.  將 `index.html` 和 `invite.html` 部署到任何靜態網站託管服務 (如 GitHub Pages, Firebase Hosting)。
2.  確保 Firebase Config 正確設定。
3.  GAS 腳本需部署為 Web App，並設定權限為 "Anyone"。

## 開發者注意事項

-   **Firebase Rules**: 需設定適當的讀寫規則，避免未授權訪問。
-   **CORS**: GAS 的 `doPost` 不支援標準 CORS，前端需使用 `no-cors` 模式或 JSONP (若為 GET)。
-   **Kiosk 模式**: 需搭配 iOS/iPadOS 捷徑或 Guided Access 使用最佳。

---
*Powered by Shrimp Ba (蝦霸)*
