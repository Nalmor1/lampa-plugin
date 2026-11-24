(function () {
    'use strict';

    // ===== НАСТРОЙКИ =====

    // 1) Строки с таким текстом скрываются полностью
    var TEXTS = ['нет истории просмотра'];

    // 2) На экране фильма в ряду кнопок остаются ТОЛЬКО кнопки с этими словами.
    //    Всё остальное (Смотреть, Подписаться, три точки и т.д.) скрывается.
    //    Чтобы оставить ещё одну кнопку, добавьте слово из её названия.
    var KEEP_BUTTONS = ['торрент', 'избранн'];

    // 3) Кнопки без надписи (например, три точки), которые скрываются по названию класса
    var HIDE_BUTTON_CLASSES = ['button--options', 'button--subscribe', 'button--more'];

    // 4) Всегда показывать надписи у оставшихся кнопок (true) или как раньше (false)
    var SHOW_LABELS = true;

    // ======================

    var CLASS = 'hhb-invisible';
    var BUTTONS_BOX = '.full-start__buttons, .full-start-new__buttons';

    var css = '.' + CLASS + ' { display: none !important; }';
    if (SHOW_LABELS) {
        css += '.full-start__buttons .full-start__button span,' +
               '.full-start-new__buttons .full-start__button span {' +
               ' display: inline !important; opacity: 1 !important;' +
               ' visibility: visible !important; max-width: none !important;' +
               ' width: auto !important; }';
    }
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Заставляет Lampa заново собрать элементы для курсора,
    // чтобы он не "залипал" на скрытых элементах.
    function refreshController() {
        try {
            if (window.Lampa && Lampa.Controller) {
                var current = Lampa.Controller.enabled && Lampa.Controller.enabled();
                if (current && current.name) Lampa.Controller.toggle(current.name);
            }
        } catch (e) {}
    }

    function getText(el) {
        return (el.textContent || '').trim().toLowerCase();
    }

    function isHistoryBar(el) {
        var text = getText(el);
        if (!text || text.length > 60) return false;
        for (var j = 0; j < TEXTS.length; j++) {
            if (text.indexOf(TEXTS[j]) !== -1) return true;
        }
        return false;
    }

    function shouldHideButton(el) {
        if (!el.closest || !el.closest(BUTTONS_BOX)) return false;

        for (var c = 0; c < HIDE_BUTTON_CLASSES.length; c++) {
            if (el.classList.contains(HIDE_BUTTON_CLASSES[c])) return true;
        }

        var text = getText(el);
        if (!text) return false; // без надписи и без известного класса не трогаем

        for (var k = 0; k < KEEP_BUTTONS.length; k++) {
            if (text.indexOf(KEEP_BUTTONS[k]) !== -1) return false;
        }
        return true;
    }

    function hide(el) {
        el.classList.remove('selector', 'focus', 'hover'); // курсор её больше не касается
        el.classList.add(CLASS);                           // и она не занимает место
        return true;
    }

    function checkEl(el) {
        if (!el.classList || el.classList.contains(CLASS)) return false;
        if (!el.classList.contains('selector')) return false;
        if (isHistoryBar(el) || shouldHideButton(el)) return hide(el);
        return false;
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
    // поэтому элементы скрываются мгновенно и не успевают мелькнуть.
    var observer = new MutationObserver(function (mutations) {
        var hidden = false;
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            for (var k = 0; k < m.addedNodes.length; k++) {
                if (checkTree(m.addedNodes[k])) hidden = true;
            }
            var t = m.target && (m.target.nodeType === 1 ? m.target : m.target.parentElement);
            var s = t && t.closest ? t.closest('.selector') : null;
            if (s && checkEl(s)) hidden = true;
        }
        if (hidden) refreshController();
    });

    function start() {
        if (checkTree(document.body)) refreshController();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    } else document.addEventListener('DOMContentLoaded', start);
})();
