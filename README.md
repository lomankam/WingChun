# WingChun V24.1 WCMD Full Database

這包是 WCMD 主資料庫完整化版本。

## 使用方式

把 `data/` 與 `docs/` 複製到目前的 WingChun 專案根目錄。

目前不會影響網站運作，因為 index.html 尚未改成直接讀取 `data/wcmd.json`。

## 本版重點

- 建立完整 `data/wcmd.json`
- 1～29 集皆已建入資料庫
- 1～20 集分類標記為 confirmed
- 21～29 集分類標記為 draft，待確認
- 英文標題先標記為 draft，可後續校正

## 下一版建議

V24.2：Worker 讀取 WCMD，並合併 YouTube API 的縮圖與發布日期。
