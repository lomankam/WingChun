# WingChun V25.2 Final Admin Usable

## 更新內容

- 新增可用後台：`/admin/`
- 後台可貼 YouTube 連結，支援未列出影片。
- Worker 新增 `/api/import?url=...`，可抓單支未列出影片的標題、縮圖、日期、說明欄。
- 後台可下載新版：
  - `data/wcmd.json`
  - `data/videoIds.json`

## 使用方式

1. 覆蓋：
   - `admin/index.html`
   - `cloudflare/worker.js`
2. Cloudflare Worker 部署新版 `worker.js`。
3. 打開：
   - `https://lomankam.github.io/WingChun/admin/`
4. 密碼：`wingchun2026`
5. 貼 YouTube 連結並匯入。
6. 檢查英文標題、分類、Tags。
7. 下載新版 `wcmd.json` 與 `videoIds.json`。
8. 把下載的兩個檔案放回 GitHub 專案的 `data/` 資料夾。

## 注意

這一版已經可以完成新增影片流程，但仍需人工把下載的 JSON 上傳 GitHub。若要做到一鍵寫入 GitHub，需要另接 GitHub API 或後端資料庫。
