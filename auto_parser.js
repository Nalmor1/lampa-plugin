(function () {
    'use strict';

    // Автовыбор парсера: проверяет адреса по скорости ответа и ставит самый быстрый живой
    // в обычную настройку Lampa (Настройки → Парсер).
    var HOSTS = ['jacred.stream', 'jacred.su', 'jac.red'];
    var TIMEOUT = 5000;           // мс; дольше — считаем адрес неживым
    var CACHE_MS = 5 * 60 * 1000; // как часто можно перепроверять
    var SWITCH_RATIO = 0.7;       // менять текущий адрес, только если новый быстрее минимум на 30%
    var KEY_ENABLE = 'autoparser_enable';
    var KEY_INFO = 'autoparser_info';

    var lastRun = 0;
    var running = false;

    function enabled() {
        return Lampa.Storage.get(KEY_ENABLE, true) !== false && Lampa.Storage.get(KEY_ENABLE, true) !== 'false';
    }

    function probe(host, done) {
        var start = Date.now();
        var finished = false;
        var xhr = new XMLHttpRequest();
        function end(ok) {
            if (finished) return;
            finished = true;
            done({ host: host, ok: ok, ms: Date.now() - start });
        }
        try {
            xhr.open('GET', 'https://' + host + '/api/v2.0/indexers/status:healthy/results?apikey=', true);
            xhr.timeout = TIMEOUT;
            xhr.onload = function () { end(xhr.status >= 200 && xhr.status < 300); };
            xhr.onerror = function () { end(false); };
            xhr.ontimeout = function () { end(false); };
            xhr.send();
        } catch (e) { end(false); }
    }

    function currentHost() {
        var url = String(Lampa.Storage.get('jackett_url', '') || '');
        return url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    }

    function apply(host) {
        Lampa.Storage.set('parser_use', true);
        Lampa.Storage.set('parser_torrent_type', 'jackett');
        Lampa.Storage.set('jackett_url', 'https://' + host);
        Lampa.Storage.set('jackett_key', '');
    }

    function run(force) {
        if (running || !enabled()) return;
        if (!force && Date.now() - lastRun < CACHE_MS) return;
        running = true;
        var results = [];
        var left = HOSTS.length;
        HOSTS.forEach(function (host) {
            probe(host, function (r) {
                results.push(r);
                if (--left === 0) finish(results);
            });
        });
    }

    function finish(results) {
        running = false;
        lastRun = Date.now();
        try {
            var alive = results.filter(function (r) { return r.ok; })
                .sort(function (a, b) { return a.ms - b.ms; });
            var info = results.map(function (r) {
                return r.host + ': ' + (r.ok ? r.ms + ' мс' : 'нет ответа');
            }).join(' · ');
            Lampa.Storage.set(KEY_INFO, info);
            if (!alive.length) return; // все молчат — ничего не трогаем
            var best = alive[0];
            var cur = currentHost();
            var curRes = null;
            for (var i = 0; i < results.length; i++) if (results[i].host === cur) curRes = results[i];
            // остаёмся на текущем, если он жив и новый не заметно быстрее
            if (curRes && curRes.ok && best.ms > curRes.ms * SWITCH_RATIO) return;
            if (best.host !== cur) apply(best.host);
        } catch (e) {}
    }

    function addSettings() {
        Lampa.SettingsApi.addParam({
            component: 'parser',
            param: { name: KEY_ENABLE, type: 'trigger', 'default': true },
            field: {
                name: 'Автовыбор парсера',
                description: 'Сам выбирает самый быстрый из: ' + HOSTS.join(', ')
            },
            onChange: function (value) {
                if (value === true || value === 'true') run(true);
            },
            onRender: function (item) {
                try {
                    var info = Lampa.Storage.get(KEY_INFO, '');
                    var d = item.find('.settings-param__descr');
                    if (d.length && info) d.append('<div>' + info + '</div>');
                } catch (e) {}
            }
        });
    }

    function start() {
        try { addSettings(); } catch (e) {}
        run(true);
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' && (e.component === 'torrents' || e.component === 'main')) run(false);
        });
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });
})();
