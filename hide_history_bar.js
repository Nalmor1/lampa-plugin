(function () {
    'use strict';

    // Текст полосы, которую нужно скрыть (можно добавить другие варианты)
    var TEXTS = ['нет истории просмотра'];
    var CLASS = 'hhb-invisible';

    var style = document.createElement('style');
    style.textContent = '.' + CLASS + ' { display: none !important; }';
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

    function checkEl(el) {
        if (!el.classList || el.classList.contains(CLASS)) return false;
        if (!el.classList.contains('selector')) return false;
        if (!matches(el)) return false;
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
    var ADD_TORRENT_BUTTON = true;

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

            var icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">' +
                '<path d="M11 3h2v10.17l3.59-3.58L18 11l-6 6-6-6 1.41-1.41L11 13.17V3zM5 19h14v2H5z"/></svg>';
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
