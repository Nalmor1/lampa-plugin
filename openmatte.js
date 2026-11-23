(function () {
  'use strict';

  if (window.plugin_openmatte_ready) return;
  window.plugin_openmatte_ready = true;

  var KEY = 'openmatte_filter';
  var RE = /open[\s._\-]*matte|web[\s._\-]*dl/i;

  function isOn() {
    return Lampa.Storage.get(KEY, 'false') === 'true';
  }

  function setOn(v) {
    Lampa.Storage.set(KEY, v ? 'true' : 'false');
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
  function patchSelect() {
    if (!Lampa.Select || !Lampa.Select.show) return;
    var origShow = Lampa.Select.show;

    Lampa.Select.show = function (object) {
      try {
        if (object && Array.isArray(object.items)) {
          var titles = object.items.map(function (i) { return i.title; });
          var isQuality = titles.indexOf('4K') > -1 &&
                          titles.indexOf('1080p') > -1 &&
                          titles.indexOf('720p') > -1;
          var already = titles.indexOf('Open Matte') > -1;

          if (isQuality && !already) {
            var changed = false;

            object.items.push({
              title: 'Open Matte',
              checkbox: true,
              checked: isOn(),
              openmatte: true
            });

            var origCheck = object.onCheck;
            object.onCheck = function (a) {
              if (a && a.openmatte) {
                setOn(!!a.checked);
                changed = true;
              } else if (origCheck) {
                return origCheck.apply(this, arguments);
              }
            };

            var origBack = object.onBack;
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
        }
      } catch (e) {}

      return origShow.apply(this, arguments);
    };
  }

  function start() {
    patchParser();
    patchSelect();
  }

  if (window.appready) start();
  else Lampa.Listener.follow('app', function (e) {
    if (e.type === 'ready') start();
  });
})();
