# WingChun V24.1 Website WCMD Data Layer

本版把網站資料層正式切到 WCMD。

## 覆蓋檔案

請複製以下內容到 GitHub 專案根目錄：

- `index.html`
- `data/wcmd.json`
- `data/categories.json`
- `docs/`

## 資料讀取順序

1. 優先讀取 `data/wcmd.json` 作為主資料庫。
2. 同步合併 `wingchun-sync /api/videos` 的 YouTube 縮圖、發布日期與網址。
3. 若 WCMD 或 API 有問題，會自動回到舊的 `videos.json`。

## 測試重點

- 首頁是否正常顯示 29 集。
- 中文、English、雙語模式標題是否正常。
- 第 1～19 集與第 28 集英文標題是否正常。
- 網頁底部是否顯示 `Website v24.1 ｜ Worker v4.0 ｜ Database WCMD v1.0`。
