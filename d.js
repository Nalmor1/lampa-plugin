(function () {
    'use strict';
    // ВРЕМЕННАЯ диагностика: когда появляется панель «Получение информации» / «TorrServe»,
    // показывает в левом верхнем углу названия её классов. Потом плагин удаляется.
    if (window.__diagPanelLoaded) return;
    window.__diagPanelLoaded = true;

    var RX = /получение информации|информации о торренте|torrserve/i;
    var BOX_ID = 'diag-panel-box';
    var timer = null, hideTimer = null;

    function desc(el) {
        var cs = window.getComputedStyle(el);
        var cls = typeof el.className === 'string' ? el.className.trim().replace(/\s+/g, '.') : '';
        var extra = [];
        if (cs.position !== 'static') extra.push(cs.position);
        if (cs.animationName && cs.animationName !== 'none') extra.push('anim:' + cs.animationName);
        if (cs.transitionDuration && !/^0s(, 0s)*$/.test(cs.transitionDuration)) extra.push('tr:' + cs.transitionDuration);
        if (cs.transform && cs.transform !== 'none') extra.push('transform');
        return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + (extra.length ? ' [' + extra.join(', ') + ']' : '');
    }

    function scan() {
        timer = null;
        try {
            if (!document.body) return;
            var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            var node, lines = [], seen = {}, n = 0;
            while ((node = walker.nextNode()) && n < 4) {
                var txt = node.nodeValue || '';
                if (!RX.test(txt)) continue;
                var el = node.parentElement;
                if (!el || el.closest('#' + BOX_ID)) continue;
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
            if (lines.length) show(lines);
        } catch (e) {}
    }

    function show(lines) {
        var box = document.getElementById(BOX_ID);
        if (!box) {
            box = document.createElement('div');
            box.id = BOX_ID;
            box.style.cssText = 'position:fixed;left:0;top:0;max-width:95%;z-index:2147483647;' +
                'background:#000;color:#0f0;font:20px/1.25 monospace;padding:10px;white-space:pre-wrap;' +
                'word-break:break-all;pointer-events:none;border:2px solid #0f0;';
            document.body.appendChild(box);
        }
        box.textContent = lines.join('\n');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 30000);
    }

    var observer = new MutationObserver(function (mutations) {
        if (timer) return;
        for (var i = 0; i < mutations.length; i++) {
            var added = mutations[i].addedNodes;
            for (var k = 0; k < added.length; k++) {
                var nd = added[k];
                if (nd.nodeType !== 1 || nd.id === BOX_ID) continue;
                var t = nd.textContent || '';
                if (t.length < 3000 && RX.test(t)) {
                    timer = setTimeout(scan, 350); // дать панели дорисоваться
                    return;
                }
            }
        }
    });

    function start() {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
    } else document.addEventListener('DOMContentLoaded', start);
})();
