// WingChun V23.1 - Search Engine Foundation
let currentLang='zh';
let videos=[];
let terminologyTerms=[];
let searchQuery='';
let filteredCategory='全部';

const fallbackVideos=[{episode:29,title:'抱牌掌實戰解析｜接觸反應、黐手訓練與順勢而行',titleEn:'Practical Analysis of Bao Pai Palm: Contact Response, Chi Sau Training, and Flowing with the Momentum',url:'https://youtu.be/8m2_6mvsGkE',category:'手法應用',categoryEn:'Hand Techniques'}];
const catEn={"核心觀念":"Core Principles","手法應用":"Hand Techniques","實戰觀念":"Combat Concepts","套路應用":"Form Applications","反應訓練":"Reaction Training","反制應用":"Counter Applications","標指":"Biu Tze","黐手與實戰":"Chi Sau & Combat","套路觀念":"Form Concepts","尋橋":"Chum Kiu","高階觀念":"Advanced Principles","武器防身":"Weapon Defense","防衛觀念":"Defensive Concepts","腿法":"Leg Techniques","其他":"Others"};
const titleEnMap={27:'Wing Chun Leg Techniques: Principles, Attack & Defense Applications (Part 2)',26:'Wing Chun Leg Techniques: Principles, Attack & Defense Applications (Part 1)',25:'Wing Chun Core Principles: Body Structure, Leverage Mechanics, and Practical Application',24:'Wing Chun Defensive Concepts: No Fixed Techniques, Only Correct Response',23:'Wing Chun Self-Defense Concepts Against Weapon Attacks',22:'Practical Concepts for Knife Confrontation: Not Techniques, but Instant Response',21:'Advanced Wing Chun Concepts: Response Matters More Than Techniques',20:'Complete Analysis of Wing Chun Dang Sau: Practical Applications and Core Principles'};
const quickSearches=[
  {zh:'黐手',en:'Chi Sau'},
  {zh:'抱牌掌',en:'Bao Pai Palm'},
  {zh:'順勢而行',en:'Flow with the Momentum'},
  {zh:'反應',en:'Response'},
  {zh:'腿法',en:'Leg Techniques'},
  {zh:'標指',en:'Biu Tze'}
];

