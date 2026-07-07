# English Title Data Layer v24.4

## 目的

將英文標題從 `index.html` 與 Cloudflare Worker 移出，統一由 `data/wcmd.json` 管理。

## 正式資料來源

```text
data/wcmd.json → episodes[].title.en
```

## 顯示優先順序

1. WCMD：`title.en`
2. YouTube API fallback：`Episode N — English title pending`
3. 舊版 videos.json fallback（僅備援）

## 新影片規則

如果新增影片但尚未補 `title.en`，網站會先顯示 pending，不會再出現英文標題空白。

補上 `title.en` 後，不需要修改 `index.html`。
