// WingChun V22.2 - extracted from index.html
/*
  Firebase Firestore 雲端聊天室設定說明：
  1. 到 Firebase 建立專案
  2. 建立 Web App，複製 firebaseConfig
  3. 把下面 firebaseConfig 的內容換成你的設定
  4. Firestore Database 建立資料庫
     - 聊天集合：chatMessages
     - 在線集合：onlineUsers
  5. 本版功能：雲端訊息、在線人數、訊息時間、訪客名稱、按讚、置頂公告、名稱保護、管理員踢人、黑名單管理、聊天室開關排程
     ※ 禁止洗版功能尚未加入，可日後再加。
*/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, limit,
  serverTimestamp, onSnapshot, getDocs, deleteDoc,
  doc, setDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfyRZeA2T6ar6ebXIHhMIGo9_-5CrHEJY",
  authDomain: "wing-chun-chat.firebaseapp.com",
  projectId: "wing-chun-chat",
  storageBucket: "wing-chun-chat.firebasestorage.app",
  messagingSenderId: "76301547906",
  appId: "1:76301547906:web:3319b99f885d3b0164379b"
};

(function(){
  const key='lo-man-kam-chat-v2';
  const collectionName='chatMessages';
  const onlineCollectionName='onlineUsers';
  const AZHI_WORKER_URL='https://wingchun.lomankam-master.workers.dev';
  const AZHI_COURSE_API_URL='https://wingchun-sync.lomankam-master.workers.dev/api';
  const AZHI_NAME='🤖 阿智';
  const azhiPendingMessageIds=new Set();
  const box=document.getElementById('chatMessages');
  const form=document.getElementById('chatForm');
  const nameInput=document.getElementById('chatName');
  const textInput=document.getElementById('chatText');
  const callAiBtn=document.getElementById('callAiBtn');
  const clearBtn=document.getElementById('chatClear');
  const toolsText=document.querySelector('.chatTools span');
  const onlineCountEl=document.getElementById('onlineCount');
  const onlineCountMiniEl=document.getElementById('onlineCountMini');
  const messageCountEl=document.getElementById('messageCount');
  const adminEmail='lomankam.master@gmail.com';
  const adminLoginBtn=document.getElementById('adminLoginBtn');
  const adminStatus=document.getElementById('adminStatus');
  const adminPanel=document.getElementById('adminPanel');
  const adminOnlineList=document.getElementById('adminOnlineList');
  const adminBannedList=document.getElementById('adminBannedList');
  const kickedNotice=document.getElementById('kickedNotice');
  const announcementText=document.getElementById('pinnedNoticeText');
  const announcementInput=document.getElementById('adminAnnouncementInput');
  const saveAnnouncementBtn=document.getElementById('saveAnnouncementBtn');
  const commentClosedNotice=document.getElementById('commentClosedNotice');
  const chatControlAdminStatus=document.getElementById('chatControlAdminStatus');
  const chatCloseDateInput=document.getElementById('chatCloseDateInput');
  const chatCloseTimeInput=document.getElementById('chatCloseTimeInput');
  const chatOpenDateInput=document.getElementById('chatOpenDateInput');
  const chatOpenTimeInput=document.getElementById('chatOpenTimeInput');
  const saveChatScheduleBtn=document.getElementById('saveChatScheduleBtn');
  const closeChatNowBtn=document.getElementById('closeChatNowBtn');
  const openChatNowBtn=document.getElementById('openChatNowBtn');
  const close1hBtn=document.getElementById('close1hBtn');
  const close24hBtn=document.getElementById('close24hBtn');
  const close7dBtn=document.getElementById('close7dBtn');
  let isAdmin=false;
  let latestMessages=[];
  let latestOnlineDocs=[];
  let isKicked=false;
  let isBanned=false;
  let isTempKicked=false;
  let latestBannedDocs=[];
  let chatControl={disabled:false, closeAt:null, openAt:null};
  let chatClosed=false;
  let azhiCourseDatasetPromise=null;
  const reservedNames=['管理員','admin','administrator','系統','版主','站長','阿智','AI','ai','Azhi','azhi','Assistant','assistant','ChatGPT','chatgpt','Gemini','gemini','Claude','claude'];
  if(!box||!form) return;

  function getOrCreateId(storageKey){
    let id=localStorage.getItem(storageKey);
    if(!id){
      id=(crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+'-'+Math.random().toString(16).slice(2));
      localStorage.setItem(storageKey,id);
    }
    return id;
  }
  const visitorId=getOrCreateId('lo-man-kam-visitor-id');
  const sessionId=(crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+'-'+Math.random().toString(16).slice(2));
  nameInput.value = localStorage.getItem('lo-man-kam-chat-name') || '';
  nameInput.addEventListener('change',()=>{ if(isAdmin){ nameInput.value='管理員'; return; } const checked=validateName(nameInput.value); if(!checked){ alert('這個名稱不可使用，請換一個暱稱。'); nameInput.value=''; localStorage.removeItem('lo-man-kam-chat-name'); } else { nameInput.value=checked; localStorage.setItem('lo-man-kam-chat-name', checked); } });

  callAiBtn && callAiBtn.addEventListener('click', function(){
    if(!textInput) return;
    textInput.value = (currentLang === 'en') ? '@Azhi ' : '@阿智 ';
    textInput.focus();
    const len=textInput.value.length;
    if(textInput.setSelectionRange) textInput.setSelectionRange(len,len);
  });

  const firebaseReady = !firebaseConfig.apiKey.includes('PASTE_') && !firebaseConfig.projectId.includes('PASTE_');
  const defaultMessages=[
    {id:'system', name:'系統', text: firebaseReady ? '雲端聊天室已啟用，歡迎留下觀課心得。' : '尚未填入 Firebase 設定，目前暫用本機留言。', time:new Date().toISOString(), system:true, likedBy:[]}
  ];

  function escapeHTML(str){
    return String(str).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function timeLabel(value){
    try{
      const d = value && value.toDate ? value.toDate() : new Date(value || Date.now());
      return d.toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    }catch(e){return '';}
  }
  function isReservedName(name){
    const normalized=String(name||'').trim().toLowerCase().replace(/\s+/g,' ');
    return reservedNames.some(n=>normalized === n.toLowerCase());
  }
  function validateName(name){
    const clean=String(name||'').trim().slice(0,18);
    if(!clean) return '訪客';
    if(isReservedName(clean)) return null;
    return clean;
  }

  function isAzhiRequest(text){
    const clean=String(text||'').trim();
    return /^@?阿智[：:\s]/.test(clean) || clean === '@阿智' || clean === '阿智' || /^@?azhi[：:\s]/i.test(clean) || /^@?ai[：:\s]/i.test(clean);
  }
  function getAzhiQuestion(text){
    return String(text||'').trim()
      .replace(/^@?阿智[：:\s]*/,'')
      .replace(/^@?azhi[：:\s]*/i,'')
      .replace(/^@?ai[：:\s]*/i,'')
      .trim() || '請介紹一下你自己。';
  }
  function azhiLanguageInstruction(question){
    const clean=String(question||'').trim();
    if(/[ぁ-ゖァ-ヺ]/u.test(clean)) return '回答語言：使用者主要使用日文，請用日文回答。';
    if(/[가-힣]/u.test(clean)) return '回答語言：使用者主要使用韓文，請用韓文回答。';
    if(/[一-鿿]/u.test(clean)) return '回答語言：使用者主要使用中文，請使用繁體中文回答。';
    if(/[A-Za-z]/.test(clean)) return '回答語言：使用者使用拉丁字母語言，請辨識使用者的主要語言，並用同一語言回答；不要因網站預設語言是繁體中文而改用中文。';
    return '回答語言：請辨識使用者這次訊息的主要語言，並以相同語言回答；中文一律使用繁體中文。';
  }
  function azhiDisplaySpeaker(m){
    if(m.azhiMessage) return '阿智';
    if(m.adminMessage) return '管理員';
    return String(m.name || '訪客').replace(/[\n\r]+/g,' ').slice(0,18);
  }
  function loadAzhiCourseDataset(){
    if(azhiCourseDatasetPromise) return azhiCourseDatasetPromise;
    azhiCourseDatasetPromise=(async()=>{
      try{
        const baseUrl=new URL('data/wcmd.json', document.baseURI).href;
        const idsUrl=new URL('data/videoIds.json', document.baseURI).href;
        const [wcmdRes, idsRes]=await Promise.all([
          fetch(`${baseUrl}?v=${Date.now()}`,{cache:'no-store'}),
          fetch(`${idsUrl}?v=${Date.now()}`,{cache:'no-store'})
        ]);
        if(!wcmdRes.ok) throw new Error(`WCMD HTTP ${wcmdRes.status}`);
        const wcmd=await wcmdRes.json();
        const ids=idsRes.ok ? await idsRes.json() : [];
        const episodes=(Array.isArray(wcmd.episodes)?wcmd.episodes:[])
          .filter(ep=>ep && Number.isFinite(Number(ep.episode)))
          .sort((a,b)=>Number(a.episode)-Number(b.episode));
        const uniqueEpisodes=[...new Map(episodes.map(ep=>[Number(ep.episode),ep])).values()];
        const idCount=Array.isArray(ids)?new Set(ids.map(String).filter(Boolean)).size:0;
        return {wcmd,ids,episodes:uniqueEpisodes,idCount,episodeCount:uniqueEpisodes.length};
      }catch(err){
        console.warn('阿智即時課程資料載入失敗',err);
        return {wcmd:{},ids:[],episodes:[],idCount:0,episodeCount:0,error:true};
      }
    })();
    return azhiCourseDatasetPromise;
  }
  function formatAzhiCourseContext(dataset){
    if(!dataset || dataset.error) return '即時網站課程資料目前無法載入；若使用者詢問影片數量，請明確說明無法確認，不要猜測。';
    const sourceDate=String(dataset.wcmd.generatedAt||'').trim();
    const rows=dataset.episodes.map(ep=>{
      const title=String(ep.title?.zh||ep.title?.en||'').trim()||`第${ep.episode}集`;
      const category=String(ep.category?.zh||'').trim();
      const terms=[...(Array.isArray(ep.tags)?ep.tags:[]),...(Array.isArray(ep.concepts)?ep.concepts:[]),...(Array.isArray(ep.skills)?ep.skills:[])];
      const keywords=[...new Set(terms.map(String).map(s=>s.trim()).filter(Boolean))].slice(0,12);
      return `第${ep.episode}集｜${title}${category?`｜分類：${category}`:''}${keywords.length?`｜關鍵詞：${keywords.join('、')}`:''}`;
    });
    return [
      '即時網站課程資料（回答影片數量與課程問題時，以此資料為準，不要使用舊記憶）：',
      `資料來源：data/wcmd.json${sourceDate?`，更新日期：${sourceDate}`:''}`,
      `影片 ID 總數：${dataset.idCount}`,
      `WCMD 課程條目數：${dataset.episodeCount}`,
      `目前網站影片總數：${Math.max(dataset.idCount,dataset.episodeCount)}`,
      '課程索引：',
      ...rows
    ].join('\n');
  }
  function episodeNumberFromQuestion(question){
    const match=String(question||'').match(/(?:第|episode\s*)(\d+)\s*(?:集|話|期)?/i);
    return match ? Number(match[1]) : null;
  }
  function titleSearchTerms(title){
    const parts=String(title||'').split(/[｜|、，,：:；;。\s]+/).map(s=>s.trim()).filter(s=>s.length>=2);
    const grams=[];
    parts.forEach(part=>{
      for(let length=2;length<=Math.min(4,part.length);length++){
        for(let start=0;start+length<=part.length;start++) grams.push(part.slice(start,start+length));
      }
    });
    return [String(title||''),...parts,...grams];
  }
  function descriptionSearchTerm(question,dataset){
    const normalized=String(question||'').toLowerCase();
    const candidates=[];
    (dataset?.episodes||[]).forEach(ep=>{
      const title=String(ep.title?.zh||ep.title?.en||'').replace(/^盧文錦\s*師父\s*授課精華\s*\d+\s*[-－–—｜|：:]?\s*/u,'').trim();
      const terms=[...titleSearchTerms(title),ep.category?.zh,ep.category?.en,...(ep.tags||[]),...(ep.concepts||[]),...(ep.skills||[])];
      terms.map(v=>String(v||'').trim()).filter(v=>v.length>=2).forEach(term=>{
        if(normalized.includes(term.toLowerCase())) candidates.push(term);
      });
    });
    return [...new Set(candidates)].sort((a,b)=>b.length-a.length)[0] || '';
  }
  async function loadAzhiDescriptionContext(question,dataset){
    const episode=episodeNumberFromQuestion(question);
    const term=descriptionSearchTerm(question,dataset);
    if(!episode && !term) return '本次問題沒有找到需要查詢的特定 YouTube 說明欄；請勿自行編造影片重點。';
    try{
      const url=episode ? `${AZHI_COURSE_API_URL}/video/${episode}` : `${AZHI_COURSE_API_URL}/search?q=${encodeURIComponent(term)}`;
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) throw new Error(`課程說明 API HTTP ${res.status}`);
      const data=await res.json();
      const videos=episode ? (data.video ? [data.video] : []) : (Array.isArray(data.results)?data.results:[]);
      const rows=videos.filter(v=>v && v.description).slice(0,3).map(v=>{
        const description=String(v.description).replace(/[\n\r]+/g,' ').trim().slice(0,1800);
        return `第${v.episode||''}集｜${v.title||''}\nYouTube 說明欄：${description}\n影片連結：${v.url||''}`;
      });
      return rows.length ? ['相關 YouTube 影片說明欄（請以此作為課程重點來源）：',...rows].join('\n\n') : '找不到相關 YouTube 說明欄內容；請明確說明資料不足，不要猜測。';
    }catch(err){
      console.warn('阿智 YouTube 說明欄載入失敗',err);
      return 'YouTube 說明欄目前無法載入；請明確說明資料不足，不要猜測。';
    }
  }
  async function buildAzhiPrompt(userText){
    const question=getAzhiQuestion(userText);
    const courseDataset=await loadAzhiCourseDataset();
    const courseContext=formatAzhiCourseContext(courseDataset);
    const descriptionContext=await loadAzhiDescriptionContext(question,courseDataset);
    const recent=(latestMessages || [])
      .filter(m=>m && m.text && !m.system && !m.deleted)
      .slice(-10)
      .map(m=>`${azhiDisplaySpeaker(m)}：${String(m.text).replace(/[\n\r]+/g,' ').slice(0,220)}`)
      .join('\n');
    return [
      '請以「阿智」的身份回答。你是「盧文錦師父授課精華網站」的 AI 助教。',
      '回答規則：',
      '1. 請使用繁體中文，除非使用者明確要求英文。',
      '2. 詠春拳、武術觀念、課程學習、網站使用是你的專長，但你不是只能回答這些問題。',
      '3. 一般常識、歷史、地理、文化、科技、生活問題都要正常回答；絕對不要因為問題不是詠春拳就說超出能力範圍。',
      '4. 如果使用者詢問即時資訊，例如今天日期、現在時間、今天新聞、匯率、股價、天氣等，請先誠實說明你可能無法取得即時資料；若需要地點或條件，先簡短追問，不要把話題轉回詠春拳。',
      '5. 如果使用者問「今天天氣？」但沒有提供地點，請回答：「請問您想查哪個城市或地區的天氣？」；如果有地點但無法取得即時天氣，請說明無法即時查詢，並建議使用氣象網站或手機天氣 App。',
      '6. 如果問題與詠春拳有關，優先結合詠春觀念回答。',
      '7. 不要假裝自己是真人師父；你是 AI 助教「阿智」。',
      '8. 回答簡潔、親切、有耐心；不同主題請分成數個短段落，重點較多時請使用條列式，段落之間保留空行。',
      '9. 影片數量、課程集數、課程標題與課程索引問題，必須以「即時網站課程資料」為準；若資料中顯示 31 部，就回答 31 部，不要回答舊的 29 部。',
      '10. 如果提供了 YouTube 說明欄，請優先依據說明欄回答課程重點，並在回答中指出第幾集；沒有資料時不要自行補寫。',
      '11. 不要把所有內容合併成一段；請使用自然段落、條列或小標題，讓回答容易閱讀。',
      azhiLanguageInstruction(question),
      '',
      courseContext,
      '',
      descriptionContext,
      '',
      recent ? '最近聊天室上下文（供你理解前後文，最多 10 則）：\n' + recent : '最近聊天室上下文：無',
      '',
      '使用者這次的問題：' + question
    ].join('\n');
  }
  async function sendAzhiReply(userText, chatRefForWrite, sourceMessageId){
    if(!isAzhiRequest(userText)) return;
    const startedAt = performance.now ? performance.now() : Date.now();
    if(sourceMessageId){
      azhiPendingMessageIds.add(sourceMessageId);
      renderMessages(latestMessages);
    }
    try{
      const res=await fetch(AZHI_WORKER_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:await buildAzhiPrompt(userText)})
      });
      const data=await res.json().catch(()=>({}));
      const elapsedMs=Math.round((performance.now ? performance.now() : Date.now()) - startedAt);
      const reply=(data && data.reply ? String(data.reply) : '我是阿智，目前暫時無法回答，請稍後再試。').slice(0,1200);
      await addDoc(chatRefForWrite, {name:AZHI_NAME, text:reply, likedBy:[], adminMessage:false, azhiMessage:true, system:true, azhiElapsedMs:elapsedMs, createdAt:serverTimestamp()});
    }catch(err){
      console.error('Azhi reply failed', err);
      try{ await addDoc(chatRefForWrite, {name:AZHI_NAME, text:'我是阿智，目前連線暫時不穩，請稍後再問我一次。', likedBy:[], adminMessage:false, azhiMessage:true, system:true, createdAt:serverTimestamp()}); }catch(e){}
    }finally{
      if(sourceMessageId){
        azhiPendingMessageIds.delete(sourceMessageId);
        renderMessages(latestMessages);
      }
    }
  }
  function renderOnlineAdminList(){
    if(!adminOnlineList) return;
    if(!isAdmin){ adminOnlineList.innerHTML='<span class="small">管理員登入後可查看目前在線訪客，並選擇「踢出」或「加入黑名單」。</span>'; return; }
    const now=Date.now();
    const seen=new Map();
    latestOnlineDocs.forEach(item=>{
      const t=item.lastSeen && item.lastSeen.toDate ? item.lastSeen.toDate().getTime() : 0;
      if(now-t < 70000 && item.visitorId && item.visitorId !== visitorId && !item.kicked){
        seen.set(item.visitorId, item);
      }
    });
    const list=[...seen.values()];
    if(!list.length){ adminOnlineList.innerHTML='<span class="small">目前沒有其他在線訪客。</span>'; return; }
    adminOnlineList.innerHTML=list.map(item=>`<div class="adminOnlineItem"><span><b>${escapeHTML(item.name||'訪客')}</b><br><small>${escapeHTML(item.visitorId||item.id||'')}</small></span><span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="kickBtn" data-visitor="${escapeHTML(item.visitorId||'')}" data-name="${escapeHTML(item.name||'訪客')}">踢出</button><button class="banBtn" data-visitor="${escapeHTML(item.visitorId||'')}" data-name="${escapeHTML(item.name||'訪客')}">加入黑名單</button></span></div>`).join('');
  }
  function renderBannedAdminList(){
    if(!adminBannedList) return;
    if(!isAdmin){ adminBannedList.innerHTML='<span class="small">管理員登入後可查看黑名單並解除限制。</span>'; return; }
    const list=latestBannedDocs.filter(item=>item.visitorId);
    if(!list.length){ adminBannedList.innerHTML='<span class="small">目前沒有黑名單使用者。</span>'; return; }
    adminBannedList.innerHTML=list.map(item=>`<div class="adminBannedItem"><span><b>${escapeHTML(item.name||'訪客')}</b><br><small>${escapeHTML(item.visitorId||item.id||'')}</small></span><button class="unbanBtn" data-visitor="${escapeHTML(item.visitorId||item.id||'')}" data-name="${escapeHTML(item.name||'訪客')}">取消黑名單</button></div>`).join('');
  }
  function toMillis(value){
    if(!value) return null;
    if(value.toDate) return value.toDate().getTime();
    if(typeof value === 'number') return value;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }
  function dateTimeParts(value){
    const ms=toMillis(value);
    if(!ms) return {date:'', time:''};
    const d=new Date(ms);
    const pad=n=>String(n).padStart(2,'0');
    return {date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, time:`${pad(d.getHours())}:${pad(d.getMinutes())}`};
  }
  function fromDateAndTime(dateValue, timeValue){
    if(!dateValue || !timeValue) return null;
    const t=new Date(`${dateValue}T${timeValue}`).getTime();
    return Number.isFinite(t) ? new Date(t) : null;
  }
  function fillDateTimeInputs(prefix, value){
    const parts=dateTimeParts(value);
    if(prefix==='close'){
      if(chatCloseDateInput && document.activeElement !== chatCloseDateInput) chatCloseDateInput.value=parts.date;
      if(chatCloseTimeInput && document.activeElement !== chatCloseTimeInput) chatCloseTimeInput.value=parts.time;
    }else{
      if(chatOpenDateInput && document.activeElement !== chatOpenDateInput) chatOpenDateInput.value=parts.date;
      if(chatOpenTimeInput && document.activeElement !== chatOpenTimeInput) chatOpenTimeInput.value=parts.time;
    }
  }
  function isChatClosedNow(data){
    if(!data || !data.disabled) return false;
    const now=Date.now();
    const closeAt=toMillis(data.closeAt);
    const openAt=toMillis(data.openAt);
    if(closeAt && now < closeAt) return false;
    if(openAt && now >= openAt) return false;
    return true;
  }
  function chatControlText(){
    const closeAt=toMillis(chatControl.closeAt);
    const openAt=toMillis(chatControl.openAt);
    if(chatClosed){
      return openAt ? `聊天室暫時關閉\n預計開放時間：${timeLabel(openAt)}` : '聊天室暫時關閉\n請等待管理員公告。';
    }
    if(chatControl.disabled && closeAt && Date.now() < closeAt){
      return `聊天室目前開放，將於 ${timeLabel(closeAt)} 關閉。`;
    }
    return '留言目前開放。';
  }
  function updateChatControlUI(){
    chatClosed = isChatClosedNow(chatControl);
    const text = chatControlText();
    if(commentClosedNotice){
      commentClosedNotice.hidden = !chatClosed;
      commentClosedNotice.textContent = (chatClosed && isAdmin) ? `🔴 ${text}\n（管理員仍可留言）` : `🔴 ${text}`;
    }
    if(chatControlAdminStatus) chatControlAdminStatus.textContent = `目前留言狀態：${text.replace(/\n/g,' ')}`;
    fillDateTimeInputs('close', chatControl.closeAt);
    fillDateTimeInputs('open', chatControl.openAt);
    updateRestrictionNotice();
  }
  function updateRestrictionNotice(){
    isKicked = !!(isBanned || isTempKicked);
    if(kickedNotice){
      kickedNotice.hidden = !isKicked;
      kickedNotice.textContent = isBanned ? '你已被管理員列入黑名單，暫時無法傳送訊息或按讚。' : '你已被管理員踢出本次聊天室，重新整理後可再嘗試加入。';
    }
    const shouldDisable = isKicked || (chatClosed && !isAdmin);
    if(form) form.classList.toggle('adminMode', isAdmin);
    if(nameInput){
      nameInput.style.display = isAdmin ? 'none' : '';
      if(isAdmin) nameInput.value='管理員';
      nameInput.disabled = shouldDisable;
    }
    if(textInput) textInput.disabled = shouldDisable;
    const sendBtn=form ? form.querySelector('.chatSend') : null;
    if(sendBtn) sendBtn.disabled = shouldDisable;
    if(callAiBtn) callAiBtn.disabled = shouldDisable;
    if(isKicked){
      renderMessages([{id:'kicked', name:'系統', text:(isBanned ? '你已被管理員列入黑名單，暫時無法傳送訊息或按讚。' : '你已被管理員踢出本次聊天室，重新整理後可再嘗試加入。'), time:new Date().toISOString(), system:true, likedBy:[]}]);
    }
  }
  function azhiThinkingHTML(messageId){
    if(!messageId || !azhiPendingMessageIds.has(messageId)) return '';
    const label = (window.currentLang === 'en' || currentLang === 'en') ? 'Azhi is thinking / typing' : '阿智正在思考／輸入中';
    return `<div class="azhiThinking">${label}<span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
  }
  function renderMessages(messages){
    latestMessages = messages || [];
    const list = latestMessages.length ? latestMessages : defaultMessages;
    box.innerHTML=list.map(m=>{
      const likedBy=Array.isArray(m.likedBy)?m.likedBy:[];
      const liked=likedBy.includes(visitorId);
      const likeCount=likedBy.length;
      const likeBtn=m.system ? '' : `<button class="likeBtn ${liked?'liked':''}" data-id="${escapeHTML(m.id||'')}">👍 ${likeCount}</button>`;
      const deleteBtn=(!m.system && isAdmin) ? `<button class="deleteBtn" data-id="${escapeHTML(m.id||'')}">🗑 刪除</button>` : '';
      const likeHTML=m.system ? '' : `<div class="chatActions">${likeBtn}${deleteBtn}</div>`;
      const adminClass=m.adminMessage ? 'adminMsg' : (m.system ? '' : 'me');
      const adminBadge=m.adminMessage ? '<span class="adminShield">🛡 管理員</span>' : '';
      const displayName=m.adminMessage ? '' : escapeHTML(m.name||'訪客');
      const thinkingHTML=azhiThinkingHTML(m.id);
      const elapsedHTML=(isAdmin && m.azhiMessage && m.azhiElapsedMs) ? `<div class="azhiElapsed">AI 回應耗時：${(Number(m.azhiElapsedMs)/1000).toFixed(1)} 秒</div>` : '';
      return `<div class="chatMsg ${adminClass}"><span class="chatMeta">${adminBadge}${displayName}<span class="chatTime">${timeLabel(m.createdAt || m.time)}</span></span>${escapeHTML(m.text||'')}${elapsedHTML}${thinkingHTML}${likeHTML}</div>`;
    }).join('');
    box.scrollTop=box.scrollHeight;
  }

  if(firebaseReady){
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();
    const authReady = signInAnonymously(auth).catch((error)=>{
      console.error('anonymous auth failed', error);
      renderMessages([{id:'auth-error', name:'系統', text:'Firebase 匿名登入失敗，請確認 Authentication 已啟用 Anonymous。', time:new Date().toISOString(), system:true, likedBy:[]}]);
      throw error;
    });
    const chatRef = collection(db, collectionName);
    const onlineRef = collection(db, onlineCollectionName);
    const myOnlineRef = doc(db, onlineCollectionName, sessionId);
    const announcementRef = doc(db, 'announcements', 'main');
    const chatControlRef = doc(db, 'chatSettings', 'commentControl');
    const bannedUsersRef = collection(db, 'bannedUsers');
    const myBanRef = doc(db, 'bannedUsers', visitorId);
    const chatQuery = query(chatRef, orderBy('createdAt','asc'), limit(80));
    if(toolsText) toolsText.textContent = '雲端聊天室已啟用：所有訪客都能同步看到留言、在線人數、留言狀態與按讚。';
    if(clearBtn){ clearBtn.textContent = '清空聊天室'; clearBtn.style.display='none'; }

    function refreshAdminUI(user){
      const previousAdmin=isAdmin;
      isAdmin = !!(user && user.email && user.email.toLowerCase() === adminEmail);
      if(previousAdmin && !isAdmin && nameInput){
        nameInput.value='';
        localStorage.removeItem('lo-man-kam-chat-name');
      }
      if(adminPanel) adminPanel.hidden = !isAdmin;
      if(clearBtn) clearBtn.style.display = isAdmin ? '' : 'none';
      if(adminLoginBtn) adminLoginBtn.textContent = isAdmin ? '管理員登出' : '管理員登入';
      if(adminStatus) adminStatus.textContent = isAdmin ? `管理員模式：${user.email}` : '一般訪客模式';
      renderMessages(latestMessages);
      renderOnlineAdminList();
      renderBannedAdminList();
      updateRestrictionNotice();
      updateChatControlUI();
    }

    onAuthStateChanged(auth, (user)=>{ refreshAdminUI(user); });

    adminLoginBtn && adminLoginBtn.addEventListener('click', async ()=>{
      try{
        if(isAdmin){
          await signOut(auth);
          await signInAnonymously(auth);
          return;
        }
        const result = await signInWithPopup(auth, googleProvider);
        const email = (result.user.email || '').toLowerCase();
        if(email !== adminEmail){
          alert('這個 Google 帳號不是管理員帳號。');
          await signOut(auth);
          await signInAnonymously(auth);
        }
      }catch(err){
        console.error(err);
        alert('管理員登入失敗，請確認 Firebase Authentication 已啟用 Google 登入。');
      }
    });


    onSnapshot(myBanRef, (snap)=>{
      isBanned = snap.exists();
      updateRestrictionNotice();
    });

    onSnapshot(myOnlineRef, (snap)=>{
      isTempKicked = !!(snap.exists() && snap.data().kicked);
      updateRestrictionNotice();
    });

    onSnapshot(bannedUsersRef, (snapshot)=>{
      latestBannedDocs = snapshot.docs.map(d=>({id:d.id,...d.data()}));
      renderBannedAdminList();
    });

    onSnapshot(announcementRef, (snap)=>{
      const text = snap.exists() && snap.data().text ? snap.data().text : '歡迎留下觀課心得與詠春交流問題，請保持尊重與友善。';
      if(announcementText) announcementText.textContent = text;
      if(announcementInput && !announcementInput.value) announcementInput.value = text;
    });

    onSnapshot(chatControlRef, (snap)=>{
      chatControl = snap.exists() ? {disabled:false, closeAt:null, openAt:null, ...snap.data()} : {disabled:false, closeAt:null, openAt:null};
      updateChatControlUI();
    });
    setInterval(updateChatControlUI, 30000);

    function getScheduleValues(){
      const closeAt=fromDateAndTime(chatCloseDateInput && chatCloseDateInput.value, chatCloseTimeInput && chatCloseTimeInput.value);
      const openAt=fromDateAndTime(chatOpenDateInput && chatOpenDateInput.value, chatOpenTimeInput && chatOpenTimeInput.value);
      return {closeAt, openAt};
    }
    async function saveChatControl(closeAt, openAt, message){
      await setDoc(chatControlRef, {disabled:true, closeAt, openAt, updatedAt:serverTimestamp(), updatedBy:(auth.currentUser && auth.currentUser.email) || adminEmail}, {merge:true});
      chatControl={disabled:true, closeAt, openAt}; updateChatControlUI();
      if(message) alert(message);
    }
    async function closeForHours(hours){
      if(!isAdmin) return alert('只有管理員可以關閉留言。');
      const closeAt=new Date();
      const openAt=new Date(Date.now()+hours*60*60*1000);
      await saveChatControl(closeAt, openAt, `留言已關閉 ${hours>=24 ? (hours/24)+' 天' : hours+' 小時'}。`);
    }
    saveChatScheduleBtn && saveChatScheduleBtn.addEventListener('click', async ()=>{
      if(!isAdmin) return alert('只有管理員可以設定聊天室開放時間。');
      const {closeAt, openAt}=getScheduleValues();
      if(!closeAt && !openAt) return alert('請至少設定關閉日期/時間或開放日期/時間。');
      if(closeAt && openAt && openAt.getTime() <= closeAt.getTime()) return alert('重新開放時間必須晚於關閉開始時間。');
      await saveChatControl(closeAt, openAt, '聊天室開關排程已儲存。');
    });
    closeChatNowBtn && closeChatNowBtn.addEventListener('click', async ()=>{
      if(!isAdmin) return alert('只有管理員可以關閉留言。');
      const {openAt}=getScheduleValues();
      const closeAt=new Date();
      await saveChatControl(closeAt, openAt, openAt ? '留言已立即關閉，並會依設定時間重新開放。' : '留言已立即關閉。');
    });
    close1hBtn && close1hBtn.addEventListener('click', ()=>closeForHours(1));
    close24hBtn && close24hBtn.addEventListener('click', ()=>closeForHours(24));
    close7dBtn && close7dBtn.addEventListener('click', ()=>closeForHours(168));
    openChatNowBtn && openChatNowBtn.addEventListener('click', async ()=>{
      if(!isAdmin) return alert('只有管理員可以開放留言。');
      await setDoc(chatControlRef, {disabled:false, closeAt:null, openAt:null, updatedAt:serverTimestamp(), updatedBy:(auth.currentUser && auth.currentUser.email) || adminEmail}, {merge:true});
      chatControl={disabled:false, closeAt:null, openAt:null}; updateChatControlUI();
      alert('留言已重新開放。');
    });

    saveAnnouncementBtn && saveAnnouncementBtn.addEventListener('click', async ()=>{
      if(!isAdmin) return alert('只有管理員可以修改公告。');
      const text=(announcementInput.value||'').trim().slice(0,300);
      if(!text) return alert('公告不可空白。');
      await setDoc(announcementRef, {text, updatedAt:serverTimestamp(), updatedBy:auth.currentUser.email}, {merge:true});
      alert('公告已更新。');
    });

    async function updatePresence(){
      try{
        await authReady;
        await setDoc(myOnlineRef, {visitorId, sessionId, name:(nameInput.value||'訪客').trim().slice(0,18)||'訪客', lastSeen:serverTimestamp()}, {merge:true});
      }catch(e){console.warn('presence update failed', e);}
    }
    updatePresence();
    const presenceTimer=setInterval(updatePresence, 20000);
    window.addEventListener('beforeunload',()=>{clearInterval(presenceTimer); deleteDoc(myOnlineRef).catch(()=>{});});
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) updatePresence(); });

    onSnapshot(onlineRef, (snapshot)=>{
      const now=Date.now();
      const activeVisitors=new Set();
      latestOnlineDocs = snapshot.docs.map(d=>({id:d.id,...d.data()}));
      latestOnlineDocs.forEach(data=>{
        const t=data.lastSeen && data.lastSeen.toDate ? data.lastSeen.toDate().getTime() : 0;
        if(now-t < 70000) activeVisitors.add(data.visitorId || data.id);
      });
      const onlineNow=String(Math.max(activeVisitors.size,1));
      if(onlineCountEl) onlineCountEl.textContent=onlineNow;
      if(onlineCountMiniEl) onlineCountMiniEl.textContent=onlineNow;
      renderOnlineAdminList();
    });

    onSnapshot(chatQuery, (snapshot)=>{
      const messages = snapshot.docs.map(docSnap=>({id:docSnap.id,...docSnap.data()}));
      if(messageCountEl) messageCountEl.textContent=String(messages.filter(m=>!m.system).length);
      renderMessages(messages);
    }, (error)=>{
      console.error(error);
      renderMessages([{id:'error', name:'系統', text:'Firebase 連線失敗，請檢查設定或 Firestore 規則。', time:new Date().toISOString(), system:true, likedBy:[]}]);
    });

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      if(isKicked) return alert('你已被管理員限制發言，暫時無法傳送訊息。');
      if(chatClosed && !isAdmin) return alert(chatControlText());
      const name = isAdmin ? '管理員' : validateName(nameInput.value||'訪客');
      const text=(textInput.value||'').trim().slice(0,300);
      if(!name){ alert('這個名稱不可使用，請換一個暱稱。'); nameInput.focus(); return; }
      if(!text) return;
      if(!isAdmin) localStorage.setItem('lo-man-kam-chat-name', name);
      textInput.value='';
      await authReady;
      const userMessageRef = await addDoc(chatRef, {name: isAdmin ? '管理員' : name, text, likedBy:[], adminMessage: !!isAdmin, createdAt:serverTimestamp()});
      await updatePresence();
      sendAzhiReply(text, chatRef, userMessageRef.id);
    });

    box.addEventListener('click', async function(e){
      const likeBtn=e.target.closest('.likeBtn');
      const deleteBtn=e.target.closest('.deleteBtn');
      if(likeBtn && likeBtn.dataset.id){
        if(isKicked) return alert('你已被管理員請出聊天室，暫時無法按讚。');
        if(chatClosed && !isAdmin) return alert(chatControlText());
        likeBtn.disabled=true;
        try{ await authReady; await updateDoc(doc(db, collectionName, likeBtn.dataset.id), {likedBy: arrayUnion(visitorId)}); }
        catch(err){ console.error(err); }
        finally{ likeBtn.disabled=false; }
        return;
      }
      if(deleteBtn && deleteBtn.dataset.id){
        if(!isAdmin) return alert('只有管理員可以刪除訊息。');
        if(!confirm('確定刪除這則留言嗎？')) return;
        deleteBtn.disabled=true;
        try{ await deleteDoc(doc(db, collectionName, deleteBtn.dataset.id)); }
        catch(err){ console.error(err); alert('刪除失敗，請檢查 Firestore Rules 是否允許管理員刪除。'); }
        finally{ deleteBtn.disabled=false; }
      }
    });


    async function markVisitorKicked(targetVisitorId){
      const targets=latestOnlineDocs.filter(item=>item.visitorId===targetVisitorId);
      await Promise.all(targets.map(item=>updateDoc(doc(db, onlineCollectionName, item.id), {kicked:true, kickedAt:serverTimestamp(), kickedBy:auth.currentUser.email || adminEmail}).catch(()=>{})));
    }

    adminOnlineList && adminOnlineList.addEventListener('click', async function(e){
      const kickBtn=e.target.closest('.kickBtn');
      const banBtn=e.target.closest('.banBtn');
      const btn=kickBtn || banBtn;
      if(!btn || !btn.dataset.visitor) return;
      if(!isAdmin) return alert('只有管理員可以管理訪客。');
      const targetName=btn.dataset.name || '訪客';
      btn.disabled=true;
      try{
        if(kickBtn){
          if(!confirm(`確定要將「${targetName}」踢出本次聊天室嗎？\n\n這不會加入黑名單，對方重新整理後可再次嘗試加入。`)) return;
          await markVisitorKicked(btn.dataset.visitor);
          alert('已踢出該訪客，但未加入黑名單。');
        }else if(banBtn){
          if(!confirm(`確定要將「${targetName}」加入黑名單並限制發言嗎？`)) return;
          await setDoc(doc(db, 'bannedUsers', btn.dataset.visitor), {visitorId:btn.dataset.visitor, name:targetName, bannedBy:auth.currentUser.email, createdAt:serverTimestamp()}, {merge:true});
          await markVisitorKicked(btn.dataset.visitor);
          alert('已將該訪客加入黑名單並限制發言。');
        }
      }catch(err){
        console.error(err);
        alert('操作失敗，請檢查 Firestore Rules 是否允許管理員寫入 onlineUsers / bannedUsers。');
      }finally{ btn.disabled=false; }
    });

    adminBannedList && adminBannedList.addEventListener('click', async function(e){
      const btn=e.target.closest('.unbanBtn');
      if(!btn || !btn.dataset.visitor) return;
      if(!isAdmin) return alert('只有管理員可以取消黑名單。');
      const targetName=btn.dataset.name || '訪客';
      if(!confirm(`確定要取消「${targetName}」的黑名單限制嗎？`)) return;
      btn.disabled=true;
      try{
        await deleteDoc(doc(db, 'bannedUsers', btn.dataset.visitor));
        alert('已取消黑名單。');
      }catch(err){
        console.error(err);
        alert('取消黑名單失敗，請檢查 Firestore Rules。');
      }finally{ btn.disabled=false; }
    });

    clearBtn && clearBtn.addEventListener('click', async function(){
      if(!isAdmin) return alert('只有管理員可以清除留言。');
      if(!confirm('確定要清除雲端聊天室留言嗎？所有訪客都會看不到。')) return;
      await authReady;
      const snap = await getDocs(chatRef);
      await Promise.all(snap.docs.map(d=>deleteDoc(d.ref)));
    });
  }else{
    if(onlineCountEl) onlineCountEl.textContent='1';
    if(onlineCountMiniEl) onlineCountMiniEl.textContent='1';
    function load(){try{return JSON.parse(localStorage.getItem(key))||defaultMessages;}catch(e){return defaultMessages;}}
    function save(messages){localStorage.setItem(key, JSON.stringify(messages.slice(-80)));}
    function render(){const localMessages=load(); if(messageCountEl) messageCountEl.textContent=String(localMessages.filter(m=>!m.system).length); renderMessages(localMessages);}
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const name = isAdmin ? '管理員' : validateName(nameInput.value||'訪客');
      const text=(textInput.value||'').trim().slice(0,300);
      if(!name){ alert('這個名稱不可使用，請換一個暱稱。'); nameInput.focus(); return; }
      if(!text) return;
      if(!isAdmin) localStorage.setItem('lo-man-kam-chat-name', name);
      const messages=load();
      const localUserMessageId=String(Date.now());
      messages.push({id:localUserMessageId, name,text,time:new Date().toISOString(),likedBy:[], adminMessage: !!isAdmin});
      if(isAzhiRequest(text)){
        messages.push({id:String(Date.now()+1), name:AZHI_NAME, text:'我是阿智。此版本需要 Firebase 雲端聊天室啟用後，才能連線到 AI 回覆。', time:new Date().toISOString(), likedBy:[], adminMessage:false, azhiMessage:true, system:true});
      }
      save(messages);
      textInput.value='';
      render();
    });
    box.addEventListener('click', function(e){
      const btn=e.target.closest('.likeBtn');
      if(!btn || !btn.dataset.id) return;
      const messages=load();
      const msg=messages.find(m=>String(m.id)===String(btn.dataset.id));
      if(msg){msg.likedBy=Array.from(new Set([...(msg.likedBy||[]), visitorId])); save(messages); render();}
    });
    clearBtn && clearBtn.addEventListener('click', function(){
      if(confirm('確定要清除這台裝置上的留言嗎？')){localStorage.removeItem(key);render();}
    });
    render();
  }

  textInput.addEventListener('keydown', function(e){
    if(e.key==='Enter' && !e.shiftKey){e.preventDefault();form.requestSubmit();}
  });
})();
