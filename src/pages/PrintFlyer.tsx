import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  buildFlyerSvg,
  buildFlyerUrl,
  downloadFlyerSvg,
  downloadFlyerPng,
  downloadFlyerPdf,
  sanitizeUtm,
  DEFAULT_FLYER,
  FORMATS,
  THEMES,
  QR_LANDINGS,
  type FlyerFormatId,
  type FlyerThemeId,
  type FlyerOptions,
} from "@/lib/print-flyer";

/** Пресеты площадок раздачи (та же логика меток, что в QR-генераторе). */
const PRESETS = [
  { source: "flyer_urfu", medium: "qr", campaign: "" },
  { source: "flyer_urfu", medium: "qr", campaign: "korpus_mehmash" },
  { source: "flyer_urfu", medium: "qr", campaign: "kafedra" },
  { source: "stand_urfu", medium: "qr", campaign: "dni_otkrytyh_dverei" },
];

/**
 * Редактор печатной рекламы: листовка с одним или двумя QR.
 * Отдельно от онлайн-рекламы — здесь готовим макет под типографию.
 * Все тексты редактируются, можно выбрать формат, оформление, куда ведут QR
 * и сколько их. Метка кампании (utm_campaign) зашивается в QR — по ней
 * аналитика различает тираж/место раздачи. Экспорт: SVG (Corel), PNG, PDF.
 * Только для админа, скрыто от поисковиков.
 */
