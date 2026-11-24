(function () {
    'use strict';

    // Текст полосы, которую нужно скрыть (можно добавить другие варианты)
    var TEXTS = ['нет истории просмотра'];
    var CLASS = 'hhb-invisible';

    var style = document.createElement('style');
    // Всегда показывать надписи у кнопок («Торренты», «Избранное»), а не только при наведении
    var SHOW_LABELS = true;
    var css = '.' + CLASS + ' { display: none !important; }';
    if (SHOW_LABELS) {
        css += '.full-start__buttons .full-start__button span,' +
               '.full-start-new__buttons .full-start__button span {' +
               ' display: inline !important; opacity: 1 !important;' +
               ' visibility: visible !important; max-width: none !important;' +
               ' width: auto !important; }';
    }
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

    function matches(el) {
        var text = (el.textContent || '').trim().toLowerCase();
        if (!text || text.length > 60) return false;
        for (var j = 0; j < TEXTS.length; j++) {
            if (text.indexOf(TEXTS[j]) !== -1) return true;
        }
        return false;
    }


    // ===== Скрытие лишних кнопок на экране фильма =====
    // Кнопки с такой точной надписью скрываются (кроме Торренты и Избранное)
    var HIDE_BUTTON_TEXTS = ['смотреть', 'подписаться'];
    // Кнопки с такими классами скрываются (три точки, колокольчик, онлайн)
    var HIDE_BUTTON_CLASSES = ['button--options', 'button--subscribe', 'view--online'];
    // Эти кнопки не трогаются никогда
    var KEEP_BUTTON_CLASSES = ['view--torrent', 'button--book'];
    var BUTTONS_BOX = '.full-start__buttons, .full-start-new__buttons';

    // ===== Кнопки верхней панели (поиск, молния, колокольчик и т.д.) =====
    // Сюда впишем классы кнопок, которые нужно скрыть (после диагностики).
    // open--broadcast — значок «Открыть карточку на другом устройстве» (появляется на экране фильма)
    var HIDE_HEAD_CLASSES = ['open--broadcast'];
    // Временная диагностика: показывает на экране классы всех кнопок верхней панели.
    // Когда классы узнаем — поставить false.
    var DEBUG_HEAD = true;

    function shouldHideHead(el) {
        if (!el.closest || !el.closest('.head')) return false;
        for (var h = 0; h < HIDE_HEAD_CLASSES.length; h++) {
            if (el.classList.contains(HIDE_HEAD_CLASSES[h])) return true;
        }
        return false;
    }

    function startDebugHead() {
        var box = document.createElement('div');
        box.style.cssText = 'position:fixed;top:12%;left:2%;z-index:99999;' +
            'background:rgba(0,0,0,.9);color:#fff;font:22px/1.4 monospace;' +
            'padding:12px 16px;border-radius:8px;white-space:pre;pointer-events:none;';
        document.body.appendChild(box);
        setInterval(function () {
            var list = document.querySelectorAll('.head .head__action, .head .selector');
            var seen = [], lines = ['КНОПКИ ВЕРХНЕЙ ПАНЕЛИ:'];
            for (var d = 0; d < list.length; d++) {
                if (seen.indexOf(list[d]) !== -1) continue;
                seen.push(list[d]);
                lines.push((seen.length) + '. ' + String(list[d].className).replace(/\s+/g, ' ') +
                    (list[d].classList.contains(CLASS) ? '   [СКРЫТА]' : ''));
            }
            box.textContent = lines.join('\n');
        }, 1500);
    }

    function shouldHideButton(el) {
        if (!el.closest || !el.closest(BUTTONS_BOX)) return false;
        var c;
        for (c = 0; c < KEEP_BUTTON_CLASSES.length; c++) {
            if (el.classList.contains(KEEP_BUTTON_CLASSES[c])) return false;
        }
        var text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (text.indexOf('торрент') !== -1 || String(el.className).toLowerCase().indexOf('torrent') !== -1) return false;
        for (c = 0; c < HIDE_BUTTON_CLASSES.length; c++) {
            if (el.classList.contains(HIDE_BUTTON_CLASSES[c])) return true;
        }
        for (var k = 0; k < HIDE_BUTTON_TEXTS.length; k++) {
            if (text === HIDE_BUTTON_TEXTS[k]) return true;
        }
        return false;
    }

    function checkEl(el) {
        if (!el.classList || el.classList.contains(CLASS)) return false;
        if (!el.classList.contains('selector')) return false;
        if (!matches(el) && !shouldHideButton(el) && !shouldHideHead(el)) return false;
        el.classList.remove('selector', 'focus', 'hover'); // курсор её больше не касается
        el.classList.add(CLASS);                           // и она не занимает место
        return true;
    }

    function checkTree(root) {
        if (!root || root.nodeType !== 1) return false;
        var hidden = checkEl(root);
        var nodes = root.querySelectorAll('.selector');
        for (var i = 0; i < nodes.length; i++) {
            if (checkEl(nodes[i])) hidden = true;
        }
        return hidden;
    }

    // Колбэк MutationObserver срабатывает ДО отрисовки кадра,
    // поэтому полоса скрывается мгновенно и не успевает мелькнуть.
    var observer = new MutationObserver(function (mutations) {
        var hidden = false;
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            for (var k = 0; k < m.addedNodes.length; k++) {
                if (checkTree(m.addedNodes[k])) hidden = true;
            }
            // текст мог появиться внутри уже существующей полосы
            var t = m.target && (m.target.nodeType === 1 ? m.target : m.target.parentElement);
            var s = t && t.closest ? t.closest('.selector') : null;
            if (s && checkEl(s)) hidden = true;
        }
        if (hidden) refreshController();
    });


    function start() {
        if (checkTree(document.body)) refreshController();
        observer.observe(document.body, { childList: true, subtree: true });
        if (DEBUG_HEAD) startDebugHead();
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    } else document.addEventListener('DOMContentLoaded', start);
})();
