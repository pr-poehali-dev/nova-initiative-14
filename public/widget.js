/**
 * Embed-скрипт виджета CAE-калькулятора балки «Диплом-Инж.рф».
 *
 * Партнёр вставляет на свой сайт одну строку:
 *   <script src="https://диплом-инж.рф/widget.js" data-key="ВАШ_КЛЮЧ" async></script>
 *
 * Скрипт создаёт изолированный iframe с калькулятором сразу после себя
 * (или в <div id="dipinzh-calc"></div>, если он есть на странице) и
 * автоматически подстраивает его высоту под содержимое.
 */
(function () {
  "use strict";

  var WIDGET_ORIGIN = "https://xn----gtbhgbqhkfi.xn--p1ai";
  var WIDGET_PATH = "/widget/beam";

  // Находим тег <script>, которым подключили виджет, чтобы взять data-key.
  var currentScript =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();

  var apiKey = currentScript ? currentScript.getAttribute("data-key") : null;
  if (!apiKey) {
    console.error("[dipinzh-widget] не указан data-key");
    return;
  }

  // Контейнер: либо #dipinzh-calc, либо создаём рядом со скриптом.
  var mount = document.getElementById("dipinzh-calc");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "dipinzh-calc";
    if (currentScript && currentScript.parentNode) {
      currentScript.parentNode.insertBefore(mount, currentScript.nextSibling);
    } else {
      document.body.appendChild(mount);
    }
  }

  var iframe = document.createElement("iframe");
  iframe.src =
    WIDGET_ORIGIN + WIDGET_PATH + "?key=" + encodeURIComponent(apiKey);
  iframe.style.width = "100%";
  iframe.style.border = "none";
  iframe.style.minHeight = "560px";
  iframe.style.display = "block";
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("title", "Калькулятор балки");
  // Разрешаем полноэкранный режим внутри iframe.
  iframe.setAttribute("allow", "fullscreen");
  iframe.setAttribute("allowfullscreen", "true");
  mount.appendChild(iframe);

  // Запоминаем исходные стили, чтобы вернуть их после выхода из fullscreen.
  var savedStyle = {
    position: iframe.style.position,
    top: iframe.style.top,
    left: iframe.style.left,
    width: iframe.style.width,
    height: iframe.style.height,
    zIndex: iframe.style.zIndex,
    minHeight: iframe.style.minHeight,
  };
  var isFs = false;

  function enterFullscreen() {
    if (isFs) return;
    isFs = true;
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100vw";
    iframe.style.height = "100vh";
    iframe.style.minHeight = "0";
    iframe.style.zIndex = "2147483647"; // поверх всего на странице партнёра
    document.documentElement.style.overflow = "hidden";
  }

  function exitFullscreen() {
    if (!isFs) return;
    isFs = false;
    iframe.style.position = savedStyle.position;
    iframe.style.top = savedStyle.top;
    iframe.style.left = savedStyle.left;
    iframe.style.width = savedStyle.width || "100%";
    iframe.style.height = savedStyle.height;
    iframe.style.minHeight = savedStyle.minHeight || "560px";
    iframe.style.zIndex = savedStyle.zIndex;
    document.documentElement.style.overflow = "";
  }

  // Сообщения из iframe: авто-высота и запрос полноэкранного режима.
  window.addEventListener("message", function (e) {
    if (e.origin !== WIDGET_ORIGIN) return;
    var data = e.data || {};
    if (data.type === "dipinzh-widget-height" && data.height && !isFs) {
      iframe.style.height = data.height + 24 + "px";
    } else if (data.type === "diploma-widget:fullscreen") {
      if (data.value) enterFullscreen();
      else exitFullscreen();
    }
  });
})();