const PrintFlyer = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [o, setO] = useState<FlyerOptions>(DEFAULT_FLYER);
  const [svg, setSvg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    buildFlyerSvg(o).then((s) => {
      if (alive) setSvg(s);
    });
    return () => {
      alive = false;
    };
  }, [o]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }

  if (!user || !user.is_admin) {
    setTimeout(() => nav("/account", { replace: true }), 0);
    return null;
  }

  /** Точечное обновление поля опций. */
  const set = (patch: Partial<FlyerOptions>) => setO((prev) => ({ ...prev, ...patch }));
  /** Обновление одного QR-блока. */
  const setQr = (i: 0 | 1, patch: Partial<FlyerOptions["qrBlocks"][number]>) =>
    setO((prev) => {
      const next: FlyerOptions["qrBlocks"] = [
        { ...prev.qrBlocks[0] },
        { ...prev.qrBlocks[1] },
      ];
      next[i] = { ...next[i], ...patch };
      return { ...prev, qrBlocks: next };
    });

  const applyPreset = (p: (typeof PRESETS)[number]) =>
    set({ source: p.source, medium: p.medium, campaign: p.campaign });

  const exportFile = async (kind: "svg" | "png" | "pdf") => {
    if (!svg) return;
    setBusy(true);
    try {
      if (kind === "svg") downloadFlyerSvg(svg, o);
      else if (kind === "png") await downloadFlyerPng(svg, o);
      else await downloadFlyerPdf(svg, o);
    } finally {
      setBusy(false);
    }
  };

  const previewSrc = svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : "";
  const qrCountUsed = o.qrCount;

  return (
    <>
      <Helmet>
        <title>Редактор печатных листовок · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/admin/print`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1100px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Админ · Печатная реклама
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/generator"
              className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
            >
              <Icon name="ArrowLeft" size={12} />Онлайн-макеты
            </Link>
            <Link
              to="/admin/stats"
              className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
            >
              <Icon name="BarChart3" size={12} />К статистике
            </Link>
          </div>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-2">
          Редактор листовки
        </h1>
        <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-6 max-w-[680px]">
          Меняйте тексты, формат и оформление, выбирайте куда ведут QR и сколько их.
          Метка тиража зашивается в QR — переходы видны в «Статистике». Скачать можно
          в SVG (для CorelDRAW), PNG или PDF.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ── Настройки ── */}
          <div className="space-y-5">
            {/* Формат / тема / кол-во QR */}
            <Group title="Макет">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Формат">
                  <select
                    value={o.format}
                    onChange={(e) => set({ format: e.target.value as FlyerFormatId })}
                    className="drawing-input w-full"
                  >
                    {FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Оформление">
                  <select
                    value={o.theme}
                    onChange={(e) => set({ theme: e.target.value as FlyerThemeId })}
                    className="drawing-input w-full"
                  >
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Сколько QR-кодов">
                <div className="flex gap-1">
                  {[1, 2].map((n) => (
                    <button
                      key={n}
                      onClick={() => set({ qrCount: n as 1 | 2 })}
                      className={`btn-drawing text-xs flex-1 ${
                        o.qrCount === n ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]" : ""
                      }`}
                    >
                      {n === 1 ? "Один крупный" : "Два в ряд"}
                    </button>
                  ))}
                </div>
              </Field>
            </Group>

            {/* Тексты */}
            <Group title="Тексты">
              <Field label="Логотип / марка">
                <input value={o.logo} onChange={(e) => set({ logo: e.target.value })} className="drawing-input w-full" />
              </Field>
              <Field label="Надзаголовок">
                <input value={o.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} className="drawing-input w-full" />
              </Field>
              <Field label="Заголовок (Enter — перенос строки)">
                <textarea
                  value={o.title}
                  onChange={(e) => set({ title: e.target.value })}
                  rows={2}
                  className="drawing-input w-full resize-none"
                />
              </Field>
              <Field label="Подзаголовок (инструкция)">
                <input value={o.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="drawing-input w-full" />
              </Field>
            </Group>

            {/* QR-блоки */}
            <Group title={qrCountUsed === 2 ? "Два QR-кода" : "QR-код"}>
              {Array.from({ length: qrCountUsed }).map((_, idx) => {
                const i = idx as 0 | 1;
                const b = o.qrBlocks[i];
                return (
                  <div key={i} className="border border-[var(--drawing-line)]/40 p-3 space-y-2">
                    <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)]">
                      QR {qrCountUsed === 2 ? i + 1 : ""}
                    </p>
                    <Field label="Куда ведёт">
                      <select
                        value={b.landing}
                        onChange={(e) => setQr(i, { landing: e.target.value })}
                        className="drawing-input w-full"
                      >
                        {QR_LANDINGS.map((l) => (
                          <option key={l.path} value={l.path}>{l.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Подпись">
                      <input value={b.caption} onChange={(e) => setQr(i, { caption: e.target.value })} className="drawing-input w-full" />
                    </Field>
                    <Field label="Описание">
                      <textarea
                        value={b.note}
                        onChange={(e) => setQr(i, { note: e.target.value })}
                        rows={2}
                        className="drawing-input w-full resize-none"
                      />
                    </Field>
                    <p className="font-mono text-[10px] break-all text-[var(--drawing-line-thin)]">
                      {buildFlyerUrl(b.landing, o)}
                    </p>
                  </div>
                );
              })}
            </Group>

            {/* Метки и адрес */}
            <Group title="Метка тиража и адрес">
              <div className="grid grid-cols-3 gap-2">
                <Field label="utm_source">
                  <input value={o.source} onChange={(e) => set({ source: e.target.value })} className="drawing-input w-full" />
                </Field>
                <Field label="utm_medium">
                  <input value={o.medium} onChange={(e) => set({ medium: e.target.value })} className="drawing-input w-full" />
                </Field>
                <Field label="utm_campaign">
                  <input value={o.campaign} onChange={(e) => set({ campaign: e.target.value })} className="drawing-input w-full" />
                </Field>
              </div>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p, i) => (
                  <button key={i} onClick={() => applyPreset(p)} className="btn-drawing text-[11px]">
                    {p.campaign || "без кампании"}
                  </button>
                ))}
              </div>
              <Field label="Подпись адресного блока">
                <input value={o.addressLabel} onChange={(e) => set({ addressLabel: e.target.value })} className="drawing-input w-full" />
              </Field>
              <Field label="Адрес">
                <input value={o.address} onChange={(e) => set({ address: e.target.value })} className="drawing-input w-full" />
              </Field>
            </Group>
          </div>

          {/* ── Превью + экспорт ── */}
          <div className="space-y-3 md:sticky md:top-24 self-start">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
              Превью (с вылетами и метками реза)
            </p>
            <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-4 flex items-center justify-center min-h-[360px]">
              {previewSrc ? (
                <img src={previewSrc} alt="Превью листовки" className="max-h-[460px] w-auto shadow-lg" />
              ) : (
                <p className="font-gost text-sm text-[var(--drawing-line-thin)] py-20">Готовим макет…</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => exportFile("svg")}
                disabled={!svg || busy}
                className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Icon name="Download" size={14} />SVG
              </button>
              <button
                onClick={() => exportFile("png")}
                disabled={!svg || busy}
                className={`btn-drawing text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Icon name="Image" size={14} />PNG
              </button>
              <button
                onClick={() => exportFile("pdf")}
                disabled={!svg || busy}
                className={`btn-drawing text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Icon name="FileText" size={14} />PDF
              </button>
            </div>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
              SVG — для CorelDRAW (вектор). PNG/PDF — 300 dpi для быстрой проверки.
              Цвет в макете RGB — в Corel переведите в CMYK перед типографией.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

export default PrintFlyer;
