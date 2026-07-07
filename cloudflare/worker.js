const CHANNEL_ID = "UCe1GCW5PvXRayPykPNt4R6Q";

// 既有 1～29 集：用已知 videoId 保證一定抓得到（包含未列出影片）。
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

// 既有英文標題：新影片若尚未進 WCMD，會先用自動 fallback，避免英文/雙語模式空白。
const ENGLISH_TITLES = {
  "1": "Fighting with Skill, Not Strength: Flowing with the Momentum",
  "2": "Application and Development of Bao Pai Palm",
  "3": "Control the Opponent Before They Move; Defeat Without Form",
  "4": "Seemingly Empty Yet Substantial; Skill Emerges Through Adaptability",
  "5": "Wing Chun Forms Application Analysis, Part 1",
  "6": "Facing an Opponent: Instantly Reflecting What You Have Learned, Part 1",
  "7": "Facing an Opponent: Instantly Reflecting What You Have Learned, Part 2",
  "8": "Contact Response, Flowing with the Momentum, and Choke Counter Applications",
  "9": "Wing Chun Forms Application Analysis, Part 2",
  "10": "Choke Counter Applications, Part 2",
  "11": "Rear Bear Hug Counter and Application Principles",
  "12": "Detailed Explanation of the Wing Chun Form Biu Tze",
  "13": "The Core Philosophy of Wing Chun",
  "14": "From Chi Sau to Combat: The True Core of Wing Chun",
  "15": "Close-range Grabbing Counters and Applications Through Flowing with the Momentum",
  "16": "Reaction Determines Everything: The Key to Defeating an Opponent",
  "17": "Wing Chun Core Revealed: No Fixed Techniques, Only Reaction",
  "18": "Core Concepts of Wing Chun Forms",
  "19": "Complete Breakdown of Chum Kiu",
  "20": "Complete Analysis of Ding Sau: Combat Applications and Core Concepts",
  "21": "Advanced Wing Chun Concept: Reaction Matters More Than Techniques",
  "22": "Combat Concepts for Knife Confrontation: Not Fixed Techniques, but Instant Reaction",
  "23": "Wing Chun Self-defense Concepts Against Weapon Attacks",
  "24": "Wing Chun Defensive Concepts: No Fixed Techniques, Only Correct Reaction",
  "25": "Wing Chun Core Principles Revealed: Body Structure, Leverage Mechanics, and Combat Application",
  "26": "Wing Chun Leg Techniques: Attack-defense Principles and Combat Applications, Part 1",
  "27": "Wing Chun Leg Techniques: Attack-defense Principles and Combat Applications, Part 2",
  "28": "Wing Chun Bao Pai Palm: Attack-defense Principles and Combat Applications",
  "29": "Practical Analysis of Bao Pai Palm: Contact Response, Chi Sau Training, and Flowing with the Momentum"
};

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
  if (episode && ENGLISH_TITLES[String(episode)]) return ENGLISH_TITLES[String(episode)];
  const topic = normalizeTitle(title, episode);
  // 新影片尚未人工確認英文標題時，先提供不空白的英文格式。
  return episode ? `Episode ${episode} — ${topic}` : topic;
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
  return [...new Set((ids || []).filter(Boolean))];
}

async function fetchVideoDetails(env, ids, includeDescription = false) {
  const all = [];
  const unique = uniqueIds(ids);
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${batch.join(",")}&key=${env.YOUTUBE_API_KEY}`;
    const data = await youtubeJson(url);
    all.push(...(data.items || []).map(item => simplifyVideo(item, includeDescription)));
  }
  return all;
}

async function fetchPublicChannelVideos(env) {
  // V24.2：用 search 偵測新公開影片。若頻道影片是未列出，YouTube API 不會列出；既有集數仍靠 KNOWN_VIDEO_IDS。
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=50&type=video&key=${env.YOUTUBE_API_KEY}`;
  try {
    const data = await youtubeJson(url);
    return (data.items || [])
      .map(item => item.id?.videoId)
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function fetchVideos(env, includeDescription = false) {
  if (!env.YOUTUBE_API_KEY) throw new Error("Missing YOUTUBE_API_KEY");
  const publicIds = await fetchPublicChannelVideos(env);
  const videos = await fetchVideoDetails(env, [...publicIds, ...KNOWN_VIDEO_IDS], includeDescription);
  return videos
    .filter(v => v.episode)
    .sort((a, b) => b.episode - a.episode);
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
          version: "5.0.0",
          status: "running",
          mode: "known-video-ids-plus-public-youtube-auto-detect",
          channelId: CHANNEL_ID,
        });
      }

      if (url.pathname === "/api/videos") {
        const videos = await fetchVideos(env, false);
        return json({ success: true, source: "youtube-api-hybrid-v5", count: videos.length, videos });
      }

      if (url.pathname === "/api/latest") {
        const videos = await fetchVideos(env, false);
        return json({ success: true, latest: videos[0] || null });
      }

      if (url.pathname.startsWith("/api/video/")) {
        const episode = Number(url.pathname.replace("/api/video/", ""));
        const videos = await fetchVideos(env, true);
        const video = videos.find(v => Number(v.episode) === episode);
        if (!video) return json({ success: false, message: "Not found" }, 404);
        return json({ success: true, video });
      }

      if (url.pathname === "/api/search") {
        const q = (url.searchParams.get("q") || "").trim().toLowerCase();
        const videos = await fetchVideos(env, true);
        const results = q ? videos.filter(v => `${v.title} ${v.englishTitle} ${v.description || ""}`.toLowerCase().includes(q)) : [];
        return json({ success: true, query: q, count: results.length, results });
      }

      return json({ success: false, message: "Not found" }, 404);
    } catch (error) {
      return json({ success: false, error: String(error.message || error) }, 500);
    }
  },
};
