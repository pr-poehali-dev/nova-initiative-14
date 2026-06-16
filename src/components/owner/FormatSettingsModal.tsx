/**
 * Модалка настроек оформления документа. Любая кафедра/институт может задать
 * свои требования: шрифт, кегль, межстрочный, абзацный отступ, выравнивание,
 * формат и ориентацию страницы, поля, рамку по ЕСКД, нумерацию страниц.
 *
 * Сверху — выбор вуза/кафедры: можно подставить встроенный пресет (по умолчанию
 * УрФУ) или сохранённый ранее. Кнопка «Сохранить как пресет» создаёт свой
 * пресет на сервере. «Применить» закрывает модалку и фиксирует настройки.
 */
import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  type DocFormat,
  type PageSize,
  type EskdFrameMode,
  FONT_FAMILIES,
  LINE_HEIGHTS,
  PAGE_SIZES,
  ESKD_FRAME_LABELS,
  UNIVERSITY_PRESETS,
  getPreset,
} from "@/lib/docFormat";
import {
  listFormatPresets,
  saveFormatPreset,
  deleteFormatPreset,
  type SavedFormatPreset,
} from "@/lib/research";

interface Props {
  open: boolean;
  value: DocFormat;
  presetId: string;
  onApply: (fmt: DocFormat, presetId: string) => void;
  onClose: () => void;
}

