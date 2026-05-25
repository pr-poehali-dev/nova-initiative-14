import type { ReactNode } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: ReactNode;
}

const CatalogShell = ({ open, onClose, title, width = 460, children }: Props) => {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full bg-[var(--drawing-bg)] border-l-2 border-[var(--drawing-line)] shadow-2xl flex flex-col"
        style={{ width: `min(95vw, ${width}px)` }}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--drawing-line)] shrink-0">
          <h2 className="font-gost-upright text-sm font-bold uppercase tracking-widest">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 hover:bg-[var(--drawing-paper)]"
            aria-label="Закрыть"
          >
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
};

export default CatalogShell;
