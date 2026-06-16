/**
 * Формирователь отчёта НИР в Word (.doc) и PDF с учётом настроек оформления
 * (DocFormat): шрифт, кегль, межстрочный, абзацный отступ, формат и
 * ориентация страницы, поля, рамка по ЕСКД, нумерация страниц.
 *
 * Word: генерируем самодостаточный HTML с заголовком Word (mso-стили) —
 * открывается в MS Word / LibreOffice / Google Docs как редактируемый
 * документ, сохраняет шрифт, поля и размер страницы.
 *
 * PDF: открываем print-ready окно с теми же стилями и вызываем печать —
 * пользователь выбирает «Сохранить как PDF». Это даёт пиксель-в-пиксель
 * соответствие предпросмотру и поддержку рамки ЕСКД.
 */
import {
  type DocFormat,
  PAGE_DIMENSIONS_MM,
  applyEskdFrameMargins,
} from "@/lib/docFormat";
import { type NirDocument, type NirSection } from "@/lib/nir";

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Простой текст → абзацы <p>. Пустые строки = разрыв абзаца. */
function textToParagraphs(text: string, cls = ""): string {
  const blocks = (text || "").split(/\n{2,}/);
  return blocks
    .map((b) => {
      const inner = esc(b.trim()).replace(/\n/g, "<br/>");
      if (!inner) return "";
      return `<p class="${cls}">${inner}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

function pageDims(fmt: DocFormat): { w: number; h: number } {
  const base = PAGE_DIMENSIONS_MM[fmt.pageSize];
  return fmt.orientation === "landscape" ? { w: base.h, h: base.w } : base;
}

/** SVG-рамка по ЕСКД (форма 2 — с основной надписью, или форма 2а). */
function eskdFrameSvg(fmt: DocFormat): string {
  if (fmt.eskdFrame === "none") return "";
  const { w, h } = pageDims(fmt);
  // Рабочее поле рамки: слева 20 мм, остальные 5 мм.
  const fx = 20;
  const fy = 5;
  const fw = w - 20 - 5;
  const fh = h - 5 - 5;
  const stampH = fmt.eskdFrame === "form2" ? 55 : 15; // мм
  const stampW = 185;
  const sx = fx + fw - stampW;
  const sy = fy + fh - stampH;
  return `
  <svg class="eskd" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="none" stroke="#000" stroke-width="0.5"/>
    <rect x="${sx}" y="${sy}" width="${stampW}" height="${stampH}" fill="none" stroke="#000" stroke-width="0.5"/>
    ${
      fmt.eskdFrame === "form2"
        ? `<line x1="${sx}" y1="${sy + 30}" x2="${sx + stampW}" y2="${sy + 30}" stroke="#000" stroke-width="0.3"/>
           <line x1="${sx + 65}" y1="${sy}" x2="${sx + 65}" y2="${sy + stampH}" stroke="#000" stroke-width="0.3"/>`
        : ""
    }
  </svg>`;
}

/** Общие CSS-стили под формат (используются и для Word, и для PDF). */
function buildCss(fmt: DocFormat): string {
  const eff = applyEskdFrameMargins(fmt);
  const { w, h } = pageDims(fmt);
  const m = eff.margins;
  const numPos =
    fmt.pageNumberPos === "bottom-center"
      ? "center"
      : fmt.pageNumberPos === "bottom-right"
      ? "right"
      : "right";
  return `
    @page { size: ${w}mm ${h}mm; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; }
    body { font-family: '${fmt.fontFamily}', 'Times New Roman', serif; font-size: ${fmt.fontSize}pt; line-height: ${fmt.lineHeight}; color: #000; }
    p { text-indent: ${fmt.firstLineIndent}mm; text-align: ${fmt.align}; margin: 0 0 0.2em 0; }
    p.flush { text-indent: 0; }
    h1 { font-size: ${fmt.headingSize}pt; font-weight: bold; text-align: center; text-transform: ${fmt.headingUppercase ? "uppercase" : "none"}; margin: 0 0 0.8em 0; page-break-before: always; }
    h1.first { page-break-before: avoid; }
    h2 { font-size: ${fmt.fontSize}pt; font-weight: bold; margin: 0.8em 0 0.4em 0; }
    .title-page { text-align: center; page-break-after: always; height: ${h - m.top - m.bottom}mm; display: flex; flex-direction: column; }
    .title-page p { text-indent: 0; text-align: center; }
    .tp-top { font-size: ${fmt.fontSize}pt; }
    .tp-mid { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .tp-worktype { font-size: ${fmt.headingSize}pt; font-weight: bold; }
    .tp-meta { text-align: right !important; }
    .tp-meta p { text-align: right !important; }
    .toc-row { display: flex; justify-content: space-between; text-indent: 0; }
    .pagenum { position: fixed; bottom: 8mm; left: 0; right: 0; text-align: ${numPos}; font-size: ${fmt.fontSize}pt; }
    .eskd { position: fixed; top: 0; left: 0; z-index: -1; }
    @media screen { body { background: #f3f3f3; } .doc-page { background: #fff; width: ${w}mm; min-height: ${h}mm; margin: 8mm auto; padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; box-shadow: 0 1px 12px rgba(0,0,0,.18); box-sizing: border-box; position: relative; } }
    @media print { .doc-page { padding: 0; } }
  `;
}

function renderTitlePage(doc: NirDocument): string {
  const t = doc.titleMeta;
  const practice = doc.workMode === "practice";
  const line = (s: string, cls = "") => (s.trim() ? `<p class="${cls}">${esc(s).replace(/\n/g, "<br/>")}</p>` : "");
  return `
  <div class="title-page">
    <div class="tp-top">
      ${line(t.ministry)}
      ${line(t.university)}
      ${line(t.institute)}
      ${line(t.department)}
      ${t.directionCode.trim() ? `<p style="margin-top:.4em">Направление: ${esc(t.directionCode)}</p>` : ""}
      ${t.programName.trim() ? `<p>Программа: «${esc(t.programName)}»</p>` : ""}
    </div>
    <div class="tp-mid">
      <p class="tp-worktype">${esc(t.workType).replace(/\n/g, "<br/>")}</p>
      ${!practice && t.discipline.trim() ? `<p>по дисциплине: «${esc(t.discipline)}»</p>` : ""}
      ${t.topic.trim() ? `<p><b>Тема: ${esc(t.topic)}</b></p>` : ""}
    </div>
    <div class="tp-meta">
      ${t.studentName.trim() ? `<p>Студент${t.studentGroup ? ` гр. ${esc(t.studentGroup)}` : ""}: ${esc(t.studentName)} _________</p>` : ""}
      ${t.supervisorName.trim() ? `<p>${esc(t.supervisorPosition || "Руководитель от УрФУ")}: ${esc(t.supervisorName)} _________</p>` : ""}
      ${practice && t.enterpriseSupervisorName.trim() ? `<p>${esc(t.enterpriseSupervisorPosition || "Руководитель от предприятия")}: ${esc(t.enterpriseSupervisorName)} _________</p>` : ""}
      ${practice && t.practicePeriod.trim() ? `<p>Срок практики: ${esc(t.practicePeriod)}</p>` : ""}
    </div>
    <div class="tp-top" style="margin-top:auto">
      <p>${esc(t.city)} ${esc(t.year)}</p>
    </div>
  </div>`;
}

/** Служебные листы практики не входят в содержание. */
const SERVICE_KINDS = new Set(["task", "schedule", "review"]);

function renderToc(doc: NirDocument): string {
  const rows = doc.sections
    .filter((s) => s.enabled && s.kind !== "title" && s.kind !== "toc" && !SERVICE_KINDS.has(s.kind))
    .map((s) => `<p class="toc-row"><span>${esc(s.heading)}</span><span>...</span></p>`)
    .join("\n");
  return `<h1>СОДЕРЖАНИЕ</h1>${rows}`;
}

function renderSection(s: NirSection, first: boolean): string {
  const cls = first ? ' class="first"' : "";
  if (s.kind === "references") {
    const items = (s.body || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const list = items.map((l, i) => `<p class="flush">${i + 1}. ${esc(l)}</p>`).join("\n");
    return `<h1${cls}>${esc(s.heading)}</h1>${list}`;
  }
  // Служебные листы (задание, график) — строки без абзацного отступа.
  if (s.kind === "schedule" || s.kind === "task") {
    const lines = (s.body || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const body = lines.map((l) => `<p class="flush">${esc(l)}</p>`).join("\n");
    return `<h1${cls}>${esc(s.heading)}</h1>${body}`;
  }
  return `<h1${cls}>${esc(s.heading)}</h1>${textToParagraphs(s.body)}`;
}

/** Собирает тело документа (без титула — он отдельно). */
function renderBody(doc: NirDocument): string {
  const parts: string[] = [];
  const enabled = doc.sections.filter((s) => s.enabled);
  let firstUsed = false;

  // 1. Служебные листы практики (идут сразу после титула, до содержания).
  for (const s of enabled) {
    if (SERVICE_KINDS.has(s.kind)) {
      parts.push(renderSection(s, !firstUsed));
      firstUsed = true;
    }
  }
  // 2. Реферат (для НИР по ГОСТ).
  for (const s of enabled) {
    if (s.kind === "abstract") {
      parts.push(`<h1${!firstUsed ? ' class="first"' : ""}>${esc(s.heading)}</h1>${textToParagraphs(s.body)}`);
      firstUsed = true;
    }
  }
  // 3. Содержание.
  parts.push(renderToc(doc));
  // 4. Остальные разделы.
  for (const s of enabled) {
    if (s.kind === "abstract" || SERVICE_KINDS.has(s.kind)) continue;
    parts.push(renderSection(s, false));
  }
  return parts.join("\n");
}

/** Полный HTML документа для предпросмотра / печати / PDF. */
export function buildDocHtml(doc: NirDocument): string {
  const fmt = doc.format;
  const css = buildCss(fmt);
  const frame = eskdFrameSvg(fmt);
  const pageNum = fmt.pageNumbers ? '<div class="pagenum"></div>' : "";
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><title>${esc(doc.titleMeta.topic || "НИР")}</title>
<style>${css}</style></head>
<body>
  <div class="doc-page">
    ${frame}
    ${renderTitlePage(doc)}
    ${renderBody(doc)}
    ${pageNum}
  </div>
</body></html>`;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob(["\ufeff", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeName(doc: NirDocument): string {
  const base = (doc.titleMeta.topic || doc.titleMeta.discipline || "НИР").trim();
  return base.replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "_").slice(0, 60) || "НИР";
}

/** Экспорт в Word (.doc) — открывается в MS Word/LibreOffice. */
export function exportToWord(doc: NirDocument) {
  const fmt = doc.format;
  const eff = applyEskdFrameMargins(fmt);
  const { w, h } = pageDims(fmt);
  const m = eff.margins;
  // Word-специфичный @page через mso-* + те же общие стили.
  const wordCss = `
    @page Section1 { size: ${w}mm ${h}mm; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; mso-page-numbers: ${fmt.pageNumbers ? "1" : "0"}; }
    div.Section1 { page: Section1; }
    body { font-family: '${fmt.fontFamily}', 'Times New Roman', serif; font-size: ${fmt.fontSize}pt; line-height: ${fmt.lineHeight}; }
    p { text-indent: ${fmt.firstLineIndent}mm; text-align: ${fmt.align}; margin: 0 0 0.2em 0; }
    p.flush, .title-page p, .toc-row { text-indent: 0; }
    .title-page { text-align: center; }
    .title-page p { text-align: center; }
    .tp-meta p { text-align: right; }
    .tp-worktype { font-size: ${fmt.headingSize}pt; font-weight: bold; }
    h1 { font-size: ${fmt.headingSize}pt; font-weight: bold; text-align: center; text-transform: ${fmt.headingUppercase ? "uppercase" : "none"}; page-break-before: always; mso-break-type: page-break; }
    .toc-row { display: block; }
  `;
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8">
<title>${esc(doc.titleMeta.topic || "НИР")}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>${wordCss}</style></head>
<body><div class="Section1">
${renderTitlePage(doc)}
${renderBody(doc)}
</div></body></html>`;
  downloadBlob(html, `${safeName(doc)}.doc`, "application/msword");
}

/** Экспорт в PDF — открывает print-окно с готовым оформлением. */
export function exportToPdf(doc: NirDocument) {
  const html = buildDocHtml(doc);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Разрешите всплывающие окна, чтобы сформировать PDF.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Дать браузеру отрисовать перед печатью.
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 350);
  };
}