(function () {
    'use strict';

    // Текст полосы, которую нужно скрыть (можно добавить другие варианты)
    var TEXTS = ['нет истории просмотра'];
    var CLASS = 'hhb-invisible';

    // ===== Отладка =====
    // true — внизу слева на экране показываются сообщения плагина (и пишутся в консоль Lampa).
    // Когда всё заработает, поставьте false.
    var DEBUG = true;

    var dbgBox = null, dbgLines = [], scanTimer = null, seenBg = {};

    function dbg(msg) {
        if (!DEBUG) return;
        try { console.log('[hhb] ' + msg); } catch (e) {}
        try {
            dbgLines.push(msg);
            if (dbgLines.length > 10) dbgLines.shift();
            if (!dbgBox && document.body) {
                dbgBox = document.createElement('div');
                dbgBox.style.cssText = 'position:fixed;left:8px;bottom:8px;max-width:70%;z-index:2147483647;' +
                    'pointer-events:none;background:rgba(0,0,0,.85);color:#0f0;font:12px/1.3 monospace;' +
                    'padding:6px 8px;border-radius:6px;white-space:pre-wrap;word-break:break-all;';
                document.body.appendChild(dbgBox);
            }
            if (dbgBox) dbgBox.textContent = dbgLines.join('\n');
        } catch (e) {}
    }

    // Показывает крупные элементы, у которых фон не чёрный (чтобы найти «серые» окна),
    // и элементы в верхней панели, где встречается «CUB».
    function scanDebug() {
        if (!DEBUG || !document.body) return;
        try {
            var all = document.body.querySelectorAll('*');
            for (var i = 0; i < all.length; i++) {
                var el = all[i];
                if (el === dbgBox) continue;
                var r = el.getBoundingClientRect();
                if (r.width < 350 || r.height < 150) continue;
                var cs = getComputedStyle(el);
                var bg = cs.backgroundColor;
                var img = cs.backgroundImage;
                var plain = (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(0, 0, 0)') && img === 'none';
                if (plain) continue;
                var sig = el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 60) +
                          ' bg=' + bg + (img !== 'none' ? ' +img' : '');
                if (seenBg[sig]) continue;
                seenBg[sig] = true;
                dbg('BG ' + sig);
            }
            var head = document.querySelectorAll('.head *');
            for (var j = 0; j < head.length; j++) {
                var h = head[j];
                if (h.children.length === 0 && /CUB/i.test(h.textContent || '')) {
                    var s2 = 'CUB in ' + h.tagName.toLowerCase() + '.' + String(h.className).slice(0, 60) + ' "' + h.textContent + '"';
                    if (!seenBg[s2]) { seenBg[s2] = true; dbg(s2); }
                }
            }
        } catch (e) { dbg('scan error: ' + e.message); }
    }

    function scheduleScan() {
        if (scanTimer) clearTimeout(scanTimer);
        scanTimer = setTimeout(scanDebug, 800);
    }

    // Лёгкая проверка раз в секунду: какие элементы лежат сверху в центре экрана
    // и в правой части (там открывается диалог «Выберите действие»).
    // Откройте диалог и подождите 1–2 секунды — в плашке появятся строки TOP.
    function scanTop() {
        if (!DEBUG || !document.elementsFromPoint) return;
        try {
            var pts = [[0.5, 0.5], [0.6, 0.3]];
            for (var p = 0; p < pts.length; p++) {
                var list = document.elementsFromPoint(window.innerWidth * pts[p][0], window.innerHeight * pts[p][1]);
                var parts = [];
                for (var i = 0; i < list.length && parts.length < 4; i++) {
                    var el = list[i];
                    if (el === dbgBox) continue;
                    var cs = getComputedStyle(el);
                    parts.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 45) +
                               ' [' + cs.backgroundColor + (cs.backdropFilter && cs.backdropFilter !== 'none' ? ' blur' : '') + ']');
                }
                var sig = 'TOP' + p + ' ' + parts.join(' > ');
                if (!seenBg[sig]) { seenBg[sig] = true; dbg(sig); }
            }
        } catch (e) {}
    }

    // ===== Скрытие лишних кнопок на экране фильма =====
    // Кнопки с такой точной надписью скрываются (кроме Торренты и Избранное)
    var HIDE_BUTTON_TEXTS = ['смотреть', 'подписаться'];
    // Кнопки с такими классами скрываются (три точки, колокольчик, онлайн)
    var HIDE_BUTTON_CLASSES = ['button--options', 'button--subscribe', 'view--online'];
    // Эти кнопки не трогаются никогда
    var KEEP_BUTTON_CLASSES = ['view--torrent', 'button--book'];
    var BUTTONS_BOX = '.full-start__buttons, .full-start-new__buttons';

    // ===== Кнопки верхней панели =====
    // open--broadcast — значок «Открыть карточку на другом устройстве» (появляется на экране фильма)
    // black-friday__button — молния в верхней панели (и её вариант --animation)
    var HIDE_HEAD_CLASSES = ['open--broadcast', 'black-friday__button'];

    // ===== Вкладка «AI-ассистент» в поиске =====
    // Скрывается только элемент, у которого весь текст — «AI-ассистент»
    var HIDE_TAB_REGEX = /^ai[\s\-\u2013\u2014]*асс?истент$/i;

    // Всегда показывать надписи у кнопок («Торренты», «Избранное»), а не только при наведении
    var SHOW_LABELS = true;

    // Боковые панели и окна (настройки, избранное, фильтр, «О приложении», окно аккаунта,
    // консоль, диалог «Выберите действие») — чёрные, а не серые
    var BLACK_PANELS = true;

    // Все правила стилей — одним блоком
    var css = '.' + CLASS + ',[class*="black-friday"]';
    for (var q = 0; q < HIDE_HEAD_CLASSES.length; q++) css += ',.head .' + HIDE_HEAD_CLASSES[q];
    css += ' { display: none !important; }';
    if (SHOW_LABELS) {
        css += '.full-start__buttons .full-start__button span,' +
               '.full-start-new__buttons .full-start__button span {' +
               ' display: inline !important; opacity: 1 !important;' +
               ' visibility: visible !important; max-width: none !important;' +
               ' width: auto !important; }';
    }
    if (BLACK_PANELS) {
        // Контейнеры окон: настройки, выбор (selectbox), модальные окна, уведомления
        css += 'body .settings__content, body .selectbox__content, body .selectbox__body,' +
               ' body .selectbox__scroll, body .modal__content, body .notice__content,' +
               // Консоль (точные имена классов зависят от версии Lampa, поэтому по части имени)
               ' body .console, body [class*="console__content"], body [class*="console__body"],' +
               ' body [class*="console__wrap"], body [class*="console__layer"],' +
               ' body [class*="console__window"], body [class*="console__panel"],' +
               ' body [class*="console__list"], body [class*="console__sidebar"] {' +
               ' background: #000 !important; background-color: #000 !important;' +
               ' background-image: none !important;' +
               ' -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }' +
               'body .settings__head, body .selectbox__head, body [class*="console__head"] {' +
               ' background: transparent !important; }';
    }
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Заставляет Lampa заново собрать элементы для курсора,
    // чтобы он не "залипал" на скрытой полосе.
    function refreshController() {
        try {
            if (window.Lampa && Lampa.Controller) {
                var current = Lampa.Controller.enabled && Lampa.Controller.enabled();
                if (current && current.name) Lampa.Controller.toggle(current.name);
            }
        } catch (e) {}
    }

    function matchesText(text) {
        if (!text || text.length > 60) return false;
        for (var j = 0; j < TEXTS.length; j++) {
            if (text.indexOf(TEXTS[j]) !== -1) return true;
        }
        return false;
    }

    // Кнопка верхней панели из списка на скрытие (сначала дешёвая проверка по классу)
    function isHeadTarget(el) {
        var cls = el.className;
        if (typeof cls !== 'string') return false;
        var hit = cls.indexOf('black-friday') !== -1;
        for (var h = 0; !hit && h < HIDE_HEAD_CLASSES.length; h++) {
            if (el.classList.contains(HIDE_HEAD_CLASSES[h])) hit = true;
        }
        return hit && !!el.closest && !!el.closest('.head');
    }

    function shouldHideTab(text) {
        return HIDE_TAB_REGEX.test(text);
    }

    // text — уже приведённый к нижнему регистру текст элемента
    function shouldHideButton(el, text) {
        if (!el.closest || !el.closest(BUTTONS_BOX)) return false;
        var c;
        for (c = 0; c < KEEP_BUTTON_CLASSES.length; c++) {
            if (el.classList.contains(KEEP_BUTTON_CLASSES[c])) return false;
        }
        if (text.indexOf('торрент') !== -1 || String(el.className).toLowerCase().indexOf('torrent') !== -1) return false;
        for (c = 0; c < HIDE_BUTTON_CLASSES.length; c++) {
            if (el.classList.contains(HIDE_BUTTON_CLASSES[c])) return true;
        }
        for (var k = 0; k < HIDE_BUTTON_TEXTS.length; k++) {
            if (text === HIDE_BUTTON_TEXTS[k]) return true;
        }
        return false;
    }

    function hideEl(el) {
        el.classList.remove('selector', 'focus', 'hover'); // курсор её больше не касается
        el.classList.add(CLASS);                           // и она не занимает место
        return true;
    }

    function checkEl(el) {
        var cl = el.classList;
        if (!cl) return false;
        if (cl.contains(CLASS)) {
            // уже скрыта; если Lampa вернула ей selector — снова убираем, чтобы курсор не залипал
            if (cl.contains('selector')) { cl.remove('selector', 'focus', 'hover'); return true; }
            return false;
        }
        if (isHeadTarget(el)) return hideEl(el);
        if (!cl.contains('selector')) return false;
        // текст читаем один раз и используем во всех проверках
        var text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (matchesText(text) || shouldHideButton(el, text) || shouldHideTab(text)) return hideEl(el);
        return false;
    }

    function checkTree(root) {
        if (!root || root.nodeType !== 1) return false;
        var hidden = checkEl(root);
        var nodes = root.querySelectorAll('.selector, .head__action');
        for (var i = 0; i < nodes.length; i++) {
            if (checkEl(nodes[i])) hidden = true;
        }
        return hidden;
    }

    // ===== Заголовок «Главная - CUB» → «Главная» =====
    // Убирает « - CUB» (и «– CUB», «— CUB») в конце заголовка в верхней панели
    var TITLE_REGEX = /\s*[-\u2013\u2014]\s*CUB\s*$/i;

    function fixHeadTitle() {
        var titles = document.querySelectorAll('.head__title');
        for (var i = 0; i < titles.length; i++) {
            var el = titles[i];
            if (!TITLE_REGEX.test(el.textContent || '')) continue;
            dbg('title fixed: "' + (el.textContent || '') + '"');
            var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            var node;
            while ((node = walker.nextNode())) {
                if (TITLE_REGEX.test(node.nodeValue)) {
                    node.nodeValue = node.nodeValue.replace(TITLE_REGEX, '');
                }
            }
            // запасной вариант: текст разбит на несколько узлов
            if (TITLE_REGEX.test(el.textContent || '') && !el.children.length) {
                el.textContent = el.textContent.replace(TITLE_REGEX, '');
            }
        }
    }

    // Колбэк MutationObserver срабатывает ДО отрисовки кадра,
    // поэтому лишнее скрывается мгновенно и не успевает мелькнуть.
    // Изменения собираем за весь пакет и каждый элемент проверяем один раз.
    var observer = new MutationObserver(function (mutations) {
        var hidden = false;
        var roots = [], sels = [];
        var real = false;
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            if (dbgBox && dbgBox.contains(m.target)) continue; // свои сообщения отладки не разбираем
            real = true;
            if (m.type === 'attributes') { // сменился класс (например, добавилась анимация)
                var tg = m.target;
                if (tg && tg.nodeType === 1 && tg.classList && tg.classList.contains('head__action') && checkEl(tg)) hidden = true;
                continue;
            }
            for (var k = 0; k < m.addedNodes.length; k++) {
                if (m.addedNodes[k].nodeType === 1 && m.addedNodes[k] !== dbgBox) roots.push(m.addedNodes[k]);
            }
            // текст мог появиться внутри уже существующего элемента
            var t = m.target && (m.target.nodeType === 1 ? m.target : m.target.parentElement);
            var s = t && t.closest ? t.closest('.selector') : null;
            if (s && !s._hhbQ) { s._hhbQ = true; sels.push(s); }
        }
        var r;
        for (r = 0; r < roots.length; r++) {
            if (checkTree(roots[r])) hidden = true;
        }
        for (r = 0; r < sels.length; r++) {
            sels[r]._hhbQ = false;
            if (checkEl(sels[r])) hidden = true;
        }
        fixHeadTitle();
        if (DEBUG && real) scheduleScan();
        if (hidden) refreshController();
    });


    function start() {
        if (checkTree(document.body)) refreshController();
        fixHeadTitle();
        dbg('hide_history_bar запущен, .head__title найдено: ' + document.querySelectorAll('.head__title').length);
        try { if (DEBUG && window.Lampa && Lampa.Noty) Lampa.Noty.show('hide_history_bar: загружен'); } catch (e) {}
        if (DEBUG) { scheduleScan(); setInterval(scanTop, 1000); }
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    } else document.addEventListener('DOMContentLoaded', start);
})();
