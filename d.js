(function () {
    'use strict';
    // ВРЕМЕННАЯ диагностика: ищет на экране панель «Получение информации» / «TorrServe»
    // и показывает в левом верхнем углу названия её классов. Потом плагин удаляется.
    if (window.__diagPanelLoaded) return;
    window.__diagPanelLoaded = true;

    var RX = /получение информации|информации о торренте|torrserve\s*matrix/i;
    var BOX_ID = 'diag-panel-box';
    var mutedUntil = 0, hideTimer = null;

    function box() {
        var b = document.getElementById(BOX_ID);
        if (!b) {
            b = document.createElement('div');
            b.id = BOX_ID;
            b.style.cssText = 'position:fixed;left:0;top:0;max-width:95%;z-index:2147483647;' +
                'background:#000;color:#0f0;font:20px/1.25 monospace;padding:10px;white-space:pre-wrap;' +
                'word-break:break-all;pointer-events:none;border:2px solid #0f0;';
            document.body.appendChild(b);
        }
        return b;
    }

    function show(text, ms) {
        var b = box();
        b.textContent = text;
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, ms);
    }

    function desc(el) {
        var cs = window.getComputedStyle(el);
        var cls = typeof el.className === 'string' ? el.className.trim().replace(/\s+/g, '.') : '';
        var extra = [];
        if (cs.position !== 'static') extra.push(cs.position);
        if (cs.display === 'none') extra.push('display:none');
        if (cs.animationName && cs.animationName !== 'none') extra.push('anim:' + cs.animationName);
        if (cs.transitionDuration && !/^0s(, 0s)*$/.test(cs.transitionDuration)) extra.push('tr:' + cs.transitionDuration);
        if (cs.transform && cs.transform !== 'none') extra.push('transform');
        return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + (extra.length ? ' [' + extra.join(', ') + ']' : '');
    }

    function scan() {
        try {
            if (!document.body || Date.now() < mutedUntil) return;
            var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            var node, lines = [], seen = {}, n = 0;
            while ((node = walker.nextNode()) && n < 4) {
                var txt = node.nodeValue || '';
                if (!RX.test(txt)) continue;
                var el = node.parentElement;
                if (!el || el.closest('#' + BOX_ID)) continue;
                // скрытые элементы и меню настроек пропускаем: там такие слова лежат всегда
                if (el.closest('.settings, .settings__body, .settings-folder')) continue;
                if (!el.getClientRects().length) continue;
                var key = txt.trim().slice(0, 40);
                if (seen[key]) continue;
                seen[key] = true;
                n++;
                lines.push('Текст: «' + key + '»');
                var depth = 0;
                while (el && el !== document.body && depth < 7) {
                    lines.push('  ' + desc(el));
                    el = el.parentElement;
                    depth++;
                }
            }
            if (lines.length) {
                mutedUntil = Date.now() + 35000;
                show(lines.join('\n'), 30000);
            }
        } catch (e) {}
    }

    function start() {
        show('d.js загружен: жду панель «Получение информации»', 6000);
        setInterval(scan, 700);
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
    } else document.addEventListener('DOMContentLoaded', start);
})();
