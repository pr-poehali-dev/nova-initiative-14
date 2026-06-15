import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  buildFlyerSvg,
  buildFlyerUrl,
  flyerFileName,
  sanitizeUtm,
  FORMATS,
  THEMES,
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
 * Редактор печатной рекламы: листовка А6 с двумя QR (CAE + Диплом).
 * Отдельно от онлайн-рекламы — здесь готовим макет под типографию.
 * Метка кампании (utm_campaign) зашивается в оба QR, по ней аналитика
 * различает тираж/место раздачи в разделе «Статистика».
 * Экспорт — векторный SVG (А6 с вылетами 3 мм), открывается в CorelDRAW.
 * Только для админа, скрыто от поисковиков.
 */
const PrintFlyer = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [source, setSource] = useState("flyer_urfu");
  const [medium, setMedium] = useState("qr");
  const [campaign, setCampaign] = useState("");
  const [format, setFormat] = useState<FlyerFormatId>("a6");
  const [theme, setTheme] = useState<FlyerThemeId>("light");
  const [svg, setSvg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const opts: FlyerOptions = useMemo(
    () => ({ source, medium, campaign, format, theme }),
    [source, medium, campaign, format, theme],
  );

  const caeUrl = buildFlyerUrl("/urfu_qr_cae", opts);
  const diplomUrl = buildFlyerUrl("/urfu_qr_diplom", opts);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    buildFlyerSvg(opts)
      .then((s) => {
        if (alive) setSvg(s);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [opts]);

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

  const download = () => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = flyerFileName(opts);
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setSource(p.source);
    setMedium(p.medium);
    setCampaign(p.campaign);
  };

  const previewSrc = svg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    : "";

  return (
    <>
      <Helmet>
        <title>Редактор печатных листовок · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/admin/print`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1000px] mx-auto px-4 pt-20 md:pt-24 pb-12">
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
              to="/admin/qr"
              className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
            >
              <Icon name="QrCode" size={12} />QR онлайн
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
          Листовка · два QR
        </h1>
        <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-6 max-w-[640px]">
          Выберите формат и оформление, задайте метку тиража — она зашьётся в оба
          QR (Диплом + CAE). Скачайте векторный SVG (с вылетами 3 мм и метками реза)
          и откройте в CorelDRAW. Переходы по этому тиражу видны в «Статистике».
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Настройки */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Формат">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as FlyerFormatId)}
                  className="drawing-input w-full"
                >
                  {FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Оформление">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as FlyerThemeId)}
                  className="drawing-input w-full"
                >
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Источник (utm_source)">
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="flyer_urfu"
                className="drawing-input w-full"
              />
            </Field>
            <Field label="Канал (utm_medium)">
              <input
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                placeholder="qr"
                className="drawing-input w-full"
              />
            </Field>
            <Field label="Кампания / тираж (utm_campaign)">
              <input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="korpus_mehmash"
                className="drawing-input w-full"
              />
              <span className="font-gost text-[10px] text-[var(--drawing-line-thin)] block mt-1">
                По этой метке статистика различит конкретный тираж/место раздачи.
              </span>
            </Field>

            <div>
              <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
                Быстрые пресеты
              </p>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(p)}
                    className="btn-drawing text-[11px]"
                  >
                    {p.campaign || "без кампании"}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-[var(--drawing-line)]/40 bg-[var(--drawing-bg)] p-3 space-y-2">
              <div>
                <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
                  QR «Диплом / ВКР» ведёт на
                </p>
                <p className="font-mono text-[10px] break-all text-[var(--drawing-line)]">
                  {diplomUrl}
                </p>
              </div>
              <div>
                <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
                  QR «CAE-расчёты» ведёт на
                </p>
                <p className="font-mono text-[10px] break-all text-[var(--drawing-line)]">
                  {caeUrl}
                </p>
              </div>
            </div>

            <button
              onClick={download}
              disabled={!svg || busy}
              className={`btn-drawing btn-drawing-accent w-full text-sm inline-flex items-center justify-center gap-1.5 ${
                !svg || busy ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Icon name="Download" size={16} />
              Скачать SVG для Corel
            </button>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
              Файл: {flyerFileName(opts)} · цвет в макете RGB — в Corel переведите
              в CMYK перед отправкой в типографию.
            </p>
          </div>

          {/* Превью макета */}
          <div className="space-y-2">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
              Превью макета (с вылетами и метками реза)
            </p>
            <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-4 flex items-center justify-center min-h-[360px]">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Превью листовки А6"
                  className="max-h-[440px] w-auto shadow-lg"
                />
              ) : (
                <p className="font-gost text-sm text-[var(--drawing-line-thin)] py-20">
                  Готовим макет…
                </p>
              )}
            </div>
            {sanitizeUtm(campaign) && (
              <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
                Метка тиража в QR: <span className="text-[var(--drawing-accent)]">{sanitizeUtm(campaign)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

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