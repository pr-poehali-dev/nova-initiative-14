import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import {
  buildFlyerSvg,
  downloadFlyerSvg,
  downloadFlyerPng,
  downloadFlyerPdf,
  sanitizeUtm,
  DEFAULT_FLYER,
  type FlyerOptions,
} from "@/lib/print-flyer";
import {
  fetchAdCampaigns,
  saveAdCampaign,
  orderCampaignPrint,
  type AdCampaign,
} from "@/lib/adCampaigns";
import PrintFlyerCampaignPanel from "./print-flyer/PrintFlyerCampaignPanel";
import PrintFlyerEditor from "./print-flyer/PrintFlyerEditor";
import PrintModal from "./print-flyer/PrintModal";

/**
 * Редактор печатной рекламы с управлением кампаниями.
 * Кампания = метка (utm_campaign). Выбирается из списка или создаётся новая.
 * Сверху — статистика выбранной кампании (визиты, регистрации, доход, тираж).
 * Кампания, заказанная в печать, блокируется от редактирования; повторный
 * заказ печати разрешён (тиражи суммируются). Только для админа.
 *
 * Состояние и вся бизнес-логика живут здесь, презентация разнесена по
 * компонентам в ./print-flyer/* (CampaignPanel, Editor, PrintModal).
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
        <PrintFlyerCampaignPanel
          o={o}
          campaigns={campaigns}
          selected={selected}
          selectedSlug={selectedSlug}
          isLocked={isLocked}
          newName={newName}
          busy={busy}
          saveMsg={saveMsg}
          selectCampaign={selectCampaign}
          setNewName={setNewName}
          onSave={onSave}
          openPrintModal={() => setPrintModal(true)}
        />

        <PrintFlyerEditor
          o={o}
          isLocked={isLocked}
          svg={svg}
          busy={busy}
          previewSrc={previewSrc}
          qrCountUsed={qrCountUsed}
          set={set}
          setQr={setQr}
          exportFile={exportFile}
        />
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

export default PrintFlyer;