function youtubeId(v){ if(v.id) return v.id; const url=v.url||v.youtube||''; const m=url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/); return m?m[1]:''; }
function thumb(v){ const id=youtubeId(v); return id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:''; }
function normalize(v){ const ep=Number(v.episode||v.id||0); return {...v,episode:ep,title:v.title||v.name||`第 ${ep} 集`,titleEn:v.titleEn||v.title_en||v.englishTitle||titleEnMap[ep]||'',url:v.url||v.youtube||v.link||'#',category:v.category||'其他',categoryEn:v.category_en||v.categoryEn||catEn[v.category]||v.category||'Others',levelEn:v.level_en||v.levelEn||'',keywords:v.keywords||[],keywordsEn:v.keywords_en||v.keywordsEn||[]}; }
function stripHtml(s){ const d=document.createElement('div'); d.innerHTML=s||''; return d.textContent||d.innerText||''; }
function sortLatest(a,b){return (Number(b.episode)||0)-(Number(a.episode)||0)}
function normalizeText(s){ return String(s||'').toLowerCase().replace(/[\s\-–—_:：|｜,，.。!！?？()（）「」『』\[\]【】/\\]/g,''); }
function plainText(s){ return stripHtml(String(s||'')); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function fetchJson(paths){
  for(const path of paths){
    try{ const res=await fetch(`${path}?v=${Date.now()}`,{cache:'no-store'}); if(res.ok) return await res.json(); }
    catch(e){ console.warn('fetch failed', path, e); }
  }
  throw new Error('All fetch paths failed: '+paths.join(', '));
}

async function loadVideos(){
  try{ const data=await fetchJson(['data/videos.json','videos.json']); const raw=Array.isArray(data)?data:(data.videos||[]); videos=(raw.length?raw:fallbackVideos).map(normalize).sort(sortLatest); }
  catch(e){ console.warn('影片資料載入失敗，使用備用資料',e); videos=fallbackVideos.map(normalize).sort(sortLatest); }
  await loadTerminology();
  bindSearchUI();
  renderQuickSearches();
  renderLatest(); render(); updateLanguageUI();
}

async function loadTerminology(){
  try{
    const data=await fetchJson(['data/terminology.json']);
    const terms=data.terms||{};
    terminologyTerms=Object.entries(terms).map(([id,t])=>({id,zh:t.zh||'',en:t.official_en||t.en||'',aliases:t.aliases||[],category:t.category||''}));
  }catch(e){ terminologyTerms=[]; console.warn('術語資料載入失敗，搜尋仍可使用影片資料',e); }
}

function terminologyAliasesForText(text){
  const normalized=normalizeText(text);
  const hits=[];
  terminologyTerms.forEach(t=>{
    const words=[t.zh,t.en,...(t.aliases||[])].filter(Boolean);
    const matched=words.some(w=>normalized.includes(normalizeText(w)) || normalizeText(w).includes(normalized));
    if(matched) hits.push(...words,t.category);
  });
  return hits;
}
function searchableFields(v){
  const fields=[
    v.episode, `第${v.episode}集`, `episode ${v.episode}`,
    v.title, v.titleEn, v.category, v.categoryEn, v.level, v.levelEn,
    ...(v.keywords||[]), ...(v.keywordsEn||[]), v.url
  ];
  fields.push(...terminologyAliasesForText(fields.join(' ')));
  return fields.filter(Boolean).join(' ');
}
function matchVideo(v, query){
  const q=normalizeText(query);
  if(!q) return true;
  const hay=normalizeText(searchableFields(v));
  return hay.includes(q);
}
function filteredVideos(){ return videos.filter(v=>matchVideo(v, searchQuery)); }

function highlight(text){
  const raw=plainText(text);
  const q=plainText(searchQuery).trim();
  if(!q) return escapeHtml(raw);
  const idx=raw.toLowerCase().indexOf(q.toLowerCase());
  if(idx<0) return escapeHtml(raw);
  return `${escapeHtml(raw.slice(0,idx))}<mark class="searchMark">${escapeHtml(raw.slice(idx,idx+q.length))}</mark>${escapeHtml(raw.slice(idx+q.length))}`;
}
function titleFor(v){
  const zh=currentLang==='en'?plainText(v.title):highlight(v.title);
  const en=currentLang==='en'?highlight(v.titleEn||v.title):highlight(v.titleEn||'');
  if(currentLang==='en') return en||zh;
  if(currentLang==='both') return `${zh}${v.titleEn?`<span class="engTitle">${en}</span>`:''}`;
  return zh;
}

function renderLatest(){
  const v=videos[0]; if(!v) return;
  document.getElementById('latestThumb').href=v.url;
  document.getElementById('latestWatch').href=v.url;
  document.getElementById('latestImg').src=thumb(v);
  document.getElementById('latestImg').loading='eager';
  document.getElementById('latestEpisode').textContent=currentLang==='en'?`Episode ${v.episode}`:`第 ${v.episode} 集`;
  document.getElementById('latestCategory').textContent=currentLang==='en'?(v.categoryEn||catEn[v.category]||v.category):v.category;
  document.getElementById('latestTitle').innerHTML=titleFor(v);
}
function render(){
  const list=filteredVideos();
  const grid=document.getElementById('grid');
  grid.innerHTML=list.map((v,i)=>`<article class="card"><a class="thumb" href="${v.url}" target="_blank" rel="noopener"><img src="${thumb(v)}" alt="${escapeHtml(plainText(v.title))}" loading="${i<6?'eager':'lazy'}"><span class="play">▶</span></a><div class="body"><div class="cardMeta"><span class="episodePill">${currentLang==='en'?'Episode '+v.episode:'第 '+v.episode+' 集'}</span><span class="tag">${currentLang==='en'?(v.categoryEn||catEn[v.category]||v.category):v.category}</span></div><h3 class="title">${titleFor(v)}</h3><div class="actions"><a class="link primary" href="${v.url}" target="_blank" rel="noopener">${currentLang==='en'?'Watch':'觀看'}</a><button class="link" type="button" onclick="shareVideo('${v.url}')">${currentLang==='en'?'Share':'分享'}</button></div></div></article>`).join('');
  const countText=currentLang==='en'?`${list.length} / ${videos.length} lessons`:`顯示 ${list.length} / ${videos.length} 集`;
  document.getElementById('count').textContent=countText;
  document.getElementById('empty').style.display=list.length?'none':'block';
  updateSearchHint(list.length);
}
function updateSearchHint(n){
  const hint=document.getElementById('searchHint'); if(!hint) return;
  if(searchQuery.trim()){
    hint.textContent=currentLang==='en'?`Search results for “${searchQuery}”: ${n} lessons found.`:`「${searchQuery}」搜尋結果：找到 ${n} 集課程。`;
  }else{
    hint.textContent=currentLang==='en'?'Search Chinese, English, episode numbers, categories, keywords, and Wing Chun terminology.':'可搜尋中文、英文、集數、分類、關鍵字與詠春術語。';
  }
}
function bindSearchUI(){
  const input=document.getElementById('lessonSearch');
  const clear=document.getElementById('clearSearchBtn');
  if(!input || input.dataset.bound==='1') return;
  input.dataset.bound='1';
  input.addEventListener('input',()=>{ searchQuery=input.value.trim(); clear?.classList.toggle('show',!!searchQuery); render(); });
  clear?.addEventListener('click',()=>{ input.value=''; searchQuery=''; clear.classList.remove('show'); input.focus(); render(); });
}
function renderQuickSearches(){
  const box=document.getElementById('searchQuickTags'); if(!box) return;
  box.innerHTML=quickSearches.map(q=>`<button class="searchTag" type="button" data-q-zh="${escapeHtml(q.zh)}" data-q-en="${escapeHtml(q.en)}">${currentLang==='en'?escapeHtml(q.en):escapeHtml(q.zh)}</button>`).join('');
  box.querySelectorAll('.searchTag').forEach(btn=>btn.addEventListener('click',()=>{
    const val=currentLang==='en'?btn.dataset.qEn:btn.dataset.qZh;
    const input=document.getElementById('lessonSearch');
    if(input){ input.value=val; searchQuery=val; document.getElementById('clearSearchBtn')?.classList.add('show'); render(); input.focus(); }
  }));
}

function scrollToAI(){ const target=document.getElementById('chatroom') || document.querySelector('.chatSection') || document.querySelector('.aiCard'); if(target){ target.scrollIntoView({behavior:'smooth', block:'start'}); } }
function shareVideo(url){ navigator.clipboard?.writeText(url).then(()=>toast(currentLang==='en'?'Link copied':'已複製連結')).catch(()=>prompt(currentLang==='en'?'Copy this link:':'請複製這個連結：',url)); }
function shareLatest(){ if(videos[0]) shareVideo(videos[0].url); }
function toast(msg){ const t=document.getElementById('shareToast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1600); }
function setLang(lang){ currentLang=lang; updateLanguageUI(); renderQuickSearches(); renderLatest(); render(); }
function updateLanguageUI(){
  document.documentElement.lang=currentLang==='en'?'en':'zh-Hant';
  document.documentElement.dataset.lang=currentLang;
  document.querySelectorAll('[data-langbtn]').forEach(b=>{ const on=b.dataset.langbtn===currentLang; b.classList.toggle('active',on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  const search=document.getElementById('lessonSearch');
  if(search){ search.placeholder=currentLang==='en'?search.dataset.placeholderEn:search.dataset.placeholderZh; }
  document.querySelectorAll('[data-zh][data-en]').forEach(el=>{
    const inHero=!!el.closest('.hero');
    if(currentLang==='en') el.innerHTML=el.dataset.en;
    else if(currentLang==='zh') el.innerHTML=el.dataset.zh;
    else el.innerHTML=inHero ? el.dataset.zh : el.dataset.zh + (el.tagName.match(/^H|DIV|P|SPAN|SMALL|BUTTON|LI$/)?`<span class="engTitle">${el.dataset.en}</span>`:` / ${el.dataset.en}`);
  });
}
function renderFilters(){} function filterCat(c){}
window.setLang=setLang; window.shareVideo=shareVideo; window.shareLatest=shareLatest; window.filterCat=filterCat; window.scrollToAI=scrollToAI;
loadVideos();
