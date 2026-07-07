# WingChun V24.4 — English Title Data Layer

這版專門處理英文標題維護問題。

## 更新檔案

請複製到專案根目錄：

```text
index.html
data/wcmd.json
data/videoIds.json
cloudflare/worker.js
docs/
```

## 核心規則

英文標題不再寫在 `index.html` 或 Worker 裡。

正式英文標題統一放在：

```text
data/wcmd.json
```

每集格式：

```json
{
  "episode": 30,
  "title": {
    "zh": "中文標題",
    "en": "English title"
  }
}
```

## 新增第30集流程

1. 把新影片 ID 加進 `data/videoIds.json`。
2. 在 `data/wcmd.json` 新增第30集，至少補：
   - `episode`
   - `title.zh`
   - `title.en`
3. 上傳 GitHub。
4. Cloudflare Worker 更新為 v7.0 後，網站會自動合併 YouTube 的縮圖、網址與日期。

## 若尚未填英文標題

網站不會空白，會先顯示：

```text
Episode 30 — English title pending
```

等你補上 `data/wcmd.json` 的 `title.en` 後，網站就會自動顯示正式英文標題。
