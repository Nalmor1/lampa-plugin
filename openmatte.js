(function () {
  'use strict';

  if (window.plugin_openmatte_ready) return;
  window.plugin_openmatte_ready = true;

  var KEY = 'openmatte_filter';
  var RE = /open[\s._\-]*matte|web[\s._\-]*dl/i;
  var DEBUG = true; // показывает всплывающие подсказки для диагностики

  function isOn() {
    return Lampa.Storage.get(KEY, 'false') === 'true';
  }

  function setOn(v) {
    Lampa.Storage.set(KEY, v ? 'true' : 'false');
  }

  function norm(t) {
    return String(t || '').toLowerCase().replace(/\s+/g, '');
  }

  // 1. Фильтрация результатов поиска торрентов
  function patchParser() {
    if (!Lampa.Parser || !Lampa.Parser.get) return;
    var origGet = Lampa.Parser.get;

    Lampa.Parser.get = function (params, oncomplite, onerror) {
      return origGet.call(this, params, function (json) {
        try {
          if (isOn() && json && Array.isArray(json.Results)) {
            json.Results = json.Results.filter(function (t) {
              return RE.test(t.Title || t.title || '');
            });
          }
        } catch (e) {}
        oncomplite(json);
      }, onerror);
    };
  }

  // 2. Пункт «Open Matte» в меню «Качество»
  function ensureItem(items) {
    var found = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].openmatte) found = items[i];
    }
    if (found) found.checked = isOn();
    else items.push({
      title: 'Open Matte',
      checkbox: true,
      checked: isOn(),
      openmatte: true
    });
  }

  function wrapCallbacks(object) {
    if (object.__om) return;
    object.__om = true;

    var changed = false;
    var origCheck = object.onCheck;
    var origBack = object.onBack;

    object.onCheck = function (a) {
      if (a && a.openmatte) {
        setOn(!!a.checked);
        changed = true;
      } else if (origCheck) {
        return origCheck.apply(this, arguments);
      }
    };

    object.onBack = function () {
      if (origBack) origBack.apply(this, arguments);
      if (changed) {
        changed = false;
        setTimeout(function () {
          try {
            Lampa.Activity.replace();
          } catch (e) {
            Lampa.Noty.show('Open Matte: зайдите в список торрентов заново');
          }
        }, 150);
      }
    };
  }

  function patchSelect() {
    if (!Lampa.Select || !Lampa.Select.show) return;
    var origShow = Lampa.Select.show;

    Lampa.Select.show = function (object) {
      try {
        if (object && Array.isArray(object.items)) {
          var items = object.items;
          var touched = false;

          // Главное меню фильтра: вкладываем пункт в строку «Качество»
          items.forEach(function (row) {
            if (row && row.stype === 'quality' && Array.isArray(row.items)) {
              ensureItem(row.items);
              touched = true;
            }
          });

          // Подменю «Качество»: узнаём по 4K / 1080p / 720p
          var t = items.map(function (i) { return norm(i && i.title); });
          var has = function (s) {
            return t.some(function (x) { return x.indexOf(s) === 0; });
          };
          if (has('4k') && has('1080') && has('720')) {
            ensureItem(items);
            touched = true;
          }

          if (touched) wrapCallbacks(object);

          if (DEBUG) {
            Lampa.Noty.show('OM: ' + items.slice(0, 8).map(function (i) {
              return (i && i.title ? i.title : '?') + (i && i.stype ? '[' + i.stype + ']' : '');
            }).join(' | '));
          }
        }
      } catch (e) {
        if (DEBUG) Lampa.Noty.show('OM ошибка: ' + e.message);
      }

      return origShow.apply(this, arguments);
    };
  }

  function start() {
    patchParser();
    patchSelect();
    if (DEBUG) Lampa.Noty.show('Open Matte: плагин загружен');
  }

  if (window.appready) start();
  else Lampa.Listener.follow('app', function (e) {
    if (e.type === 'ready') start();
  });
})();
