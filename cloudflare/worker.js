const DEFAULT_VIDEO_IDS = [
  "SkXUAqbEqjQ","HQErDwZ2ZtQ","Jomz2URebuk","DErJB3xu-_c","6UxlNfEyLl0",
  "2G2-sl74UDw","dTGSNLqVQF8","eZy51eJttYA","HqgkB4wSvT4","bddOlNxOpiw",
  "uGdUZLBRTWQ","T9QuukbJ3Y4","q9orSdwqPx4","3OufV7nj4mQ","OCSZYGRAs2A",
  "AXEjT_ln7pI","NU7ayuVK5bI","UhOnN1hmz0I","cpy3Qa2OTB4","CRVhoqkjK8s",
  "jehmZ5i_yiM","OF51iX7gwmI","uiiBtLuYkCw","fisb89DcHBQ","5NWvyL5ux3w",
  "W28X9VyTYyE","gV-j1l4WEB0","Kqj2TIg_N24","8m2_6mvsGkE"
];

const VIDEO_IDS_URL = "https://lomankam.github.io/WingChun/data/videoIds.json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
  });
}

function extractVideoId(input = "") {
  const text = String(input || "").trim();
  if (!text) return "";
  try {
    const u = new URL(text);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace(/^\//, "").split("?")[0];
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex(p => ["shorts", "embed", "live"].includes(p));
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch (_) {}
  return text;
}

function extractEpisode(title = "") {
  const m = String(title || "").match(/授課精華\s*([0-9]+)/);
  return m ? Number(m[1]) : null;
}

function toVideo(item, includeDescription = false) {
  const s = item.snippet || {};
  const id = item.id;
  const v = {
    episode: extractEpisode(s.title),
    title: s.title || "",
    url: `https://youtu.be/${id}`,
    videoId: id,
    publishedAt: s.publishedAt || "",
    thumbnail: s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || s.thumbnails?.medium?.url || s.thumbnails?.default?.url || ""
  };
  if (includeDescription) v.description = s.description || "";
  return v;
}

async function getVideoIds() {
  try {
    const res = await fetch(`${VIDEO_IDS_URL}?v=${Date.now()}`, { cf: { cacheTtl: 0 } });
    if (!res.ok) throw new Error(`videoIds fetch failed: ${res.status}`);
    const data = await res.json();
    const ids = Array.isArray(data) ? data : (data.videoIds || data.ids || []);
    if (Array.isArray(ids) && ids.length) return [...new Set(ids.map(String).filter(Boolean))];
  } catch (_) {}
  return DEFAULT_VIDEO_IDS;
}

async function fetchVideosByIds(env, ids, includeDescription = false) {
  if (!env.YOUTUBE_API_KEY) throw new Error("Missing YOUTUBE_API_KEY");
  const clean = [...new Set(ids.map(String).filter(Boolean))];
  const chunks = [];
  for (let i = 0; i < clean.length; i += 50) chunks.push(clean.slice(i, i + 50));
  const all = [];
  for (const chunk of chunks) {
    const api = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${chunk.join(",")}&key=${env.YOUTUBE_API_KEY}`;
    const res = await fetch(api);
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    all.push(...(data.items || []));
  }
  return all.map(item => toVideo(item, includeDescription)).filter(v => v.videoId).sort((a, b) => (b.episode || 0) - (a.episode || 0));
}

async function fetchOneVideo(env, input) {
  const id = extractVideoId(input);
  if (!id) throw new Error("Missing video ID or YouTube URL");
  const videos = await fetchVideosByIds(env, [id], true);
  if (!videos.length) throw new Error("Video not found. Check the URL, privacy setting, or API access.");
  return videos[0];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    try {
      if (url.pathname === "/" || url.pathname === "/api/health") {
        return json({ success: true, service: "wingchun-sync", version: "6.0.0", status: "running", videoIdsSource: VIDEO_IDS_URL });
      }
      if (url.pathname === "/api/import") {
        const input = url.searchParams.get("url") || url.searchParams.get("id") || "";
        const video = await fetchOneVideo(env, input);
        return json({ success: true, video });
      }
      if (url.pathname === "/api/videos") {
        const ids = await getVideoIds();
        const videos = await fetchVideosByIds(env, ids, false);
        return json({ success: true, source: "data/videoIds.json", count: videos.length, videos });
      }
      if (url.pathname === "/api/latest") {
        const ids = await getVideoIds();
        const videos = await fetchVideosByIds(env, ids, false);
        return json({ success: true, latest: videos[0] || null });
      }
      if (url.pathname.startsWith("/api/video/")) {
        const ep = Number(url.pathname.replace("/api/video/", ""));
        const ids = await getVideoIds();
        const videos = await fetchVideosByIds(env, ids, true);
        const video = videos.find(v => v.episode === ep);
        if (!video) return json({ success: false, message: `Episode ${ep} not found` }, 404);
        return json({ success: true, video });
      }
      if (url.pathname === "/api/search") {
        const q = (url.searchParams.get("q") || "").trim().toLowerCase();
        const ids = await getVideoIds();
        const videos = await fetchVideosByIds(env, ids, true);
        const results = q ? videos.filter(v => `${v.title} ${v.description || ""}`.toLowerCase().includes(q)) : [];
        return json({ success: true, query: q, count: results.length, results });
      }
      return json({ success: false, message: "Not found" }, 404);
    } catch (e) {
      return json({ success: false, error: String(e.message || e) }, 500);
    }
  }
};
