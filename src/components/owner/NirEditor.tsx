/**
 * Современный редактор НИР по разделам ГОСТ 7.32-2017.
 *
 * Структурирует работу на разделы (титул, реферат, содержание, введение,
 * главы, заключение, литература, приложения), под каждым полем — методическая
 * подсказка. Сверху дорожная карта с прогрессом. Справа — кнопки экспорта в
 * Word/PDF и настройки оформления. Есть живой предпросмотр в формате документа.
 *
 * Компонент управляемый: документ и onChange приходят со страницы.
 */
import { useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import NirRoadmap from "@/components/owner/NirRoadmap";
import FormatSettingsModal from "@/components/owner/FormatSettingsModal";
import {
  type NirDocument,
  type NirSection,
  type NirTitleMeta,
  makeChapter,
} from "@/lib/nir";
import { type DocFormat } from "@/lib/docFormat";
import { buildDocHtml, exportToWord, exportToPdf } from "@/lib/docExport";

interface Props {
  doc: NirDocument;
  onChange: (next: NirDocument) => void;
}

type View = "edit" | "preview";

export default function NirEditor({ doc, onChange }: Props) {
  const [view, setView] = useState<View>("edit");
  const [fmtOpen, setFmtOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | "title" | null>("title");
  const titleRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const previewHtml = useMemo(() => (view === "preview" ? buildDocHtml(doc) : ""), [view, doc]);

  const setMeta = (patch: Partial<NirTitleMeta>) =>
    onChange({ ...doc, titleMeta: { ...doc.titleMeta, ...patch } });

  const setSection = (id: string, patch: Partial<NirSection>) =>
    onChange({ ...doc, sections: doc.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const addChapter = () => {
    const ch = makeChapter(`${doc.sections.filter((s) => s.kind === "chapter").length + 1} Новая глава`);
    // Вставляем перед заключением, если оно есть.
    const idx = doc.sections.findIndex((s) => s.kind === "conclusion");
    const next = [...doc.sections];
    if (idx >= 0) next.splice(idx, 0, ch);
    else next.push(ch);
    onChange({ ...doc, sections: next });
    setOpenSection(ch.id);
  };

  const removeSection = (id: string) => {
    if (!confirm("Удалить раздел? Текст будет потерян.")) return;
    onChange({ ...doc, sections: doc.sections.filter((s) => s.id !== id) });
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const arr = [...doc.sections];
    const i = arr.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({ ...doc, sections: arr });
  };

  const onApplyFormat = (fmt: DocFormat, presetId: string) => {
    onChange({ ...doc, format: fmt, presetId });
    setFmtOpen(false);
  };

  const jump = (stepId: string) => {
    setView("edit");
    if (stepId === "title") {
      setOpenSection("title");
      setTimeout(() => titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
      return;
    }
    if (stepId === "format") {
      setFmtOpen(true);
      return;
    }
    const map: Record<string, NirSection["kind"]> = {
      intro: "intro",
      review: "chapter",
      theory: "chapter",
      experiment: "chapter",
      conclusion: "conclusion",
      references: "references",
    };
    const kind = map[stepId];
    const sec = doc.sections.find((s) => s.kind === kind);
    if (sec) {
      setOpenSection(sec.id);
      setTimeout(() => sectionRefs.current[sec.id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    }
  };

  return (
    <div className="space-y-4">
      <NirRoadmap doc={doc} onJump={jump} />

      {/* Тулбар */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex border border-[var(--drawing-line)]/40">
          <button onClick={() => setView("edit")} className={`font-gost text-xs uppercase tracking-wider px-3 py-1.5 inline-flex items-center gap-1 ${view === "edit" ? "bg-[var(--drawing-accent)] text-white" : "text-[var(--drawing-line-thin)]"}`}>
            <Icon name="PencilLine" size={13} />Редактор
          </button>
          <button onClick={() => setView("preview")} className={`font-gost text-xs uppercase tracking-wider px-3 py-1.5 inline-flex items-center gap-1 ${view === "preview" ? "bg-[var(--drawing-accent)] text-white" : "text-[var(--drawing-line-thin)]"}`}>
            <Icon name="Eye" size={13} />Предпросмотр
          </button>
        </div>
        <div className="flex-1" />
        <button onClick={() => setFmtOpen(true)} className="btn-drawing text-xs inline-flex items-center gap-1">
          <Icon name="Settings2" size={14} />Оформление
        </button>
        <button onClick={() => exportToWord(doc)} className="btn-drawing text-xs inline-flex items-center gap-1">
          <Icon name="FileType2" size={14} />Word
        </button>
        <button onClick={() => exportToPdf(doc)} className="btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1">
          <Icon name="FileDown" size={14} />PDF
        </button>
      </div>

      {view === "preview" ? (
        <iframe
          title="Предпросмотр документа"
          srcDoc={previewHtml}
          className="w-full h-[70vh] border-2 border-[var(--drawing-line)] bg-white"
        />
      ) : (
        <div className="space-y-2">
          {/* Титульный лист */}
          <div ref={titleRef}>
            <AccordionRow
              icon="FileSignature"
              title="Титульный лист"
              meta="Вуз · кафедра · тема · автор · руководитель"
              open={openSection === "title"}
              onToggle={() => setOpenSection(openSection === "title" ? null : "title")}
            >
              <TitleForm meta={doc.titleMeta} onChange={setMeta} />
            </AccordionRow>
          </div>

          {/* Разделы */}
          {doc.sections.map((s) => (
            <div key={s.id} ref={(el) => (sectionRefs.current[s.id] = el)}>
              <AccordionRow
                icon={sectionIcon(s)}
                title={s.heading || "Раздел"}
                meta={`${s.body.length.toLocaleString("ru-RU")} зн.${s.enabled ? "" : " · выключен"}`}
                open={openSection === s.id}
                dim={!s.enabled}
                onToggle={() => setOpenSection(openSection === s.id ? null : s.id)}
                controls={
                  <SectionControls
                    section={s}
                    onToggleEnabled={() => setSection(s.id, { enabled: !s.enabled })}
                    onUp={() => moveSection(s.id, -1)}
                    onDown={() => moveSection(s.id, 1)}
                    onRemove={s.kind === "chapter" || s.kind === "appendix" ? () => removeSection(s.id) : undefined}
                  />
                }
              >
                <SectionForm section={s} onChange={(patch) => setSection(s.id, patch)} />
              </AccordionRow>
            </div>
          ))}

          <button onClick={addChapter} className="btn-drawing text-xs inline-flex items-center gap-1">
            <Icon name="Plus" size={14} />Добавить главу
          </button>
        </div>
      )}

      <FormatSettingsModal
        open={fmtOpen}
        value={doc.format}
        presetId={doc.presetId}
        onApply={onApplyFormat}
        onClose={() => setFmtOpen(false)}
      />
    </div>
  );
}

function sectionIcon(s: NirSection): string {
  const map: Record<string, string> = {
    abstract: "AlignLeft",
    intro: "Flag",
    chapter: "BookOpen",
    conclusion: "CheckCircle2",
    references: "List",
    appendix: "Paperclip",
    toc: "ListTree",
  };
  return map[s.kind] || "FileText";
}

function AccordionRow({
  icon, title, meta, open, onToggle, children, controls, dim,
}: {
  icon: string; title: string; meta: string; open: boolean; onToggle: () => void;
  children: React.ReactNode; controls?: React.ReactNode; dim?: boolean;
}) {
  return (
    <div className={`border ${open ? "border-[var(--drawing-accent)]" : "border-[var(--drawing-line)]/40"} ${dim ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <Icon name={icon} size={15} className="text-[var(--drawing-accent)] shrink-0" />
          <span className="font-gost-upright font-bold text-sm truncate">{title}</span>
          <span className="font-mono text-[9px] text-[var(--drawing-line-thin)] shrink-0 ml-1 hidden sm:inline">{meta}</span>
        </button>
        {controls}
        <button onClick={onToggle} className="text-[var(--drawing-line-thin)] shrink-0">
          <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} />
        </button>
      </div>
      {open && <div className="px-3 pb-3 border-t border-[var(--drawing-line)]/20 pt-3">{children}</div>}
    </div>
  );
}

function SectionControls({
  section, onToggleEnabled, onUp, onDown, onRemove,
}: {
  section: NirSection; onToggleEnabled: () => void; onUp: () => void; onDown: () => void; onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button onClick={onToggleEnabled} title={section.enabled ? "Выключить из работы" : "Включить"} className="p-1 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]">
        <Icon name={section.enabled ? "Eye" : "EyeOff"} size={14} />
      </button>
      <button onClick={onUp} title="Выше" className="p-1 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]">
        <Icon name="ChevronsUp" size={14} />
      </button>
      <button onClick={onDown} title="Ниже" className="p-1 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]">
        <Icon name="ChevronsDown" size={14} />
      </button>
      {onRemove && (
        <button onClick={onRemove} title="Удалить" className="p-1 text-[var(--drawing-line-thin)] hover:text-red-600">
          <Icon name="Trash2" size={14} />
        </button>
      )}
    </div>
  );
}

function SectionForm({ section, onChange }: { section: NirSection; onChange: (patch: Partial<NirSection>) => void }) {
  return (
    <div className="space-y-2">
      {section.kind === "chapter" && (
        <label className="block">
          <span className="lbl">Заголовок раздела</span>
          <input value={section.heading} onChange={(e) => onChange({ heading: e.target.value })} className="drawing-input w-full text-sm font-bold" />
        </label>
      )}
      {section.hint && (
        <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] bg-[var(--drawing-paper)] border-l-2 border-[var(--drawing-accent)] px-2 py-1.5 leading-snug">
          <Icon name="Info" size={11} className="inline mr-1 -mt-0.5" />{section.hint}
        </p>
      )}
      <textarea
        value={section.body}
        onChange={(e) => onChange({ body: e.target.value })}
        rows={section.kind === "references" ? 8 : 10}
        placeholder={section.kind === "references" ? "Каждый источник с новой строки…" : "Текст раздела… Пустая строка — новый абзац."}
        className="drawing-input w-full resize-y text-sm leading-relaxed"
        style={{ fontStyle: "normal" }}
      />
    </div>
  );
}

function TitleForm({ meta, onChange }: { meta: NirTitleMeta; onChange: (patch: Partial<NirTitleMeta>) => void }) {
  const F = (label: string, key: keyof NirTitleMeta, area = false) => (
    <label className="block">
      <span className="lbl">{label}</span>
      {area ? (
        <textarea value={meta[key]} onChange={(e) => onChange({ [key]: e.target.value } as Partial<NirTitleMeta>)} rows={2} className="drawing-input w-full text-sm resize-y" style={{ fontStyle: "normal" }} />
      ) : (
        <input value={meta[key]} onChange={(e) => onChange({ [key]: e.target.value } as Partial<NirTitleMeta>)} className="drawing-input w-full text-sm" style={{ fontStyle: "normal" }} />
      )}
    </label>
  );
  return (
    <div className="space-y-3">
      {F("Министерство", "ministry", true)}
      {F("Вуз (полное наименование)", "university", true)}
      <div className="grid sm:grid-cols-2 gap-3">
        {F("Институт", "institute")}
        {F("Кафедра", "department")}
      </div>
      {F("Вид работы", "workType", true)}
      <div className="grid sm:grid-cols-2 gap-3">
        {F("Дисциплина / практика", "discipline")}
        {F("Тема", "topic")}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {F("ФИО студента", "studentName")}
        {F("Группа", "studentGroup")}
        {F("ФИО руководителя", "supervisorName")}
        {F("Должность руководителя", "supervisorPosition")}
        {F("Город", "city")}
        {F("Год", "year")}
      </div>
    </div>
  );
}
