// WingChun V22.2 - extracted from index.html
let currentLang='zh';
let videos=[]; let filteredCategory='全部';
const fallbackVideos=[{episode:27,title:'詠春腿法攻防原理與實戰應用（下集）',titleEn:'Wing Chun Leg Techniques: Principles, Attack & Defense Applications (Part 2)',url:'https://youtu.be/gV-j1l4WEB0',category:'腿法專題'}];
const catEn={'全部':'All','核心觀念':'Core Concepts','套路系統':'Forms','套路解析':'Forms','黐手精構':'Chi Sau','黐手':'Chi Sau','腿法專題':'Leg Techniques','防身應用':'Applications','兵器運用':'Weapons','實戰黐手':'Practical Chi Sau','其他':'Others'};
const titleEnMap={27:'Wing Chun Leg Techniques: Principles, Attack & Defense Applications (Part 2)',26:'Wing Chun Leg Techniques: Principles, Attack & Defense Applications (Part 1)',25:'Attack & Defense Transitions in Chi Sau',24:'In-depth Analysis of Siu Nim Tau Bridge-Finding Structure',23:'Wing Chun Self-Defense Applications & Drills',22:'Centerline Theory and the Core of Wing Chun Defense',21:'Key Points in Chi Sau Training and Practical Application',20:'Detailed Breakdown of Siu Nim Tau Complete Form'};
function youtubeId(v){ if(v.id) return v.id; const url=v.url||v.youtube||''; const m=url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/); return m?m[1]:''; }
function thumb(v){ const id=youtubeId(v); return id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:''; }
function normalize(v){ const ep=Number(v.episode||v.id||0); return {...v,episode:ep,title:v.title||v.name||`第 ${ep} 集`,titleEn:v.titleEn||v.englishTitle||titleEnMap[ep]||'',url:v.url||v.youtube||v.link||'#',category:v.category||'其他'}; }
function stripHtml(s){ const d=document.createElement('div'); d.innerHTML=s||''; return d.textContent||d.innerText||''; }
function sortLatest(a,b){return (Number(b.episode)||0)-(Number(a.episode)||0)}
async function loadVideos(){
  try{ const res=await fetch(`videos.json?v=${Date.now()}`,{cache:'no-store'}); if(!res.ok) throw new Error(res.status); const data=await res.json(); const raw=Array.isArray(data)?data:(data.videos||[]); videos=(raw.length?raw:fallbackVideos).map(normalize).sort(sortLatest); }
  catch(e){ console.warn('videos.json 載入失敗，使用備用資料',e); videos=fallbackVideos.map(normalize).sort(sortLatest); }
  renderLatest(); render(); updateLanguageUI();
}
function renderLatest(){ const v=videos[0]; if(!v) return; document.getElementById('latestThumb').href=v.url; document.getElementById('latestWatch').href=v.url; document.getElementById('latestImg').src=thumb(v); document.getElementById('latestEpisode').textContent=currentLang==='en'?`Episode ${v.episode}`:`第 ${v.episode} 集`; document.getElementById('latestCategory').textContent=currentLang==='en'?(catEn[v.category]||v.category):v.category; document.getElementById('latestTitle').innerHTML=titleFor(v,true); }
function titleFor(v,large=false){ const zh=stripHtml(v.title); const en=stripHtml(v.titleEn||''); if(currentLang==='en') return en||zh; if(currentLang==='both') return `${zh}${en?`<span class="engTitle">${en}</span>`:''}`; return zh; }
function renderFilters(){} function filterCat(c){} function render(){ const list=videos; const grid=document.getElementById('grid'); grid.innerHTML=list.map(v=>`<article class="card"><a class="thumb" href="${v.url}" target="_blank" rel="noopener"><img src="${thumb(v)}" alt="${stripHtml(v.title)}"><span class="num">${currentLang==='en'?v.episode:'第 '+v.episode+' 集'}</span><span class="play">▶</span></a><div class="body"><span class="tag">${currentLang==='en'?(catEn[v.category]||v.category):v.category}</span><h3 class="title">${titleFor(v)}</h3><div class="actions"><a class="link primary" href="${v.url}" target="_blank" rel="noopener">${currentLang==='en'?'Watch':'觀看'}</a><button class="link" type="button" onclick="shareVideo('${v.url}')">${currentLang==='en'?'Share':'分享'}</button></div></div></article>`).join(''); document.getElementById('count').textContent=currentLang==='en'?`${list.length} / ${videos.length} lessons`:`顯示 ${list.length} / ${videos.length} 集`; document.getElementById('empty').style.display=list.length?'none':'block'; }

function scrollToAI(){
  const target=document.getElementById('chatroom') || document.querySelector('.chatSection') || document.querySelector('.aiCard');
  if(target){ target.scrollIntoView({behavior:'smooth', block:'start'}); }
}
function shareVideo(url){ navigator.clipboard?.writeText(url).then(()=>toast(currentLang==='en'?'Link copied':'已複製連結')).catch(()=>prompt(currentLang==='en'?'Copy this link:':'請複製這個連結：',url)); }
function shareLatest(){ if(videos[0]) shareVideo(videos[0].url); }
function toast(msg){ const t=document.getElementById('shareToast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1600); }
function setLang(lang){ currentLang=lang; updateLanguageUI(); renderLatest(); render(); }
function updateLanguageUI(){
  document.documentElement.lang=currentLang==='en'?'en':'zh-Hant';
  document.documentElement.dataset.lang=currentLang;
  document.querySelectorAll('[data-langbtn]').forEach(b=>{ const on=b.dataset.langbtn===currentLang; b.classList.toggle('active',on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  document.querySelectorAll('[data-zh][data-en]').forEach(el=>{
    const inHero=!!el.closest('.hero');
    if(currentLang==='en'){
      el.innerHTML=el.dataset.en;
    }else if(currentLang==='zh'){
      el.innerHTML=el.dataset.zh;
    }else{
      // 雙語模式：標題區塊維持中文大標，不混入英文，避免主視覺變雜亂。
      if(inHero){
        el.innerHTML=el.dataset.zh;
      }else{
        el.innerHTML=el.dataset.zh + (el.tagName.match(/^H|DIV|P|SPAN|SMALL|BUTTON|LI$/)?`<span class="engTitle">${el.dataset.en}</span>`:` / ${el.dataset.en}`);
      }
    }
  });
}
window.setLang=setLang; window.shareVideo=shareVideo; window.shareLatest=shareLatest; window.filterCat=filterCat;
loadVideos();
