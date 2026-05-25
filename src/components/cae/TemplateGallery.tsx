import { FRAME_TEMPLATES, type FrameTemplate } from "@/lib/cae-catalog";
import Icon from "@/components/ui/icon";

interface Props {
  selectedId: string;
  onSelect: (t: FrameTemplate) => void;
}

const TemplateGallery = ({ selectedId, onSelect }: Props) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {FRAME_TEMPLATES.map((t) => {
        const active = selectedId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className={`text-left border-2 p-3 transition ${
              active
                ? "border-[var(--drawing-accent)] bg-[var(--drawing-paper)]"
                : "border-[var(--drawing-line)] hover:border-[var(--drawing-accent)]"
            }`}
          >
            <div className="bg-white border border-[var(--drawing-line-thin)] aspect-[2/1] flex items-center justify-center mb-2">
              <svg viewBox="0 0 70 50" className="w-full h-full p-1">
                <path
                  d={t.preview}
                  stroke="#1a1a2e"
                  strokeWidth={1.2}
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex items-start justify-between gap-2">
              <p className="font-gost-upright text-sm font-bold leading-tight">{t.name}</p>
              {active && (
                <Icon name="Check" size={16} className="text-[var(--drawing-accent)] shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-1">
              {t.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default TemplateGallery;
