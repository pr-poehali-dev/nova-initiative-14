import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  fetchOwnerVisits,
  fetchOwnerVisitDetail,
  type VisitorRow,
  type VisitorDetail,
} from "@/lib/auth";

const PERIODS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
];

const SOURCE_COLOR: Record<string, string> = {
  qr_flyer: "#c0392b",
  utm: "#2c3e80",
  organic: "#1a8a5a",
  social: "#7d3c98",
  referral: "#d97706",
  direct: "#3a3a5e",
  internal: "#9aa0c0",
  unknown: "#9aa0c0",
};

/** Человекочитаемое время на сайте. */
function fmtTime(sec: number | null): string {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${sec} с`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} мин ${s} с` : `${m} мин`;
}

/** Дата-время в коротком формате. */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Раздел владельца «Посетители»: детальный разбор сессий.
 * По каждой сессии — источник, путь по страницам, устройство, время на сайте.
 * Раскрытие сессии подгружает гео по IP и пошаговый таймлайн.
 * Доступ только владельцу (роль is_owner). Скрыт от поисковых роботов.
 */
const OwnerVisitors = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [days, setDays] = useState(30);
  const [visits, setVisits] = useState<VisitorRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Раскрытая сессия: id + подгруженные детали.
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<VisitorDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  // Редирект не-владельца — в эффекте (а не в теле рендера).
  useEffect(() => {
    if (!loading && (!user || !user.is_owner)) {
      nav("/account", { replace: true });
    }
  }, [loading, user, nav]);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError(null);
    setOpenId(null);
    setDetail(null);
    fetchOwnerVisits(days).then((r) => {
      if (!alive) return;
      if (r.ok && r.data) setVisits(r.data.visits);
      else setError("Не удалось загрузить список посетителей");
      setBusy(false);
    });
    return () => {
      alive = false;
    };
  }, [days]);

  const toggle = (id: number) => {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setDetailBusy(true);
    fetchOwnerVisitDetail(id).then((r) => {
      setDetailBusy(false);
      if (r.ok && r.data) setDetail(r.data);
    });
  };

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }

  if (!user || !user.is_owner) return null;

  return (
    <>
      <Helmet>
        <title>Посетители · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/admin/visitors`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1000px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Владелец · Посетители
          </p>
          <Link
            to="/admin/stats"
            className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] flex items-center gap-1"
          >
            <Icon name="BarChart3" size={13} /> Сводная статистика
          </Link>
        </div>
        <h1 className="font-gost-upright text-2xl font-bold mb-2">Детальный разбор сессий</h1>
        <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-5 leading-relaxed max-w-[640px]">
          Путь каждого посетителя по страницам, источник перехода, устройство, время на
          сайте и гео по IP. Раскройте сессию, чтобы увидеть пошаговый таймлайн.
        </p>

        <div className="flex gap-1.5 mb-5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`border px-3 py-1.5 text-[11px] font-gost uppercase tracking-wider ${
                days === p.days
                  ? "bg-[var(--drawing-line)] text-[var(--drawing-bg)] border-[var(--drawing-line)]"
                  : "border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {busy && (
          <p className="font-gost text-sm text-[var(--drawing-line-thin)]">Загружаем сессии…</p>
        )}
        {error && <p className="font-gost text-sm text-[var(--drawing-accent)]">{error}</p>}

        {!busy && !error && visits.length === 0 && (
          <p className="font-gost text-sm text-[var(--drawing-line-thin)]">
            За выбранный период посещений не зафиксировано.
          </p>
        )}

        {!busy && visits.length > 0 && (
          <div className="border-2 border-[var(--drawing-line)] divide-y divide-[var(--drawing-line)]/30">
            {visits.map((v) => {
              const color = SOURCE_COLOR[v.sourceType] || SOURCE_COLOR.unknown;
              const isOpen = openId === v.id;
              return (
                <div key={v.id}>
                  <button
                    onClick={() => toggle(v.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--drawing-paper)] flex items-center gap-3"
                  >
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      style={{ background: color }}
                      title={v.sourceType}
                    />
                    <span className="font-mono text-[11px] text-[var(--drawing-line-thin)] w-[92px] shrink-0">
                      {fmtDate(v.createdAt)}
                    </span>
                    <span className="font-gost text-[12px] flex-1 min-w-0 truncate">
                      {v.sourceLabel || "Прямой заход"}
                      <span className="text-[var(--drawing-line-thin)]">
                        {" · "}
                        {v.pagesCount} стр. · {fmtTime(v.timeOnSite)}
                      </span>
                    </span>
                    <span className="hidden sm:inline font-gost text-[10px] text-[var(--drawing-line-thin)] shrink-0">
                      {v.browser || v.device || "—"}
                    </span>
                    <Icon
                      name={isOpen ? "ChevronUp" : "ChevronDown"}
                      size={15}
                      className="shrink-0 text-[var(--drawing-line-thin)]"
                    />
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 bg-[var(--drawing-paper)]/50">
                      {detailBusy && (
                        <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-2">
                          Загружаем детали и гео…
                        </p>
                      )}
                      {detail && detail.id === v.id && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px] font-gost">
                            <Field label="Источник" value={detail.sourceLabel || "Прямой заход"} />
                            <Field
                              label="Гео"
                              value={
                                detail.city || detail.country
                                  ? `${detail.country || ""}${detail.city ? ", " + detail.city : ""}`
                                  : "—"
                              }
                            />
                            <Field label="Устройство" value={detail.browser || detail.device || "—"} />
                            <Field label="Время на сайте" value={fmtTime(detail.timeOnSite)} />
                            <Field label="IP" value={detail.ip || "—"} mono />
                            <Field label="Входная страница" value={detail.landingPath || "—"} mono />
                            {detail.utmCampaign && (
                              <Field label="UTM-кампания" value={detail.utmCampaign} />
                            )}
                            {detail.referrer && <Field label="Реферер" value={detail.referrer} />}
                          </div>

                          <div>
                            <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
                              Путь по страницам
                            </p>
                            {detail.steps.length > 0 ? (
                              <ol className="space-y-1">
                                {detail.steps.map((step, i) => (
                                  <li key={i} className="flex items-center gap-2 text-[12px] font-gost">
                                    <span className="shrink-0 w-5 h-5 flex items-center justify-center border border-[var(--drawing-line)] font-mono text-[10px]">
                                      {i + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="font-gost text-[11px] text-[var(--drawing-line-thin)]">
                                Шаги не зафиксированы.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">{label}</p>
      <p className={`${mono ? "font-mono" : "font-gost"} text-[12px] break-all`}>{value}</p>
    </div>
  );
}

export default OwnerVisitors;
