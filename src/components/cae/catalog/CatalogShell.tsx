import { useEffect, useState, type ReactNode } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: ReactNode;
}

/**
 * Универсальный шелл каталога. На десктопе (>=1024px) — боковая панель справа
 * заданной ширины. На мобильных и планшетных экранах — full-screen-лист
 * без подложки, чтобы пользователь видел только содержимое каталога и мог
 * прокручивать его пальцем без скролл-блокировок.
 */
const CatalogShell = ({ open, onClose, title, width = 460, children }: Props) => {
  // SSR-safe определение «мобильного» режима
  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!open) return null;
  const asideStyle: React.CSSProperties = isDesktop
    ? { width: `min(95vw, ${width}px)`, top: 0, right: 0, bottom: 0 }
    : { inset: 0 };

  return (
    <>
      {isDesktop && (
        <div className="fixed inset-0 z-[55] bg-black/30" onClick={onClose} />
      )}
      <aside
        className={`fixed z-[60] bg-[var(--drawing-bg)] shadow-2xl flex flex-col ${
          isDesktop ? "border-l-2 border-[var(--drawing-line)]" : ""
        }`}
        style={asideStyle}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--drawing-line)] shrink-0">
          <h2 className="font-gost-upright text-sm font-bold uppercase tracking-widest">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:w-9 lg:h-9 hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)]"
            aria-label="Закрыть"
          >
            <Icon name="X" size={isDesktop ? 18 : 22} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">{children}</div>
      </aside>
    </>
  );
};

export default CatalogShell;