// WingChun V22.2 - extracted from index.html
(function(){
  const btn=document.getElementById('chatStandaloneBtn');
  if(!btn) return;
  const params=new URLSearchParams(window.location.search);
  const chatOnly=params.get('chat')==='1';
  if(chatOnly){
    document.title='線上聊天室｜盧文錦師父授課精華';
    btn.hidden = true;
  }else{
    btn.textContent='💬 開啟聊天室';
    btn.setAttribute('aria-label','在新分頁開啟線上聊天室');
    btn.addEventListener('click', function(){
      const url=new URL(window.location.href);
      url.searchParams.set('chat','1');
      window.open(url.toString(), '_blank', 'noopener');
    });
  }
})();
