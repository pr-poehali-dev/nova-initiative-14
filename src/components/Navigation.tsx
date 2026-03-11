import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const navLinks = [
  { label: "Программа", to: "/program" },
  { label: "Тарифы", to: "/pricing" },
  { label: "Кейсы", to: "/cases" },
  { label: "Наставники", to: "/experts" },
  { label: "FAQ", to: "/faq" },
  { label: "Контакты", to: "/contacts" },
];

const Navigation = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-[var(--drawing-bg)] border-b-[2.5px] border-[var(--drawing-line)]">
      <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="font-gost text-lg tracking-wide flex items-center gap-0 shrink-0">
          <span className="text-[var(--drawing-accent)] font-bold">ДИПЛОМ</span>
          <span className="text-[var(--drawing-line-thin)]">.ИНЖ</span>
        </Link>

        <div className="hidden md:flex items-center gap-5 ml-8">
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

        <div className="hidden md:flex items-center gap-4 ml-auto">
          <Link
            to="/contacts"
            className="btn-drawing-accent font-gost text-[11px] uppercase tracking-wider px-4 py-1.5 border-2 border-[var(--drawing-accent)] transition-all hover:bg-[var(--drawing-accent)] hover:text-white"
          >
            Диагностика ВКР&nbsp;&rarr;
          </Link>
          <span className="hidden lg:inline font-gost-upright text-[9px] text-[var(--drawing-line-thin)] opacity-60 whitespace-nowrap">
            ГОСТ 2.104-2006
          </span>
        </div>

        <button
          className="md:hidden flex items-center justify-center w-10 h-10"
          onClick={() => setMenuOpen(true)}
          aria-label="Открыть меню"
        >
          <Icon name="Menu" size={24} />
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-[var(--drawing-bg)] grid-bg flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 border-b-[2.5px] border-[var(--drawing-line)]">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="font-gost text-lg tracking-wide flex items-center"
            >
              <span className="text-[var(--drawing-accent)] font-bold">ДИПЛОМ</span>
              <span className="text-[var(--drawing-line-thin)]">.ИНЖ</span>
            </Link>
            <button
              className="flex items-center justify-center w-10 h-10"
              onClick={() => setMenuOpen(false)}
              aria-label="Закрыть меню"
            >
              <Icon name="X" size={24} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="font-gost text-xl uppercase tracking-widest text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="extension-line-h w-32 my-2" />
            <Link
              to="/contacts"
              onClick={() => setMenuOpen(false)}
              className="btn-drawing-accent font-gost text-sm uppercase tracking-wider px-6 py-3 border-2 border-[var(--drawing-accent)] transition-all hover:bg-[var(--drawing-accent)] hover:text-white mt-2"
            >
              Диагностика ВКР&nbsp;&rarr;
            </Link>
          </div>

          <div className="px-4 pb-6 text-center">
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
