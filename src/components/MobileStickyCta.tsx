import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";

/**
 * Закреплённая снизу кнопка «Записаться на диагностику» — только на мобильных.
 * Появляется после прокрутки страницы, чтобы не перекрывать первый экран.
 * Не показывается в разделах CAE (там свой контекст и панели).
 */
export default function MobileStickyCta() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Скрываем на /contacts (там уже форма) и во всех разделах CAE и аккаунта.
  const hidePrefixes = ["/cae", "/account", "/login", "/register", "/contacts"];
  if (hidePrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <Link
      to="/contacts"
      className={`sticky-cta-bar md:hidden${visible ? " visible" : ""}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <Icon name="ClipboardCheck" size={16} className="text-white" />
      <span className="font-gost text-xs uppercase tracking-[0.15em] text-white">
        Записаться на диагностику ВКР
      </span>
    </Link>
  );
}
