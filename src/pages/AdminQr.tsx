import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import QRCode from "qrcode";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";

/** Базовые QR-лендинги, которые умеет различать аналитика (тип qr_flyer). */
const QR_LANDINGS = [
  { path: "/urfu_qr_cae", label: "CAE-сервис (расчёты)" },
  { path: "/urfu_qr_diplom", label: "Наставничество по диплому" },
];

/** Готовые пресеты площадок раздачи флаеров. */
const PRESETS = [
  { source: "flyer_urfu", medium: "qr", campaign: "" },
  { source: "flyer_urfu", medium: "qr", campaign: "korpus_mehmash" },
  { source: "flyer_urfu", medium: "qr", campaign: "kafedra" },
  { source: "stand_urfu", medium: "qr", campaign: "dni_otkrytyh_dverei" },
];

/** Чистит значение UTM: латиница, цифры, дефис и подчёркивание. */
function sanitize(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

/**
 * Генератор QR-кодов с UTM-метками для печатных флаеров. Только для админа.
 * Каждый QR ведёт на QR-лендинг с зашитыми utm_source/medium/campaign —
 * аналитика различает конкретные тиражи и площадки раздачи.
 */
const AdminQr = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [landing, setLanding] = useState(QR_LANDINGS[0].path);
  const [source, setSource] = useState("flyer_urfu");
  const [medium, setMedium] = useState("qr");
  const [campaign, setCampaign] = useState("");
  const [dataUrl, setDataUrl] = useState<string>("");

  const targetUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (sanitize(source)) params.set("utm_source", sanitize(source));
    if (sanitize(medium)) params.set("utm_medium", sanitize(medium));
    if (sanitize(campaign)) params.set("utm_campaign", sanitize(campaign));
    const qs = params.toString();
    return `${SITE_URL}${landing}${qs ? `?${qs}` : ""}`;
  }, [landing, source, medium, campaign]);

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      width: 900,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#1a1a2e", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [targetUrl]);

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

  const fileName = `qr_${landing.replace(/\//g, "")}_${sanitize(campaign) || "base"}.png`;

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setSource(p.source);
    setMedium(p.medium);
    setCampaign(p.campaign);
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(targetUrl);
  };

  return (
    <>
      <Helmet>
        <title>Генератор QR-кодов · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/admin/qr`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1000px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Админ · QR-флаеры
          </p>
          <Link
            to="/admin/stats"
            className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
          >
            <Icon name="BarChart3" size={12} />К статистике
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-2">
          QR-коды с UTM-метками
        </h1>
        <p className="font-gost text-sm text-[var(--drawing-line-thin)] mb-6 max-w-[640px]">
          Задайте площадку и кампанию — получите QR для печати на флаере. Аналитика
          в разделе «Статистика» различит, с какого именно флаера пришёл человек.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Левая колонка — настройки */}
          <div className="space-y-4">
            <Field label="Куда ведёт QR (лендинг)">
              <select
                value={landing}
                onChange={(e) => setLanding(e.target.value)}
                className="input-drawing w-full"
              >
                {QR_LANDINGS.map((l) => (
                  <option key={l.path} value={l.path}>
                    {l.label} ({l.path})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Источник (utm_source)">
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="flyer_urfu"
                className="input-drawing w-full"
              />
            </Field>

            <Field label="Канал (utm_medium)">
              <input
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                placeholder="qr"
                className="input-drawing w-full"
              />
            </Field>

            <Field label="Кампания / тираж (utm_campaign)">
              <input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="korpus_mehmash"
                className="input-drawing w-full"
              />
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
          </div>

          {/* Правая колонка — превью QR */}
          <div className="space-y-3">
            <div className="border-2 border-[var(--drawing-line)] bg-white p-4 flex items-center justify-center">
              {dataUrl ? (
                <img src={dataUrl} alt="QR-код" className="w-full max-w-[280px]" />
              ) : (
                <p className="font-gost text-sm text-[var(--drawing-line-thin)] py-20">
                  Готовим QR…
                </p>
              )}
            </div>

            <div className="border border-[var(--drawing-line)]/40 bg-[var(--drawing-bg)] p-3">
              <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
                Ссылка в QR-коде
              </p>
              <p className="font-mono text-[11px] break-all text-[var(--drawing-line)]">
                {targetUrl}
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={dataUrl || "#"}
                download={fileName}
                className={`btn-drawing flex-1 text-center text-xs inline-flex items-center justify-center gap-1 ${
                  dataUrl ? "" : "pointer-events-none opacity-50"
                }`}
              >
                <Icon name="Download" size={14} />
                Скачать PNG
              </a>
              <button
                onClick={copyLink}
                className="btn-drawing flex-1 text-xs inline-flex items-center justify-center gap-1"
              >
                <Icon name="Copy" size={14} />
                Копировать ссылку
              </button>
            </div>
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

export default AdminQr;
