import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ALPHA_TEST_MODE } from "@/lib/auth";

const DISMISS_KEY = "alpha_test_strip_dismissed_v1";

/**
 * Тонкая глобальная полоса под навигацией.
 * Показывает посетителям сайта, что CAE-сервис открыт бесплатно
 * на время альфа-тестирования. Закрывается крестиком (запоминается в localStorage).
 *
 * Не рендерится:
 *  - в режиме редактора CAE и на демо-редакторе (там уже свой баннер)
 *  - после закрытия пользователем
 *  - если ALPHA_TEST_MODE === false
 */
export default function AlphaTestStrip() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!dismissed) return;
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* localStorage недоступен — игнорируем */
    }
  }, [dismissed]);

  if (!ALPHA_TEST_MODE) return null;
  if (dismissed) return null;

  // На страницах с собственным баннером альфа-теста скрываем полосу,
  // чтобы не дублировать сообщение.
  const hideOnPaths = [
    "/cae/demo",
    "/cae/projects",
  ];
  const isEditorRoute = /^\/cae\/projects\/[^/]+/.test(pathname);
  if (isEditorRoute) return null;
  if (hideOnPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <div
      className="fixed top-14 left-0 right-0 z-40 bg-[var(--drawing-accent)] text-white border-b border-black/10"
      role="status"
    >
      <div className="max-w-[1200px] mx-auto px-4 py-1.5 flex items-center gap-3 text-[11px]">
        <Icon name="FlaskConical" size={12} className="shrink-0" />
        <p className="font-gost uppercase tracking-wider leading-tight flex-1 min-w-0 truncate">
          <span className="font-bold">Альфа-тест:</span>{" "}
          <span className="opacity-90">CAE-расчёты открыты бесплатно, лимиты сняты.</span>{" "}
          <Link
            to="/cae/demo"
            className="underline underline-offset-2 font-bold hover:no-underline whitespace-nowrap"
          >
            Попробовать&nbsp;&rarr;
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Скрыть уведомление"
          className="shrink-0 hover:bg-white/15 p-1 -mr-1 transition-colors"
        >
          <Icon name="X" size={12} />
        </button>
      </div>
    </div>
  );
}
