# WingChun V24.3 Unlisted Video Fix

這版修正「所有影片都是不公開／未列出」時無法自動偵測新影片的問題。

## 需要更新

請複製到專案根目錄：

- `index.html`
- `data/videoIds.json`
- `cloudflare/worker.js`

## 以後新增第 30 集

只要把 YouTube 連結中的影片 ID 加到：

`data/videoIds.json`

例如：

```json
[
  "SkXUAqbEqjQ",
  "...",
  "8m2_6mvsGkE",
  "新影片ID"
]
```

然後上傳 GitHub，網站就會自動更新影片數、中文標題、縮圖、連結；英文標題若尚未人工確認，會先顯示 `Episode 30 — 中文標題`，不會空白。

## Worker 測試

- `/api/health` 應顯示 Worker v6.0.0
- `/api/videos` 應顯示 count 29