export default function FormatSettingsModal({ open, value, presetId, onApply, onClose }: Props) {
  const [fmt, setFmt] = useState<DocFormat>(value);
  const [selectedPreset, setSelectedPreset] = useState<string>(presetId);
  const [saved, setSaved] = useState<SavedFormatPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFmt(value);
      setSelectedPreset(presetId);
      setMsg(null);
      listFormatPresets().then((r) => {
        if (r.ok && r.data) setSaved(r.data.presets);
      });
    }
  }, [open, value, presetId]);

  if (!open) return null;

  const set = <K extends keyof DocFormat>(key: K, v: DocFormat[K]) => setFmt({ ...fmt, [key]: v });
  const setMargin = (side: keyof DocFormat["margins"], v: number) =>
    setFmt({ ...fmt, margins: { ...fmt.margins, [side]: v } });

  const applyBuiltinPreset = (id: string) => {
    setSelectedPreset(id);
    const p = getPreset(id);
    if (p) setFmt(JSON.parse(JSON.stringify(p.format)));
  };

  const applySavedPreset = (p: SavedFormatPreset) => {
    setSelectedPreset(`saved:${p.id}`);
    setFmt({ ...fmt, ...p.format });
  };

  const onSavePreset = async () => {
    const name = presetName.trim();
    if (!name) {
      setMsg("Введите название пресета");
      return;
    }
    setBusy(true);
    const builtin = getPreset(selectedPreset);
    const r = await saveFormatPreset({
      name,
      university: builtin?.university || "",
      department: builtin?.department || "",
      format: fmt,
    });
    setBusy(false);
    if (r.ok && r.data) {
      setMsg(`Пресет «${name}» сохранён`);
      setPresetName("");
      const list = await listFormatPresets();
      if (list.ok && list.data) setSaved(list.data.presets);
    } else {
      setMsg("Не удалось сохранить пресет");
    }
  };

  const onDeletePreset = async (id: number) => {
    await deleteFormatPreset(id);
    const list = await listFormatPresets();
    if (list.ok && list.data) setSaved(list.data.presets);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] max-w-[760px] w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="sticky top-0 bg-[var(--drawing-bg)] border-b border-[var(--drawing-line)]/40 px-5 py-3 flex items-center justify-between z-10">
          <h2 className="font-gost-upright text-lg font-black uppercase tracking-wide inline-flex items-center gap-2">
            <Icon name="Settings2" size={18} />Настройки оформления
          </h2>
          <button onClick={onClose} className="text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Вуз / кафедра */}
          <Block title="Вуз и кафедра" icon="GraduationCap">
            <label className="block">
              <span className="lbl">Встроенный пресет</span>
              <select value={selectedPreset.startsWith("saved:") ? "" : selectedPreset} onChange={(e) => applyBuiltinPreset(e.target.value)} className="drawing-input w-full text-sm">
                {UNIVERSITY_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.short} · {p.department}</option>
                ))}
              </select>
            </label>
            {saved.length > 0 && (
              <div className="mt-2">
                <span className="lbl">Мои сохранённые пресеты</span>
                <ul className="space-y-1 mt-1">
                  {saved.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 border border-[var(--drawing-line)]/40 px-2 py-1.5">
                      <button onClick={() => applySavedPreset(p)} className={`flex-1 text-left font-gost text-xs ${selectedPreset === `saved:${p.id}` ? "text-[var(--drawing-accent)]" : ""}`}>
                        {p.name}
                      </button>
                      <button onClick={() => onDeletePreset(p.id)} className="text-[var(--drawing-line-thin)] hover:text-red-600" aria-label="Удалить">
                        <Icon name="Trash2" size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Block>

          {/* Шрифт и абзац */}
          <Block title="Шрифт и абзац" icon="Type">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="lbl">Гарнитура</span>
                <select value={fmt.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} className="drawing-input w-full text-sm">
                  {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <Num label="Кегль текста, пт" value={fmt.fontSize} min={8} max={20} onChange={(v) => set("fontSize", v)} />
              <label className="block">
                <span className="lbl">Межстрочный интервал</span>
                <select value={fmt.lineHeight} onChange={(e) => set("lineHeight", Number(e.target.value))} className="drawing-input w-full text-sm">
                  {LINE_HEIGHTS.map((l) => <option key={l} value={l}>{l.toFixed(2)}</option>)}
                </select>
              </label>
              <Num label="Абзацный отступ, мм" value={fmt.firstLineIndent} min={0} max={30} step={0.5} onChange={(v) => set("firstLineIndent", v)} />
              <label className="block">
                <span className="lbl">Выравнивание</span>
                <select value={fmt.align} onChange={(e) => set("align", e.target.value as DocFormat["align"])} className="drawing-input w-full text-sm">
                  <option value="justify">По ширине</option>
                  <option value="left">По левому краю</option>
                </select>
              </label>
              <Num label="Кегль заголовков, пт" value={fmt.headingSize} min={10} max={24} onChange={(v) => set("headingSize", v)} />
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={fmt.headingUppercase} onChange={(e) => set("headingUppercase", e.target.checked)} />
              <span className="font-gost text-xs">Заголовки разделов ПРОПИСНЫМИ</span>
            </label>
          </Block>

          {/* Страница и поля */}
          <Block title="Страница и поля" icon="FileText">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="lbl">Формат страницы</span>
                <select value={fmt.pageSize} onChange={(e) => set("pageSize", e.target.value as PageSize)} className="drawing-input w-full text-sm">
                  {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="lbl">Ориентация</span>
                <select value={fmt.orientation} onChange={(e) => set("orientation", e.target.value as DocFormat["orientation"])} className="drawing-input w-full text-sm">
                  <option value="portrait">Книжная</option>
                  <option value="landscape">Альбомная</option>
                </select>
              </label>
            </div>
            <span className="lbl mt-3 block">Поля страницы, мм</span>
            <div className="grid grid-cols-4 gap-2">
              <Num label="Верх" value={fmt.margins.top} min={0} max={50} onChange={(v) => setMargin("top", v)} />
              <Num label="Низ" value={fmt.margins.bottom} min={0} max={50} onChange={(v) => setMargin("bottom", v)} />
              <Num label="Лево" value={fmt.margins.left} min={0} max={50} onChange={(v) => setMargin("left", v)} />
              <Num label="Право" value={fmt.margins.right} min={0} max={50} onChange={(v) => setMargin("right", v)} />
            </div>
            {fmt.eskdFrame !== "none" && (
              <p className="font-gost text-[10px] text-[var(--drawing-accent)] mt-1">
                При рамке ЕСКД поля задаются автоматически (лево 20, остальные 5 мм).
              </p>
            )}
          </Block>

          {/* Рамка и нумерация */}
          <Block title="Рамка ЕСКД и нумерация" icon="SquareDashedBottom">
            <label className="block">
              <span className="lbl">Рамка по ЕСКД</span>
              <select value={fmt.eskdFrame} onChange={(e) => set("eskdFrame", e.target.value as EskdFrameMode)} className="drawing-input w-full text-sm">
                {(Object.keys(ESKD_FRAME_LABELS) as EskdFrameMode[]).map((k) => (
                  <option key={k} value={k}>{ESKD_FRAME_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={fmt.pageNumbers} onChange={(e) => set("pageNumbers", e.target.checked)} />
              <span className="font-gost text-xs">Нумеровать страницы</span>
            </label>
            {fmt.pageNumbers && (
              <label className="block mt-2">
                <span className="lbl">Положение номера</span>
                <select value={fmt.pageNumberPos} onChange={(e) => set("pageNumberPos", e.target.value as DocFormat["pageNumberPos"])} className="drawing-input w-full text-sm">
                  <option value="bottom-center">Внизу по центру</option>
                  <option value="bottom-right">Внизу справа</option>
                  <option value="top-right">Вверху справа</option>
                </select>
              </label>
            )}
          </Block>

          {/* Сохранить как пресет */}
          <Block title="Сохранить настройки как пресет" icon="Bookmark">
            <div className="flex flex-wrap gap-2 items-end">
              <label className="flex-1 min-w-[180px]">
                <span className="lbl">Название пресета</span>
                <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Напр.: УрФУ ИНМТ — мой вариант" className="drawing-input w-full text-sm" />
              </label>
              <button onClick={onSavePreset} disabled={busy} className={`btn-drawing text-xs inline-flex items-center gap-1 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
                <Icon name="Save" size={14} />Сохранить пресет
              </button>
            </div>
          </Block>

          {msg && <p className="font-gost text-[11px] text-[var(--drawing-accent)]">{msg}</p>}
        </div>

        {/* Подвал */}
        <div className="sticky bottom-0 bg-[var(--drawing-bg)] border-t border-[var(--drawing-line)]/40 px-5 py-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-drawing text-xs">Отмена</button>
          <button onClick={() => onApply(fmt, selectedPreset.startsWith("saved:") ? presetId : selectedPreset)} className="btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1">
            <Icon name="Check" size={14} />Применить
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="border border-[var(--drawing-line)]/40 p-3">
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-2 inline-flex items-center gap-1.5">
        <Icon name={icon} size={13} />{title}
      </p>
      {children}
    </section>
  );
}

function Num({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="drawing-input w-full text-sm"
      />
    </label>
  );
}
