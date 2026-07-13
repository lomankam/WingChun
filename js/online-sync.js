// WingChun V22.2 - extracted from index.html
// 同步側欄在線人數
setInterval(()=>{ const mini=document.getElementById('onlineCountMini'); const side=document.getElementById('onlineCountSide'); if(mini&&side) side.textContent=mini.textContent||'--'; },1200);
