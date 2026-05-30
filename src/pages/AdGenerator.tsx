import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  AD_FORMATS,
  DEFAULT_AD,
  renderAd,
  exportPng,
  exportJpg,
  exportPdf,
  type AdContent,
  type AdFormat,
  type AdTheme,
} from "@/lib/adGenerator";
import { listChangelog } from "@/lib/notifications";

const CATEGORY_WORD: Record<string, string> = {
  feature: "Новое",
  improvement: "Улучшение",
  fix: "Исправление",
  breaking: "Важно",
};

const THEMES: { key: AdTheme; label: string }[] = [
  { key: "light", label: "Светлая" },
  { key: "dark", label: "Тёмная" },
  { key: "accent", label: "Акцентная" },
];

/**
 * Генератор рекламных материалов. Доступен ТОЛЬКО администратору.
 * Скрыт от поисковых роботов (noindex,nofollow + Disallow в robots.txt).
 * Контент задаётся вручную; макет рисуется на canvas, выгрузка — PNG/JPG/PDF.
 */
const AdGenerator = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ad, setAd] = useState<AdContent>(DEFAULT_AD);

  // Перерисовываем превью при любом изменении контента
  useEffect(() => {
    if (canvasRef.current) renderAd(canvasRef.current, ad);
  }, [ad]);

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }

  // Доступ только администратору
  if (!user || !user.is_admin) {
    setTimeout(() => nav("/account", { replace: true }), 0);
    return null;
  }

  const set = (patch: Partial<AdContent>) => setAd((a) => ({ ...a, ...patch }));
  const spec = AD_FORMATS.find((f) => f.key === ad.format) || AD_FORMATS[0];

  // Пресет «Новости»: тянет последние версии CAE из журнала и собирает пост
  // для соцсетей (отчёт об обновлениях за период) — одной кнопкой.
  const applyNewsPreset = async () => {
    const res = await listChangelog(6);
    if (!res.ok || !res.data || res.data.changelog.length === 0) {
      alert("В журнале версий пока нет записей");
      return;
    }
    const entries = res.data.changelog;
    const month = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    const latest = entries[0];
    const lines = entries
      .slice(0, 5)
      .map((e) => `• v${e.version} — ${CATEGORY_WORD[e.category] || ""}: ${e.title}`)
      .join("\n");
    set({
      eyebrow: "Обновления CAE-сервиса",
      title: `Что нового\n${month}`,
      subtitle: `Свежая версия v${latest.version}`,
      body: lines,
      cta: "Все обновления",
      site: "диплом-инж.рф/cae/changelog",
    });
  };

  return (
    <>
      <Helmet>
        <title>Генератор рекламы · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/admin/generator`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1100px] mx-auto px-4 pt-20 md:pt-24 pb-12 overflow-x-hidden">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Админ · Маркетинг
          </p>
          <Link
            to="/account"
            className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
          >
            <Icon name="ArrowLeft" size={12} />К кабинету
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-1">
          Генератор рекламы
        </h1>
        <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-6">
          Заполните поля, выберите формат и тему — затем выгрузите макет в PNG, JPG или PDF.
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr] [&>*]:min-w-0">
          {/* Форма */}
          <div className="space-y-4">
            <Field label="Готовые жанры">
              <button
                type="button"
                onClick={applyNewsPreset}
                className="btn-drawing text-xs inline-flex items-center border-[var(--drawing-accent)] text-[var(--drawing-accent)] w-full justify-center"
                title="Собрать пост-отчёт об обновлениях из журнала версий CAE"
              >
                <Icon name="Newspaper" size={14} className="mr-1.5" />
                Новости: дайджест обновлений CAE
              </button>
            </Field>

            <Field label="Формат">
              <select
                value={ad.format}
                onChange={(e) => set({ format: e.target.value as AdFormat })}
                className="drawing-input text-sm"
              >
                {AD_FORMATS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label} — {f.hint}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Тема оформления">
              <div className="flex gap-1">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => set({ theme: t.key })}
                    className={`btn-drawing text-[10px] flex-1 ${
                      ad.theme === t.key ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]" : ""
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Надзаголовок">
              <input
                value={ad.eyebrow}
                onChange={(e) => set({ eyebrow: e.target.value })}
                className="drawing-input text-sm"
                placeholder="Инженерные расчёты онлайн"
              />
            </Field>

            <Field label="Заголовок (Enter — перенос строки)">
              <textarea
                value={ad.title}
                onChange={(e) => set({ title: e.target.value })}
                rows={2}
                className="drawing-input text-sm resize-y"
                placeholder="CAE-расчёты за минуты"
              />
            </Field>

            <Field label="Подзаголовок">
              <input
                value={ad.subtitle}
                onChange={(e) => set({ subtitle: e.target.value })}
                className="drawing-input text-sm"
              />
            </Field>

            <Field label="Описание">
              <textarea
                value={ad.body}
                onChange={(e) => set({ body: e.target.value })}
                rows={3}
                className="drawing-input text-sm resize-y"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Призыв (кнопка)">
                <input
                  value={ad.cta}
                  onChange={(e) => set({ cta: e.target.value })}
                  className="drawing-input text-sm"
                />
              </Field>
              <Field label="Сайт">
                <input
                  value={ad.site}
                  onChange={(e) => set({ site: e.target.value })}
                  className="drawing-input text-sm"
                />
              </Field>
            </div>

            <div className="border-t border-[var(--drawing-line)]/20 pt-4">
              <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
                Выгрузить макет
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => canvasRef.current && exportPng(canvasRef.current, ad)}
                  className="btn-drawing btn-drawing-accent text-xs inline-flex items-center"
                >
                  <Icon name="Image" size={14} className="mr-1.5" />PNG
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current && exportJpg(canvasRef.current, ad)}
                  className="btn-drawing text-xs inline-flex items-center"
                >
                  <Icon name="Image" size={14} className="mr-1.5" />JPG
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current && exportPdf(canvasRef.current, ad)}
                  className="btn-drawing text-xs inline-flex items-center"
                >
                  <Icon name="FileText" size={14} className="mr-1.5" />PDF
                </button>
              </div>
            </div>
          </div>

          {/* Превью */}
          <div className="lg:sticky lg:top-24 self-start">
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
              Превью · {spec.width}×{spec.height}
            </p>
            <div className="border-[2px] border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-3 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto shadow-lg"
                style={{ maxHeight: "70vh" }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export default AdGenerator;