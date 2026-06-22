import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

const navLinks = [
  { label: "Программа", to: "/program" },
  { label: "Тарифы", to: "/pricing" },
  { label: "CAE", to: "/cae" },
  { label: "Кейсы", to: "/cases" },
  { label: "Блог", to: "/blog" },
  { label: "ГОСТы", to: "/gost-catalog" },
  { label: "Наставники", to: "/experts" },
  { label: "О нас", to: "/about" },
  { label: "Отзывы", to: "/reviews" },
  { label: "Вакансии", to: "/vacancies" },
  { label: "FAQ", to: "/faq" },
  { label: "Контакты", to: "/contacts" },
];

const Navigation = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 bg-[var(--drawing-bg)] border-b-[2.5px] border-[var(--drawing-line)]">
      <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="font-gost font-black text-lg tracking-wide flex items-center gap-0 shrink-0 uppercase">
          <span className="text-[var(--drawing-accent)]">ДИПЛОМ</span>
          <span className="text-[var(--drawing-line)]">-</span>
          <span className="text-[var(--drawing-accent)]">ИНЖ</span>
          <span className="text-[var(--drawing-line)]">.РФ</span>
        </Link>

        <div className="hidden md:flex items-center gap-3 lg:gap-4 ml-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-gost text-xs uppercase tracking-widest text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3 ml-auto">
          <ThemeToggle />
          <NotificationBell />
          {user ? (
            <Link
              to="/account"
              className="font-gost text-[11px] uppercase tracking-wider px-3 py-1.5 border border-[var(--drawing-line)] hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition-colors flex items-center gap-2"
              title={user.email}
            >
              <Icon name="User" size={14} />
              <span className="max-w-[120px] truncate">{user.full_name || user.email.split("@")[0]}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors flex items-center gap-1"
            >
              <Icon name="LogIn" size={14} />
              Войти
            </Link>
          )}
          <Link
            to="/contacts"
            className="btn-drawing-accent font-gost text-[11px] uppercase tracking-wider px-4 py-1.5 border-2 border-[var(--drawing-accent)] transition-all hover:bg-[var(--drawing-accent)] hover:text-white"
          >
            Диагностика ВКР&nbsp;&rarr;
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-1 ml-auto">
          <NotificationBell />
          <ThemeToggle />
          <button
            className="flex items-center justify-center min-w-[44px] min-h-[44px]"
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню"
          >
            <Icon name="Menu" size={24} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-[var(--drawing-bg)] grid-bg flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 border-b-[2.5px] border-[var(--drawing-line)]">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="font-gost font-black text-lg tracking-wide flex items-center uppercase"
            >
              <span className="text-[var(--drawing-accent)]">ДИПЛОМ</span>
              <span className="text-[var(--drawing-line)]">-</span>
              <span className="text-[var(--drawing-accent)]">ИНЖ</span>
              <span className="text-[var(--drawing-line)]">.РФ</span>
            </Link>
            <button
              className="flex items-center justify-center min-w-[44px] min-h-[44px]"
              onClick={() => setMenuOpen(false)}
              aria-label="Закрыть меню"
            >
              <Icon name="X" size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col px-4 py-3">
            {/* Личный кабинет / вход — сразу наверху, чтобы не листать */}
            {user ? (
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className="font-gost text-sm uppercase tracking-wider px-4 py-3 border border-[var(--drawing-line)] flex items-center gap-2 mb-3"
              >
                <Icon name="User" size={16} className="text-[var(--drawing-accent)]" />
                Личный кабинет
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="font-gost text-sm uppercase tracking-wider px-4 py-3 border border-[var(--drawing-line)] flex items-center gap-2 mb-3"
              >
                <Icon name="LogIn" size={16} className="text-[var(--drawing-accent)]" />
                Войти
              </Link>
            )}

            <div className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="font-gost text-base uppercase tracking-widest text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors py-3 border-b border-[var(--drawing-line)]/15"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <Link
              to="/contacts"
              onClick={() => setMenuOpen(false)}
              className="btn-drawing-accent font-gost text-sm uppercase tracking-wider text-center px-6 py-3 border-2 border-[var(--drawing-accent)] transition-all hover:bg-[var(--drawing-accent)] hover:text-white mt-4"
            >
              Диагностика ВКР&nbsp;&rarr;
            </Link>
          </div>

          <div className="px-4 pb-4 text-center">
            <span className="font-gost-upright text-[9px] text-[var(--drawing-line-thin)] opacity-60">
              ГОСТ 2.104-2006
            </span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;