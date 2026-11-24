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
        if (!matches(el) && !shouldHideButton(el)) return false;
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


    // ===== Кнопка «Торренты» на экране фильма =====
    // Если в ряду кнопок нет видимой кнопки «Торренты», плагин добавляет свою
    // (перед «Избранным») и открывает по ней поиск торрентов для этого фильма.
    var ADD_TORRENT_BUTTON = false;

    function addTorrentButton(e) {
        if (!ADD_TORRENT_BUTTON || !e || e.type !== 'complite') return;
        try {
            var $ = window.$ || window.jQuery;
            var render = e.object.activity.render();
            var box = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!box.length) return;
            if (box.find('.view--torrent').not('.hide').length) return; // уже есть

            var card = (e.data && e.data.movie) || e.object.card;
            if (!card) return;

            // Значок в стиле µTorrent: круг цвета текста кнопки с «вырезанной» буквой «µ».
            // Цвет сам меняется вместе с кнопкой: светлый круг обычно, тёмный при наведении.
            var mu = '<path d="M11.5 9 V26"/>' +
                '<path d="M11.5 18.5 C11.5 22.5 14 24 17 24 C20 24 22.5 22.5 22.5 19 V9"/>' +
                '<path d="M22.5 19 V24.5 Q22.5 26 24.5 26"/>';
            var icon = '<svg width="34" height="34" viewBox="0 0 34 34">' +
                '<defs><mask id="hhb-mu" maskUnits="userSpaceOnUse" x="0" y="0" width="34" height="34">' +
                '<rect width="34" height="34" fill="#fff"/>' +
                '<g fill="none" stroke="#000" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">' +
                mu + '</g></mask></defs>' +
                '<circle cx="17" cy="17" r="16" fill="currentColor" mask="url(#hhb-mu)"/></svg>';
            var btn = $('<div class="full-start__button selector view--torrent">' + icon +
                '<span>Торренты</span></div>');

            btn.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: Lampa.Lang.translate('title_torrents'),
                    component: 'torrents',
                    search: card.title || card.name,
                    search_one: card.title || card.name,
                    search_two: card.original_title || card.original_name,
                    movie: card,
                    page: 1
                });
            });

            var book = box.find('.button--book').first();
            if (book.length) book.before(btn);
            else box.prepend(btn);

            setTimeout(refreshController, 0);

            // Подгоняем размер нашего значка под значок соседней кнопки (например, «Избранное»)
            setTimeout(function () {
                try {
                    var ref = box.find('.full-start__button').not(btn).find('svg').first();
                    var mine = btn.find('svg')[0];
                    if (!ref.length || !mine) return;
                    var r = ref[0].getBoundingClientRect();
                    var size = Math.round(Math.max(r.width, r.height));
                    if (size > 0) {
                        mine.style.width = size + 'px';
                        mine.style.height = size + 'px';
                    }
                } catch (e2) {}
            }, 400);
        } catch (err) {}
    }

    function start() {
        if (checkTree(document.body)) refreshController();
        observer.observe(document.body, { childList: true, subtree: true });
        try {
            if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('full', addTorrentButton);
        } catch (e) {}
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    } else document.addEventListener('DOMContentLoaded', start);
})();
