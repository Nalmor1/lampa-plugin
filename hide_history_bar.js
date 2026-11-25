(function () {
    'use strict';

    // Текст полосы, которую нужно скрыть (можно добавить другие варианты)
    var TEXTS = ['нет истории просмотра'];
    var CLASS = 'hhb-invisible';

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

    // Боковые панели и окна (настройки, избранное, фильтр, «О приложении», окно аккаунта) — чёрные, а не серые
    var BLACK_PANELS = true;

    // Все правила стилей — одним блоком
    var css = '.' + CLASS + ',.head [class*="black-friday"]';
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
               ' body .selectbox__scroll, body .modal__content, body .notice__content {' +
               ' background: #000 !important; background-color: #000 !important;' +
               ' background-image: none !important;' +
               ' -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }' +
               // Окна выбора: заголовок, список и пункты (кроме выбранного — он остаётся светлым)
               'body [class*="selectbox__"]:not(.focus):not(.hover),' +
               ' body .selectbox-item:not(.focus):not(.hover) {' +
               ' background: #000 !important; background-color: #000 !important;' +
               ' background-image: none !important; box-shadow: none !important;' +
               ' -webkit-backdrop-filter: none !important; backdrop-filter: none !important;' +
               ' filter: none !important; }' +
               'body .settings__head {' +
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
        if (cl.contains('card')) return false; // карточки фильмов: сотни штук, текст читать не нужно
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


    // ===== Чёрные диалоги по заголовку (например, «Выберите действие») =====
    // Плагин находит заголовок окна и делает чёрным само окно и все его блоки,
    // кроме выбранного пункта (он остаётся светлым, чтобы было видно курсор).
    // Названия классов знать не нужно.
    var BLACK_DIALOGS = ['выберите действие'];   // заголовки окон, маленькими буквами
    var DEBUG_DIALOG = true;                      // на 15 секунд показывает, что покрашено
    var dialogs = [];                             // [{title, els}]

    var dlgStyle = document.createElement('style');
    dlgStyle.textContent = '.hhb-black-d:not(.focus):not(.hover) {' +
        ' background: #000 !important; background-color: #000 !important;' +
        ' background-image: none !important; box-shadow: none !important;' +
        ' -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }';
    document.head.appendChild(dlgStyle);


    // Короткая надпись на экране для проверки (видно, что загрузилась именно эта версия плагина)
    var BUILD = 'build 21';
    function showNote(text, ms) {
        try {
            var old = document.getElementById('hhb-note');
            if (old && old.parentNode) old.parentNode.removeChild(old);
            var div = document.createElement('div');
            div.id = 'hhb-note';
            div.style.cssText = 'position:fixed;right:8px;top:8px;z-index:99999;max-width:60vw;' +
                'background:rgba(0,0,0,.9);color:#0f0;font:16px/1.3 monospace;padding:6px;' +
                'white-space:pre-wrap;pointer-events:none;';
            div.textContent = text;
            document.body.appendChild(div);
            setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, ms || 8000);
        } catch (e) {}
    }

    function hasBg(cs) {
        var bg = cs.backgroundColor;
        return (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') ||
               (cs.backgroundImage && cs.backgroundImage !== 'none');
    }

    function showDlgDebug(lines) {
        var old = document.getElementById('hhb-debug-dlg');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        var div = document.createElement('div');
        div.id = 'hhb-debug-dlg';
        div.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;max-width:95vw;' +
            'background:rgba(0,0,0,.9);color:#0f0;font:14px/1.3 monospace;padding:6px;' +
            'white-space:pre-wrap;pointer-events:none;';
        div.textContent = 'Окно: покрашено блоков ' + lines.length + '\n' + lines.join('\n');
        document.body.appendChild(div);
        setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 15000);
    }

    function cleanupDialogs() {
        for (var r = dialogs.length - 1; r >= 0; r--) {
            if (!document.documentElement.contains(dialogs[r].title)) {
                for (var e = 0; e < dialogs[r].els.length; e++) dialogs[r].els[e].classList.remove('hhb-black-d');
                dialogs.splice(r, 1);
            }
        }
    }

    // Красит окно по найденному заголовку. Возвращает true, если окно найдено (новое или уже покрашенное).
    function blackenFromTitle(titleEl) {
        if (!titleEl) return false;
        for (var k = 0; k < dialogs.length; k++) if (dialogs[k].title === titleEl) return true;

        // окно = ближайший блок вокруг заголовка, где есть хотя бы два пункта выбора
        var box = titleEl.parentElement;
        while (box && box !== document.body && box.querySelectorAll('.selector').length < 2) box = box.parentElement;
        if (!box || box === document.body) box = titleEl.parentElement && titleEl.parentElement.parentElement;
        if (!box) {
            if (DEBUG_DIALOG) showNote('Окно: не нашёл блок вокруг заголовка', 12000);
            return false;
        }

        var rec = { title: titleEl, els: [] };
        var lines = [];
        var list = [box].concat(Array.prototype.slice.call(box.querySelectorAll('*')));
        for (var i = 0; i < list.length; i++) {
            var el = list[i];
            if (!hasBg(window.getComputedStyle(el))) continue;
            el.classList.add('hhb-black-d');
            rec.els.push(el);
            lines.push(el.tagName.toLowerCase() + '.' + String(el.className).replace(/\s+/g, '.').slice(0, 60));
        }
        dialogs.push(rec);
        if (DEBUG_DIALOG) showDlgDebug(lines);
        return true;
    }

    // Окно, появившееся как новый блок на странице
    function blackenDialog(root) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var node;
        while ((node = walker.nextNode())) {
            var txt = (node.nodeValue || '').trim().toLowerCase();
            if (txt && BLACK_DIALOGS.indexOf(txt) !== -1) { blackenFromTitle(node.parentElement); return; }
        }
    }

    // Поиск окна по всей странице: нужен, если оно не добавляется как новый блок,
    // а появляется другим способом (например, показывается уже готовое).
    function scanDialogs() {
        var found = false;
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        var node;
        while ((node = walker.nextNode())) {
            var txt = (node.nodeValue || '').trim().toLowerCase();
            if (txt && BLACK_DIALOGS.indexOf(txt) !== -1 && blackenFromTitle(node.parentElement)) found = true;
        }
        return found;
    }

    // Окно выхода появляется при долгом нажатии «Назад»: после такого нажатия
    // несколько секунд ищем окно по странице.
    var BACK_KEYS = [4, 8, 27, 166, 461, 10009];
    var scanRun = null, sawRepeat = false;
    function onBackKey(e) {
        if (BACK_KEYS.indexOf(e.keyCode) === -1) return;
        if (e.repeat) sawRepeat = true;
        if (scanRun) return;
        var n = 0, foundInRun = false;
        scanRun = setInterval(function () {
            n++;
            try { if (scanDialogs()) foundInRun = true; } catch (err) {}
            if (n >= 12) {
                clearInterval(scanRun);
                scanRun = null;
                if (DEBUG_DIALOG && sawRepeat && !foundInRun) {
                    showNote('Окно: после долгого «Назад» заголовок не найден на странице', 8000);
                }
                sawRepeat = false;
            }
        }, 300);
    }

    // Колбэк MutationObserver срабатывает ДО отрисовки кадра,
    // поэтому лишнее скрывается мгновенно и не успевает мелькнуть.
    // Изменения собираем за весь пакет и каждый элемент проверяем один раз.
    var observer = new MutationObserver(function (mutations) {
        try {
            var hidden = false;
            var roots = [], sels = [];
            var headChanged = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                for (var k = 0; k < m.addedNodes.length; k++) {
                    if (m.addedNodes[k].nodeType === 1) roots.push(m.addedNodes[k]);
                }
                // текст мог появиться внутри уже существующего элемента
                var t = m.target && (m.target.nodeType === 1 ? m.target : m.target.parentElement);
                var s = t && t.closest ? t.closest('.selector') : null;
                if (s && !s._hhbQ) { s._hhbQ = true; sels.push(s); }
                // менялась ли верхняя панель (только тогда нужно поправлять заголовок)
                if (!headChanged && t && t.closest && t.closest('.head, .head__title')) headChanged = true;
            }
            var r;
            for (r = 0; r < roots.length; r++) {
                if (checkTree(roots[r])) hidden = true;
                if (roots[r].childElementCount <= 30) {
                    var dtxt = (roots[r].textContent || '').toLowerCase();
                    if (dtxt.length < 600) {
                        for (var d = 0; d < BLACK_DIALOGS.length; d++) {
                            if (dtxt.indexOf(BLACK_DIALOGS[d]) !== -1) { blackenDialog(roots[r]); break; }
                        }
                    }
                }
                if (!headChanged && roots[r].classList &&
                    (roots[r].classList.contains('head') || roots[r].classList.contains('head__title'))) headChanged = true;
            }
            for (r = 0; r < sels.length; r++) {
                sels[r]._hhbQ = false;
                if (checkEl(sels[r])) hidden = true;
            }
            cleanupDialogs();
            if (headChanged) fixHeadTitle();
            attachHeadObserver();
            if (hidden) refreshController();
        } catch (err) {}
    });

    // Верхняя панель: следим за сменой классов (например, добавилась анимация или вернулся selector).
    // Только она, а не весь экран, чтобы не реагировать на каждое движение курсора.
    var headObserver = new MutationObserver(function (mutations) {
        try {
            var hidden = false;
            for (var i = 0; i < mutations.length; i++) {
                var tg = mutations[i].target;
                if (tg && tg.nodeType === 1 && tg.classList && tg.classList.contains('head__action') && checkEl(tg)) hidden = true;
            }
            if (hidden) refreshController();
        } catch (err) {}
    });
    var headWatched = null;

    function attachHeadObserver() {
        var head = document.querySelector('.head');
        if (!head || head === headWatched) return;
        headObserver.disconnect();
        headObserver.observe(head, { subtree: true, attributes: true, attributeFilter: ['class'] });
        headWatched = head;
    }

    function start() {
        if (checkTree(document.body)) refreshController();
        fixHeadTitle();
        observer.observe(document.body, { childList: true, subtree: true });
        attachHeadObserver();
        window.addEventListener('keydown', onBackKey, true);
        if (DEBUG_DIALOG) showNote('Плагин загружен: ' + BUILD, 8000);
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    } else document.addEventListener('DOMContentLoaded', start);
})();
