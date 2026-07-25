# 官方術語字典

網站的正式術語來源是 `data/terminology.json`，由 `/Users/daniel/Desktop/官方術語字典.txt` 整理而來。

## 使用規則

- `official_en` 是網站與阿智使用的正式英文。
- `aliases` 放中文別名，供搜尋與辨識使用。
- 若正式英文改名，請在同一筆資料加入 `legacy_en`，網站會把既有英文標題中的舊用字替換成新用字。
- 每次修改術語後，請將 `version` 加 1；前端會以版本參數重新讀取檔案。
- 未列入字典的專門名詞，AI 可以提出草稿，但不可視為已核准術語。

例如：

```json
"黐手": {
  "zh": "黐手",
  "official_en": "Chi Sau",
  "legacy_en": ["Sticky Hands"]
}
```
