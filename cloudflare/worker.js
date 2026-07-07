const REPO_OWNER = "lomankam";
const REPO_NAME = "WingChun";
const DEFAULT_BRANCH = "main";
const VIDEO_IDS_PATH = "data/videoIds.json";
const WCMD_PATH = "data/wcmd.json";

const DEFAULT_VIDEO_IDS = [
  "SkXUAqbEqjQ","HQErDwZ2ZtQ","Jomz2URebuk","DErJB3xu-_c","6UxlNfEyLl0",
  "2G2-sl74UDw","dTGSNLqVQF8","eZy51eJttYA","HqgkB4wSvT4","bddOlNxOpiw",
  "uGdUZLBRTWQ","T9QuukbJ3Y4","q9orSdwqPx4","3OufV7nj4mQ","OCSZYGRAs2A",
  "AXEjT_ln7pI","NU7ayuVK5bI","UhOnN1hmz0I","cpy3Qa2OTB4","CRVhoqkjK8s",
  "jehmZ5i_yiM","OF51iX7gwmI","uiiBtLuYkCw","fisb89DcHBQ","5NWvyL5ux3w",
  "W28X9VyTYyE","gV-j1l4WEB0","Kqj2TIg_N24","8m2_6mvsGkE"
];

const publicBase = `https://${REPO_OWNER}.github.io/${REPO_NAME}`;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
  });
}

function today() { return new Date().toISOString().slice(0, 10); }

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(String(b64 || "").replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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

async function publicJson(path, fallback) {
  try {
    const res = await fetch(`${publicBase}/${path}?v=${Date.now()}`, { cf: { cacheTtl: 0 } });
    if (!res.ok) throw new Error(`${path} public fetch failed`);
    return await res.json();
  } catch (_) {
    return fallback;
  }
}

async function getVideoIds() {
  const data = await publicJson(VIDEO_IDS_PATH, DEFAULT_VIDEO_IDS);
  const ids = Array.isArray(data) ? data : (data.videoIds || data.ids || []);
  return Array.isArray(ids) && ids.length ? [...new Set(ids.map(String).filter(Boolean))] : DEFAULT_VIDEO_IDS;
}

function requireAdmin(request, env, bodyPassword) {
  const expected = env.ADMIN_PASSWORD || "wingchun2026";
  const given = bodyPassword || request.headers.get("X-Admin-Password") || "";
  if (given !== expected) throw new Error("Unauthorized admin password");
  if (!env.GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");
}

function ghHeaders(env) {
  return {
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "WingChun-Admin-Publisher"
  };
}

async function ghGetFile(env, path) {
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const api = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(api, { headers: ghHeaders(env) });
  if (res.status === 404) return { sha: null, data: null };
  const data = await res.json();
  if (!res.ok) throw new Error(`GitHub get ${path} failed: ${JSON.stringify(data)}`);
  return { sha: data.sha, data: JSON.parse(base64ToUtf8(data.content || "")) };
}

async function ghPutFile(env, path, obj, message, sha = null) {
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const api = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  const payload = {
    message,
    content: utf8ToBase64(JSON.stringify(obj, null, 2) + "\n"),
    branch
  };
  if (sha) payload.sha = sha;
  const res = await fetch(api, {
    method: "PUT",
    headers: { ...ghHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GitHub update ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

function normalizeIds(data) {
  const ids = Array.isArray(data) ? data : (data?.videoIds || data?.ids || []);
  return [...new Set((ids || []).map(String).filter(Boolean))];
}

function categoryFromId(wcmd, id = "principles") {
  const c = wcmd.categories?.[id] || wcmd.categories?.principles || { zh: "觀念理論", en: "Concepts & Principles" };
  return { id, zh: c.zh || "觀念理論", en: c.en || "Concepts & Principles", status: "draft" };
}

function splitList(text) {
  if (Array.isArray(text)) return text.map(String).map(s => s.trim()).filter(Boolean);
  return String(text || "").split(/[、,，\n]/).map(s => s.trim()).filter(Boolean);
}

function buildEpisodeEntry(wcmd, video, form = {}) {
  const episode = Number(form.episode || video.episode);
  if (!episode) throw new Error("Cannot detect episode number. Please fill episode manually.");
  const categoryId = form.categoryId || "principles";
  const tags = splitList(form.tags);
  return {
    episode,
    title: {
      zh: form.titleZh || video.title || "",
      en: form.titleEn || `Episode ${episode} — English title pending`
    },
    category: categoryFromId(wcmd, categoryId),
    tags,
    concepts: splitList(form.concepts || tags),
    skills: splitList(form.skills),
    difficulty: form.difficulty || "to_be_confirmed",
    summary: {
      zh: form.summaryZh || "",
      en: form.summaryEn || ""
    },
    youtube: {
      videoId: video.videoId,
      url: video.url,
      thumbnail: video.thumbnail || "",
      publishedAt: video.publishedAt || ""
    },
    dataStatus: {
      youtubeBasic: "confirmed_from_youtube_api",
      titleEn: form.titleEn ? "confirmed" : "pending",
      category: "draft",
      updatedAt: today()
    }
  };
}

async function publishEpisode(request, env) {
  const body = await request.json();
  requireAdmin(request, env, body.password);
  const video = body.video?.videoId ? body.video : await fetchOneVideo(env, body.videoUrl || body.url || body.id || "");

  const [idsFile, wcmdFile] = await Promise.all([
    ghGetFile(env, VIDEO_IDS_PATH),
    ghGetFile(env, WCMD_PATH)
  ]);

  const ids = normalizeIds(idsFile.data || DEFAULT_VIDEO_IDS);
  if (!ids.includes(video.videoId)) ids.push(video.videoId);

  let wcmd = wcmdFile.data || await publicJson(WCMD_PATH, { schemaVersion: "1.0", categories: {}, episodes: [] });
  if (!Array.isArray(wcmd.episodes)) wcmd.episodes = [];
  const entry = buildEpisodeEntry(wcmd, video, body.entry || body.form || {});

  const idx = wcmd.episodes.findIndex(e => Number(e.episode) === Number(entry.episode));
  if (idx >= 0) wcmd.episodes[idx] = { ...wcmd.episodes[idx], ...entry };
  else wcmd.episodes.push(entry);
  wcmd.episodes.sort((a, b) => Number(a.episode) - Number(b.episode));
  wcmd.platformVersion = "V25.3";
  wcmd.generatedAt = today();
  wcmd.sourceNote = "Updated by WingChun Admin one-click publisher.";

  const msg = `Admin: publish episode ${entry.episode}`;
  const idsResult = await ghPutFile(env, VIDEO_IDS_PATH, ids, `${msg} videoIds`, idsFile.sha);
  const wcmdResult = await ghPutFile(env, WCMD_PATH, wcmd, `${msg} WCMD`, wcmdFile.sha);

  return json({
    success: true,
    message: `Episode ${entry.episode} published to GitHub. GitHub Pages may take 1–3 minutes to refresh.`,
    episode: entry,
    videoIdsCount: ids.length,
    commits: {
      videoIds: idsResult.commit?.html_url || null,
      wcmd: wcmdResult.commit?.html_url || null
    }
  });
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
          githubEnabled: Boolean(env.GITHUB_TOKEN),
          repo: `${REPO_OWNER}/${REPO_NAME}`
        });
      }
      if (url.pathname === "/api/import") {
        const input = url.searchParams.get("url") || url.searchParams.get("id") || "";
        const video = await fetchOneVideo(env, input);
        return json({ success: true, video });
      }
      if (url.pathname === "/api/admin/publish" && request.method === "POST") {
        return await publishEpisode(request, env);
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
