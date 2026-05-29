import { Link, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ALPHA_TEST_MODE } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Тонкая глобальная полоса под навигацией — постоянная часть интерфейса.
 * Показывает посетителям сайта, что CAE-сервис открыт бесплатно
 * на время альфа-тестирования. Не закрывается (это не всплывающее окно).
 *
 * Не рендерится:
 *  - в режиме редактора CAE и на демо-редакторе (там уже свой баннер)
 *  - если ALPHA_TEST_MODE === false
 */
export default function AlphaTestStrip() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  if (!ALPHA_TEST_MODE) return null;

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
      <div className="max-w-[1200px] mx-auto px-4 py-1 flex items-center text-[11px]">
        <Link
          to={user ? "/cae/projects" : "/cae/demo"}
          className="flex items-center gap-2 flex-1 min-w-0 py-1 group"
        >
          <Icon name="FlaskConical" size={12} className="shrink-0" />
          <span className="font-gost uppercase tracking-wider leading-tight truncate">
            <span className="font-bold">Альфа-тест:</span>{" "}
            <span className="opacity-90">CAE-расчёты бесплатно, лимиты сняты.</span>{" "}
            <span className="underline underline-offset-2 font-bold group-hover:no-underline whitespace-nowrap">
              {user ? "Мои проекты" : "Попробовать"}&nbsp;&rarr;
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
