import { useEffect, useState, useCallback } from "react";
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
  AD_SOURCES,
  type FlyerFormatId,
  type FlyerThemeId,
  type FlyerOptions,
} from "@/lib/print-flyer";
import {
  fetchAdCampaigns,
  saveAdCampaign,
  orderCampaignPrint,
  formatRub,
  type AdCampaign,
} from "@/lib/adCampaigns";

/**
 * Редактор печатной рекламы с управлением кампаниями.
 * Кампания = метка (utm_campaign). Выбирается из списка или создаётся новая.
 * Сверху — статистика выбранной кампании (визиты, регистрации, доход, тираж).
 * Кампания, заказанная в печать, блокируется от редактирования; повторный
 * заказ печати разрешён (тиражи суммируются). Только для админа.
 */
const PrintFlyer = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [o, setO] = useState<FlyerOptions>(DEFAULT_FLYER);
  const [svg, setSvg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>(""); // "" = новая
  const [newName, setNewName] = useState("");
  const [printModal, setPrintModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const selected = campaigns.find((c) => c.slug === selectedSlug) || null;
  const isLocked = selected?.isLocked ?? false;

  const reloadCampaigns = useCallback(async () => {
    const r = await fetchAdCampaigns();
    if (r.ok && r.data) setCampaigns(r.data.campaigns);
  }, []);

  useEffect(() => {
    reloadCampaigns();
  }, [reloadCampaigns]);

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

  const set = (patch: Partial<FlyerOptions>) => {
    if (isLocked) return;
    setO((prev) => ({ ...prev, ...patch }));
  };
  const setQr = (i: 0 | 1, patch: Partial<FlyerOptions["qrBlocks"][number]>) => {
    if (isLocked) return;
    setO((prev) => {
      const next: FlyerOptions["qrBlocks"] = [{ ...prev.qrBlocks[0] }, { ...prev.qrBlocks[1] }];
      next[i] = { ...next[i], ...patch };
      return { ...prev, qrBlocks: next };
    });
  };

  /** Выбор кампании из списка — загружаем её конфигурацию. */
  const selectCampaign = (slug: string) => {
    setSelectedSlug(slug);
    setSaveMsg(null);
    if (!slug) {
      setO({ ...DEFAULT_FLYER, campaign: "" });
      setNewName("");
      return;
    }
    const c = campaigns.find((x) => x.slug === slug);
    if (c) {
      setO(c.config ? { ...DEFAULT_FLYER, ...c.config, campaign: c.slug } : { ...DEFAULT_FLYER, campaign: c.slug });
      setNewName(c.name);
    }
  };

  /** Сохранить текущую кампанию (создаёт или обновляет). */
  const onSave = async () => {
    const slug = sanitizeUtm(o.campaign);
    if (!slug) {
      setSaveMsg("Укажите метку кампании (utm_campaign)");
      return;
    }
    setBusy(true);
    const r = await saveAdCampaign({ slug, name: newName || slug, config: o });
    setBusy(false);
    if (r.ok) {
      setSaveMsg("Сохранено");
      await reloadCampaigns();
      setSelectedSlug(slug);
    } else {
      setSaveMsg(r.message || "Не удалось сохранить");
    }
  };

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
            <Link to="/admin/generator" className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1">
              <Icon name="ArrowLeft" size={12} />Онлайн-макеты
            </Link>
            <Link to="/admin/stats" className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1">
              <Icon name="BarChart3" size={12} />К статистике
            </Link>
          </div>
        </div>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide mb-4">
          Рекламные кампании
        </h1>

        {/* ── Выбор кампании ── */}
        <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-4 mb-4">
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <Field label="Рекламная кампания">
              <select
                value={selectedSlug}
                onChange={(e) => selectCampaign(e.target.value)}
                className="drawing-input w-full"
              >
                <option value="">+ Новая кампания</option>
                {campaigns.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.slug}){c.isLocked ? " · в печати" : ""}
                  </option>
                ))}
              </select>
            </Field>
            {isLocked && (
              <span className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-accent)] inline-flex items-center gap-1 pb-2">
                <Icon name="Lock" size={13} /> Заказана — редактирование закрыто
              </span>
            )}
          </div>

          {/* Статистика выбранной кампании */}
          {selected && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <Stat label="Напечатано" value={selected.stats.printed.toLocaleString("ru-RU")} icon="Printer" />
              <Stat label="Затраты на печать" value={formatRub(selected.stats.print_cost_kopecks)} icon="Wallet" />
              <Stat label="Визиты" value={String(selected.stats.visits)} icon="Eye" />
              <Stat label={`Регистрации (${selected.stats.conversion}%)`} value={String(selected.stats.signups)} icon="UserPlus" accent />
              <Stat label="Доход" value={formatRub(selected.stats.revenue_kopecks)} icon="TrendingUp" accent />
              <Stat label="Цена регистрации" value={`${selected.stats.cost_per_signup_rub} ₽`} icon="Tag" />
              <Stat label="Сред. приглашений" value={String(selected.stats.avg_invited)} icon="Users" />
              <Stat label="Цена за листовку" value={formatRub(selected.stats.unit_price_kopecks)} icon="FileText" />
            </div>
          )}

          {/* История заказов печати */}
          {selected && selected.stats.orders.length > 0 && (
            <div className="mt-4">
              <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-2">
                История тиражей ({selected.stats.orders.length})
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 pb-1 border-b border-[var(--drawing-line)]/30">
                  <span className="flex-1 font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Дата</span>
                  <span className="w-24 text-right font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Тираж</span>
                  <span className="w-24 text-right font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Стоимость</span>
                  <span className="w-20 text-right font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">За шт.</span>
                </div>
                {selected.stats.orders.map((ord) => (
                  <div key={ord.id} className="flex items-center gap-2 py-0.5">
                    <span className="flex-1 font-mono text-[11px] text-[var(--drawing-line)]">{ord.created}</span>
                    <span className="w-24 text-right font-mono text-[11px] text-[var(--drawing-line)]">{ord.quantity.toLocaleString("ru-RU")} шт</span>
                    <span className="w-24 text-right font-mono text-[11px] text-[var(--drawing-line)]">{formatRub(ord.total_kopecks)}</span>
                    <span className="w-20 text-right font-mono text-[10px] text-[var(--drawing-line-thin)]">
                      {ord.quantity > 0 ? formatRub(Math.round(ord.total_kopecks / ord.quantity)) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Действия с кампанией */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название кампании"
              disabled={isLocked}
              className="drawing-input flex-1 min-w-[160px] disabled:opacity-50"
            />
            <button
              onClick={onSave}
              disabled={busy || isLocked}
              className={`btn-drawing text-xs inline-flex items-center gap-1 ${busy || isLocked ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Icon name="Save" size={14} />Сохранить
            </button>
            <button
              onClick={() => setPrintModal(true)}
              disabled={busy || !sanitizeUtm(o.campaign)}
              className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1 ${busy || !sanitizeUtm(o.campaign) ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Icon name="Printer" size={14} />Заказано в печать
            </button>
            {saveMsg && <span className="font-gost text-[11px] text-[var(--drawing-line-thin)]">{saveMsg}</span>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ── Настройки ── */}
          <div className={`space-y-5 ${isLocked ? "opacity-60 pointer-events-none" : ""}`}>
            <Group title="Макет">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Формат">
                  <select value={o.format} onChange={(e) => set({ format: e.target.value as FlyerFormatId })} className="drawing-input w-full">
                    {FORMATS.map((f) => (<option key={f.id} value={f.id}>{f.label}</option>))}
                  </select>
                </Field>
                <Field label="Оформление">
                  <select value={o.theme} onChange={(e) => set({ theme: e.target.value as FlyerThemeId })} className="drawing-input w-full">
                    {THEMES.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
                  </select>
                </Field>
              </div>
              <Field label="Сколько QR-кодов">
                <div className="flex gap-1">
                  {[1, 2].map((n) => (
                    <button key={n} onClick={() => set({ qrCount: n as 1 | 2 })}
                      className={`btn-drawing text-xs flex-1 ${o.qrCount === n ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]" : ""}`}>
                      {n === 1 ? "Один крупный" : "Два в ряд"}
                    </button>
                  ))}
                </div>
              </Field>
              <Toggle label="Метки реза (область для отрезания)" on={o.showTrimMarks} onToggle={() => set({ showTrimMarks: !o.showTrimMarks })} />
              <Toggle label="Подпись «тираж: …» (для учёта на мероприятиях)" on={o.showCampaignNote} onToggle={() => set({ showCampaignNote: !o.showCampaignNote })} />
            </Group>

            <Group title="Тексты">
              <Field label="Логотип / марка">
                <input value={o.logo} onChange={(e) => set({ logo: e.target.value })} className="drawing-input w-full" />
              </Field>
              <Field label="Надзаголовок">
                <input value={o.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} className="drawing-input w-full" />
              </Field>
              <Field label="Заголовок (Enter — перенос строки)">
                <textarea value={o.title} onChange={(e) => set({ title: e.target.value })} rows={2} className="drawing-input w-full resize-none" />
              </Field>
              <Field label="Подзаголовок (инструкция)">
                <input value={o.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="drawing-input w-full" />
              </Field>
            </Group>

            <Group title={qrCountUsed === 2 ? "Два QR-кода" : "QR-код"}>
              {Array.from({ length: qrCountUsed }).map((_, idx) => {
                const i = idx as 0 | 1;
                const b = o.qrBlocks[i];
                return (
                  <div key={i} className="border border-[var(--drawing-line)]/40 p-3 space-y-2">
                    <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-accent)]">QR {qrCountUsed === 2 ? i + 1 : ""}</p>
                    <Field label="Куда ведёт">
                      <select value={b.landing} onChange={(e) => setQr(i, { landing: e.target.value })} className="drawing-input w-full">
                        {QR_LANDINGS.map((l) => (<option key={l.path} value={l.path}>{l.label}</option>))}
                      </select>
                    </Field>
                    <Field label="Подпись">
                      <input value={b.caption} onChange={(e) => setQr(i, { caption: e.target.value })} className="drawing-input w-full" />
                    </Field>
                    <Field label="Описание">
                      <textarea value={b.note} onChange={(e) => setQr(i, { note: e.target.value })} rows={2} className="drawing-input w-full resize-none" />
                    </Field>
                    <p className="font-mono text-[10px] break-all text-[var(--drawing-line-thin)]">{buildFlyerUrl(b.landing, o)}</p>
                  </div>
                );
              })}
            </Group>

            <Group title="Метка тиража и адрес">
              <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-snug border-l-2 border-[var(--drawing-accent)] pl-2">
                UTM-метки зашиваются в ссылку QR и показывают в «Статистике», откуда пришёл человек. Обычно меняют только последнюю — тираж.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Field label="utm_source">
                  <select value={o.source} onChange={(e) => set({ source: e.target.value })} className="drawing-input w-full">
                    {AD_SOURCES.map((s) => (<option key={s.value} value={s.value}>{s.label} ({s.value})</option>))}
                  </select>
                  <span className="font-gost text-[9px] text-[var(--drawing-line-thin)] block mt-1 leading-tight">Тип носителя рекламы.</span>
                </Field>
                <Field label="utm_medium">
                  <input value={o.medium} onChange={(e) => set({ medium: e.target.value })} className="drawing-input w-full" />
                  <span className="font-gost text-[9px] text-[var(--drawing-line-thin)] block mt-1 leading-tight">Канал: для QR всегда qr.</span>
                </Field>
                <Field label="utm_campaign">
                  <input value={o.campaign} onChange={(e) => set({ campaign: e.target.value })} className="drawing-input w-full" />
                  <span className="font-gost text-[9px] text-[var(--drawing-line-thin)] block mt-1 leading-tight">Метка кампании. Главное поле.</span>
                </Field>
              </div>

              {/* Описание выбранного типа носителя */}
              {AD_SOURCES.find((s) => s.value === o.source) && (
                <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] leading-snug bg-[var(--drawing-paper)] border border-[var(--drawing-line)]/30 px-2 py-1.5">
                  <span className="text-[var(--drawing-accent)] font-bold">
                    {AD_SOURCES.find((s) => s.value === o.source)!.label}:
                  </span>{" "}
                  {AD_SOURCES.find((s) => s.value === o.source)!.desc}
                </p>
              )}
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
            <p className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">Превью</p>
            <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-4 flex items-center justify-center min-h-[360px]">
              {previewSrc ? (
                <img src={previewSrc} alt="Превью листовки" className="max-h-[460px] w-auto shadow-lg" />
              ) : (
                <p className="font-gost text-sm text-[var(--drawing-line-thin)] py-20">Готовим макет…</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => exportFile("svg")} disabled={!svg || busy} className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}>
                <Icon name="Download" size={14} />SVG
              </button>
              <button onClick={() => exportFile("png")} disabled={!svg || busy} className={`btn-drawing text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}>
                <Icon name="Image" size={14} />PNG
              </button>
              <button onClick={() => exportFile("pdf")} disabled={!svg || busy} className={`btn-drawing text-xs inline-flex items-center justify-center gap-1 ${!svg || busy ? "opacity-50 pointer-events-none" : ""}`}>
                <Icon name="FileText" size={14} />PDF
              </button>
            </div>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)]">
              SVG — для CorelDRAW (вектор). PNG/PDF — 300 dpi. Цвет RGB — в Corel переведите в CMYK.
            </p>
          </div>
        </div>
      </div>

      {printModal && (
        <PrintModal
          campaignName={newName || sanitizeUtm(o.campaign)}
          alreadyPrinted={selected?.stats.printed || 0}
          onClose={() => setPrintModal(false)}
          onConfirm={async (quantity, totalRub) => {
            setBusy(true);
            const r = await orderCampaignPrint({
              slug: sanitizeUtm(o.campaign),
              name: newName || sanitizeUtm(o.campaign),
              quantity,
              total_rub: totalRub,
              config: o,
            });
            setBusy(false);
            setPrintModal(false);
            if (r.ok) {
              await reloadCampaigns();
              setSelectedSlug(sanitizeUtm(o.campaign));
            }
          }}
        />
      )}
    </>
  );
};

/** Модалка фиксации заказа печати: количество + общая стоимость. */
function PrintModal({
  campaignName,
  alreadyPrinted,
  onClose,
  onConfirm,
}: {
  campaignName: string;
  alreadyPrinted: number;
  onClose: () => void;
  onConfirm: (quantity: number, totalRub: number) => void;
}) {
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const q = Number(qty) || 0;
  const t = Number(total) || 0;
  const perUnit = q > 0 ? (t / q).toFixed(2) : "—";
  const valid = q > 0 && t >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] max-w-[420px] w-full p-5" onClick={(e) => e.stopPropagation()}>
        <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] mb-1">Заказ печати</p>
        <h2 className="font-gost-upright text-xl font-bold text-[var(--drawing-line)] mb-1">{campaignName}</h2>
        {alreadyPrinted > 0 && (
          <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mb-3">
            Уже напечатано: {alreadyPrinted.toLocaleString("ru-RU")} шт. Новый тираж добавится к сумме.
          </p>
        )}
        <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mb-4">
          После заказа кампания блокируется от редактирования. Повторный заказ можно сделать снова.
        </p>

        <Field label="Количество листовок">
          <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="например 1000" className="drawing-input w-full" />
        </Field>
        <div className="h-3" />
        <Field label="Общая стоимость, ₽">
          <input type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="например 4500" className="drawing-input w-full" />
        </Field>
        <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mt-2">
          Цена за листовку: <span className="text-[var(--drawing-line)] font-bold">{perUnit} ₽</span>
        </p>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-drawing text-xs flex-1">Отмена</button>
          <button
            onClick={() => valid && onConfirm(q, t)}
            disabled={!valid}
            className={`btn-drawing btn-drawing-accent text-xs flex-1 ${!valid ? "opacity-50 pointer-events-none" : ""}`}
          >
            Подтвердить заказ
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <div className={`border bg-[var(--drawing-paper)] p-2.5 ${accent ? "border-[var(--drawing-accent)]" : "border-[var(--drawing-line)]/40"}`}>
      <Icon name={icon} size={14} className="text-[var(--drawing-accent)] mb-1" />
      <p className="font-gost-upright text-base font-black text-[var(--drawing-line)] leading-tight">{value}</p>
      <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] leading-tight">{label}</p>
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center justify-between w-full border border-[var(--drawing-line)]/40 px-3 py-2 hover:border-[var(--drawing-accent)] transition-colors">
      <span className="font-gost text-xs text-[var(--drawing-line)] text-left pr-2">{label}</span>
      <span className={`relative inline-block w-9 h-5 shrink-0 border-2 transition-colors ${on ? "border-[var(--drawing-accent)] bg-[var(--drawing-accent)]" : "border-[var(--drawing-line)]"}`}>
        <span className={`absolute top-0.5 w-3 h-3 transition-all ${on ? "left-[18px] bg-white" : "left-0.5 bg-[var(--drawing-line)]"}`} />
      </span>
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">{label}</span>
      {children}
    </label>
  );
}

export default PrintFlyer;