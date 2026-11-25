/**
 * Lampa Parser Catalog v2
 * Catalog endpoints are configurable; API probes may be affected by CORS.
 */
(function () {
  'use strict';
  if (window.parser_catalog_ready_v2) return;
  window.parser_catalog_ready_v2 = true;

  var catalog = [
    {name:'JacRed.su', url:'https://jacred.su', key:'', type:'jackett'},
    {name:'Jac.black', url:'https://jac.black', key:'', type:'jackett'},
    {name:'Jac.red', url:'https://jac.red', key:'', type:'jackett'},
    {name:'ru.Jac.black', url:'https://ru.jac.black', key:'', type:'jackett'},
    {name:'jr.maxvol.pro', url:'https://jr.maxvol.pro', key:'', type:'jackett'}
  ];
  var statuses = {}, selected = null, panel = null, busy = false;

  var css = [
    '.pcatalog{position:fixed;z-index:99999;left:4%;right:4%;top:5%;bottom:5%;background:#000;color:#fff;',
    'border:1px solid #404040;border-radius:15px;padding:20px;box-sizing:border-box;font-family:Arial,sans-serif;',
    'display:flex;flex-direction:column;box-shadow:0 12px 40px #000b}',
    '.pcatalog *{box-sizing:border-box}.pc-head{display:flex;justify-content:space-between;align-items:center;gap:12px}',
    '.pc-title{font-size:1.55em;font-weight:bold}.pc-sub{color:#b7b7b7;margin:6px 0 14px}',
    '.pc-list{overflow:auto;flex:1}.pc-row{border:1px solid #454545;border-radius:11px;padding:12px 15px;margin:7px 0;',
    'display:flex;align-items:center;justify-content:space-between;gap:14px;background:#101010;cursor:pointer}',
    '.pc-row.pc-selected{border:3px solid #fff;background:#1b1b1b}.pc-name{font-size:1.05em;font-weight:bold}',
    '.pc-url{font-size:.82em;color:#aaa;margin-top:4px;word-break:break-all}.pc-state{text-align:right;font-weight:bold}',
    '.pc-dot{display:inline-block;width:13px;height:13px;border-radius:50%;margin-right:8px;vertical-align:middle}',
    '.pc-green{background:#35d879;box-shadow:0 0 10px #35d87966}.pc-red{background:#ff4b55;box-shadow:0 0 10px #ff4b5566}',
    '.pc-yellow{background:#ffc44d;box-shadow:0 0 10px #ffc44d66}.pc-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:13px}',
    '.pc-btn{background:#252525;border:1px solid #777;color:#fff;border-radius:10px;padding:12px 17px;font-size:1em}',
    '.pc-btn:focus,.pc-row:focus{outline:3px solid #fff}.pc-legend{color:#bbb;font-size:.85em;margin-top:11px}',
    '.pc-close{background:#333}@media(max-width:700px){.pcatalog{left:2%;right:2%;top:3%;bottom:3%;padding:13px}}'
  ].join('');

  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function getState(i){return statuses[i]||{state:'unknown',label:'Не проверен',time:'—'}}
  function renderRows(){
    if(!panel)return;
    var list=panel.find('.pc-list');
    list.html(catalog.map(function(item,i){
      var st=getState(i), cls=st.state==='ok'?'pc-green':st.state==='checking'?'pc-yellow':'pc-red';
      return '<div class="pc-row selector '+(selected===i?'pc-selected':'')+'" data-index="'+i+'"><div><div class="pc-name">'+esc(item.name)+'</div>'+
        '<div class="pc-url">'+esc(item.url)+'</div></div><div class="pc-state"><span class="pc-dot '+cls+'"></span>'+esc(st.label)+
        '<div class="pc-url">'+esc(st.time)+'</div></div></div>';
    }).join(''));
    list.find('.pc-row').on('hover:enter click',function(){
      var i=Number($(this).attr('data-index'));selected=i;saveSelected();renderRows();
    });
  }
  function saveSelected(){try{Lampa.Storage.set('parser_catalog_selected_v2',selected)}catch(e){}}
  function test(i,done){
    var item=catalog[i], started=Date.now();
    statuses[i]={state:'checking',label:'Проверяется…',time:'—'};renderRows();
    var request=new Lampa.Reguest(), finished=false;
    var endpoint=item.url.replace(/\/+$/,'')+'/api/v2.0/indexers/all/results?apikey='+encodeURIComponent(item.key||'')+'&Query=parser_catalog_test';
    var timer=setTimeout(function(){if(finished)return;finished=true;request.clear();statuses[i]={state:'fail',label:'Таймаут / ошибка сети',time:'> 5 сек'};renderRows();if(done)done()},5000);
    request.get(endpoint,function(data){
      if(finished)return;finished=true;clearTimeout(timer);
      var ok=data && (typeof data==='object') && (data.Results || data.results || data.Indexers);
      statuses[i]={state:ok?'ok':'fail',label:ok?'Ответ API':'Ответ без результатов API',time:(Date.now()-started)+' мс'};
      renderRows();if(done)done();
    },function(){
      if(finished)return;finished=true;clearTimeout(timer);
      statuses[i]={state:'fail',label:'Ошибка / CORS',time:(Date.now()-started)+' мс'};
      renderRows();if(done)done();
    });
  }
  function checkAll(){
    if(busy)return;busy=true;var i=0;
    function next(){if(i>=catalog.length){busy=false;renderRows();return}test(i++,next)}
    next();
  }
  function close(){if(!panel)return; panel.remove();panel=null; $(document).off('keydown.pc_catalog_v2'); Lampa.Controller.toggle('content'); try{Lampa.Controller.enable('content')}catch(e){}}
  function open(){
    if(panel)return;
    if(!$('#pcatalog-style-v2').length)$('<style id="pcatalog-style-v2">'+css+'</style>').appendTo('head');
    try{selected=Lampa.Storage.get('parser_catalog_selected_v2')}catch(e){selected=null}
    panel=$('<div class="pcatalog"><div class="pc-head"><div class="pc-title">Каталог парсеров</div><button class="pc-btn selector pc-close">Закрыть</button></div>'+
      '<div class="pc-sub">Проверка API · время ответа · выбор парсера</div><div class="pc-list"></div>'+
      '<div class="pc-actions"><button class="pc-btn selector pc-check">Проверить все</button><button class="pc-btn selector pc-test">Проверить выбранный</button>'+
      '<button class="pc-btn selector pc-add">Добавить адрес</button></div>'+
      '<div class="pc-legend">🟢 API отвечает · 🔴 Ошибка · 🟡 Проверка · Рамка — выбранный</div></div>').appendTo('body');
    panel.find('.pc-close').on('hover:enter click',close);
    panel.find('.pc-check').on('hover:enter click',checkAll);
    panel.find('.pc-test').on('hover:enter click',function(){if(selected===null){Lampa.Noty.show('Сначала выберите парсер');return}test(selected)});
    panel.find('.pc-add').on('hover:enter click',function(){
      var n=prompt('Название парсера');if(!n)return;var u=prompt('URL (например https://host)');if(!u)return;
      catalog.push({name:n,url:u,key:'',type:'jackett'});renderRows();
    });
    renderRows(); Lampa.Controller.toggle('modal'); try{Lampa.Controller.enable('modal')}catch(e){}; $(document).on('keydown.pc_catalog_v2',function(e){var k=e.key||e.keyCode;if(k==='Escape'||k==='Backspace'||k===27||k===8){e.preventDefault();e.stopPropagation();close();return false;}}); panel.find('.pc-close').first().focus();
  }
  function addMenu(){
    var menu=$('.menu .menu__list').first();
    if(menu.length&&!menu.find('.parser-catalog-menu-v2').length){
      var item=$('<li class="menu__item selector parser-catalog-menu-v2"><div class="menu__text">Каталог парсеров</div></li>');
      item.on('hover:enter click',open);menu.append(item);
    }
  }
  function init(){addMenu();Lampa.Listener.follow('menu',addMenu)}
  if(window.appready)init();else Lampa.Listener.follow('app',function(e){if(e.type==='ready')init()});
})();