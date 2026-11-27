(function () {
    'use strict';

    // Защита от повторного запуска: второй экземпляр не создаёт новых наблюдателей и стилей
    if (window.__hhbLoaded) return;
    window.__hhbLoaded = true;

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

    // Прятать колесо загрузки в центре экрана (при переходе по вкладкам и разделам)
    var HIDE_LOADER = true;

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
               ' background-image: none !important; }' +
               'body .settings__head {' +
               ' background: transparent !important; }';
    }
    if (HIDE_LOADER) {
        css += '.activity__loader { display: none !important; }';
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

    // ===== Заголовок «Главная - CUB» / «Главная - TMDB» → «Главная» =====
    // Убирает « - CUB» и « - TMDB» (и с тире «–», «—») в конце заголовка в верхней панели
    var TITLE_REGEX = /\s*[-\u2013\u2014]\s*(?:CUB|TMDB)\s*$/i;

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
                if (!headChanged && roots[r].classList &&
                    (roots[r].classList.contains('head') || roots[r].classList.contains('head__title'))) headChanged = true;
            }
            for (r = 0; r < sels.length; r++) {
                sels[r]._hhbQ = false;
                if (checkEl(sels[r])) hidden = true;
            }
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
    }

    // ===== Блоки «Метаданные» и «Настроения» на экране фильма =====
    // Событие приходит до того, как Lampa собирает ряды карточки.
    // Убираем данные, и эти ряды не создаются (пульту не на чем залипать).
    function followMetadata() {
        if (!window.Lampa || !Lampa.Listener) return setTimeout(followMetadata, 200);
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'start' && e.data) delete e.data.metadata;
        });
    }

    followMetadata();

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    } else document.addEventListener('DOMContentLoaded', start);
})();
