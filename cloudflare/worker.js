const CHANNEL_ID = "UCe1GCW5PvXRayPykPNt4R6Q";

// V24.3 / Worker v6：支援「不公開 / 未列出」影片。
// 1～29 集先保留在 Worker 作為備援。
// 網站會優先讀取 data/videoIds.json，並把 ids 傳到 /api/videos?ids=...
// 以後新增第 30 集，只要把新影片 ID 加進 data/videoIds.json，不需要修改 index.html 或 Worker。
const KNOWN_VIDEO_IDS = [
  "SkXUAqbEqjQ",
  "HQErDwZ2ZtQ",
  "Jomz2URebuk",
  "DErJB3xu-_c",
  "6UxlNfEyLl0",
  "2G2-sl74UDw",
  "dTGSNLqVQF8",
  "eZy51eJttYA",
  "HqgkB4wSvT4",
  "bddOlNxOpiw",
  "uGdUZLBRTWQ",
  "T9QuukbJ3Y4",
  "q9orSdwqPx4",
  "3OufV7nj4mQ",
  "OCSZYGRAs2A",
  "AXEjT_ln7pI",
  "NU7ayuVK5bI",
  "UhOnN1hmz0I",
  "cpy3Qa2OTB4",
  "CRVhoqkjK8s",
  "jehmZ5i_yiM",
  "OF51iX7gwmI",
  "uiiBtLuYkCw",
  "fisb89DcHBQ",
  "5NWvyL5ux3w",
  "W28X9VyTYyE",
  "gV-j1l4WEB0",
  "Kqj2TIg_N24",
  "8m2_6mvsGkE"
];

// V24.4：英文標題改由網站端 data/wcmd.json 管理。
// Worker 只負責 YouTube 基本資料與 pending fallback，不再維護逐集英文標題。
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders },
  });
}

function extractEpisode(title = "") {
  const m = String(title).match(/授課精華\s*([0-9]+)/);
  return m ? Number(m[1]) : null;
}

function normalizeTitle(rawTitle = "", episode = null) {
  let title = String(rawTitle || "").trim();
  title = title.replace(/^盧[文⽂]錦\s*師[父⽗]\s*授課精華\s*[0-9]+\s*[\-－–—｜|：:]?\s*/u, "");
  title = title.replace(/^授課精華\s*[0-9]+\s*[\-－–—｜|：:]?\s*/u, "");
  return title || (episode ? `第${episode}集` : "");
}

function autoEnglishTitle(title, episode) {
  // 正式英文標題由 data/wcmd.json 的 title.en 管理。
  // 這裡只在新影片尚未補進 WCMD 時，提供不空白的暫時文字。
  return episode ? `Episode ${episode} — English title pending` : "English title pending";
}

function thumb(s) {
  return s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || s.thumbnails?.medium?.url || s.thumbnails?.default?.url || "";
}

function simplifyVideo(item, includeDescription = false) {
  const s = item.snippet || {};
  const id = typeof item.id === "string" ? item.id : (item.id?.videoId || item.contentDetails?.videoId || s.resourceId?.videoId || "");
  const episode = extractEpisode(s.title);
  const video = {
    episode,
    title: s.title || "",
    titleClean: normalizeTitle(s.title || "", episode),
    englishTitle: autoEnglishTitle(s.title || "", episode),
    title_en: autoEnglishTitle(s.title || "", episode),
    url: id ? `https://youtu.be/${id}` : "",
    videoId: id,
    publishedAt: s.publishedAt || "",
    thumbnail: thumb(s),
  };
  if (includeDescription) video.description = s.description || "";
  return video;
}

async function youtubeJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

function uniqueIds(ids) {
  return [...new Set((ids || []).map(v => String(v || "").trim()).filter(Boolean))];
}

function idsFromRequest(url) {
  const raw = url.searchParams.get("ids") || "";
  return raw.split(",").map(v => v.trim()).filter(Boolean);
}

async function fetchVideoDetails(env, ids, includeDescription = false) {
  const all = [];
  const unique = uniqueIds(ids);
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${batch.join(",")}&key=${env.YOUTUBE_API_KEY}`;
    const data = await youtubeJson(apiUrl);
    all.push(...(data.items || []).map(item => simplifyVideo(item, includeDescription)));
  }
  return all;
}

async function fetchPublicChannelVideos(env) {
  // 公開影片自動偵測；未列出影片不會出現在這裡。
  const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=50&type=video&key=${env.YOUTUBE_API_KEY}`;
  try {
    const data = await youtubeJson(apiUrl);
    return (data.items || []).map(item => item.id?.videoId).filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function fetchVideos(env, requestUrl, includeDescription = false) {
  if (!env.YOUTUBE_API_KEY) throw new Error("Missing YOUTUBE_API_KEY");

  const requestIds = idsFromRequest(requestUrl);
  // 如果網站傳入 ids，代表使用 data/videoIds.json，包含未列出影片；以它為主。
  // 如果沒有傳入 ids，就用 Worker 內建清單 + 公開影片偵測做備援。
  const ids = requestIds.length ? requestIds : [...await fetchPublicChannelVideos(env), ...KNOWN_VIDEO_IDS];
  const videos = await fetchVideoDetails(env, ids, includeDescription);
  return videos.filter(v => v.episode).sort((a, b) => b.episode - a.episode);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      if (url.pathname === "/" || url.pathname === "/api/health") {
        return json({
          success: true,
          service: "wingchun-sync",
          version: "7.0.0",
          status: "running",
          mode: "unlisted-video-ids-json-supported; english-title-from-wcmd",
          channelId: CHANNEL_ID,
          note: "For unlisted videos, update data/videoIds.json and call /api/videos?ids=...",
        });
      }

      if (url.pathname === "/api/videos") {
        const videos = await fetchVideos(env, url, false);
        return json({ success: true, source: "youtube-api-video-ids-v7", count: videos.length, videos });
      }

      if (url.pathname === "/api/latest") {
        const videos = await fetchVideos(env, url, false);
        return json({ success: true, latest: videos[0] || null });
      }

      if (url.pathname.startsWith("/api/video/")) {
        const episode = Number(url.pathname.replace("/api/video/", ""));
        const videos = await fetchVideos(env, url, true);
        const video = videos.find(v => Number(v.episode) === episode);
        if (!video) return json({ success: false, message: "Not found" }, 404);
        return json({ success: true, video });
      }

      if (url.pathname === "/api/search") {
        const q = (url.searchParams.get("q") || "").trim().toLowerCase();
        const videos = await fetchVideos(env, url, true);
        const results = q ? videos.filter(v => `${v.title} ${v.englishTitle} ${v.description || ""}`.toLowerCase().includes(q)) : [];
        return json({ success: true, query: q, count: results.length, results });
      }

      return json({ success: false, message: "Not found" }, 404);
    } catch (error) {
      return json({ success: false, error: String(error.message || error) }, 500);
    }
  },
};
