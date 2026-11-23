(function () {
    'use strict';

    // Текст полосы, которую нужно скрыть (можно добавить другие варианты)
    var TEXTS = ['нет истории просмотра'];
    var CLASS = 'hhb-invisible';

    // Полоса полностью убирается: не видна, не занимает место, курсор её пропускает.
    var style = document.createElement('style');
    style.textContent = '.' + CLASS + ' { display: none !important; }';
    document.head.appendChild(style);

    function check(root) {
        var nodes = root.querySelectorAll ? root.querySelectorAll('.selector') : [];
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el.classList.contains(CLASS)) continue;
            var text = (el.textContent || '').trim().toLowerCase();
            if (text.length > 60) continue; // пропускаем большие блоки
            for (var j = 0; j < TEXTS.length; j++) {
                if (text.indexOf(TEXTS[j]) !== -1) {
                    el.classList.remove('selector'); // курсор её больше не касается
                    el.classList.add(CLASS);         // и она не занимает место
                    break;
                }
            }
        }
    }

    var timer = null;
    var observer = new MutationObserver(function () {
        if (timer) return;
        timer = setTimeout(function () {
            timer = null;
            check(document.body);
        }, 100);
    });

    function start() {
        check(document.body);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    } else document.addEventListener('DOMContentLoaded', start);
})();
