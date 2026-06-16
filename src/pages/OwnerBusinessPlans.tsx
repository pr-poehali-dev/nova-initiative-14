/**
 * Сервис «Бизнес-планы» владельца (/owner/business-plans).
 *
 * Вкладки:
 *  - MindMap — интерактивная карта (drag-and-drop) со структурой всего сайта;
 *  - Финансы — финансовый калькулятор (юнит-экономика, безубыточность, графики).
 * Каждая вкладка хранится на сервере отдельно. Доступ только владельцу.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import OwnerGuard from "@/components/owner/OwnerGuard";
import MindMapCanvas from "@/components/owner/MindMapCanvas";
import FinanceCalculator from "@/components/owner/FinanceCalculator";
import BizPlanMSP from "@/components/owner/BizPlanMSP";
import { SITE_URL } from "@/lib/seo";
import {
  getMindMap,
  saveMindMap,
  buildSiteArchitectureMap,
  type MindMapData,
} from "@/lib/mindmap";
import {
  getFinanceModel,
  saveFinanceModel,
  defaultFinanceData,
  type FinanceData,
} from "@/lib/finance";
import {
  getBizPlan,
  saveBizPlan,
  defaultBizPlanData,
  type BizPlanData,
} from "@/lib/bizplan";

type Tab = "mindmap" | "finance" | "bizplan";

function BusinessPlansInner() {
  const [tab, setTab] = useState<Tab>("bizplan");

  return (
    <>
      <Helmet>
        <title>Бизнес-планы · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/owner/business-plans`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-[1400px] mx-auto px-4 pt-20 md:pt-24 pb-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
            Владелец · Бизнес-планы
          </p>
          <Link to="/account" className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1">
            <Icon name="ArrowLeft" size={12} />В кабинет
          </Link>
        </div>

        {/* Вкладки */}
        <div className="flex gap-0 border-b border-[var(--drawing-line)]/40 mb-4">
          <TabBtn active={tab === "bizplan"} icon="BookOpenCheck" label="Бизнес-план" onClick={() => setTab("bizplan")} />
          <TabBtn active={tab === "finance"} icon="Calculator" label="Финансы" onClick={() => setTab("finance")} />
          <TabBtn active={tab === "mindmap"} icon="Network" label="MindMap" onClick={() => setTab("mindmap")} />
        </div>

        {tab === "mindmap" && <MindMapTab />}
        {tab === "finance" && <FinanceTab />}
        {tab === "bizplan" && <BizPlanTab />}
      </div>
    </>
  );
}

function TabBtn({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`font-gost text-xs uppercase tracking-wider px-4 py-2 inline-flex items-center gap-1.5 border-b-2 -mb-px ${
        active ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)]" : "border-transparent text-[var(--drawing-line-thin)] hover:text-[var(--drawing-line)]"
      }`}
    >
      <Icon name={icon} size={14} />{label}
    </button>
  );
}

/** Общий индикатор статуса сохранения. */
function SaveStatus({ saving, dirty, savedAt }: { saving: boolean; dirty: boolean; savedAt: string | null }) {
  return (
    <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
      {saving ? "Сохраняем…" : dirty ? "Есть изменения" : savedAt ? `Сохранено ${savedAt}` : "Сохранено"}
    </span>
  );
}

// ===== Вкладка MindMap =====

function MindMapTab() {
  const [mapId, setMapId] = useState<number | null>(null);
  const [title, setTitle] = useState("Архитектура сайта");
  const [data, setData] = useState<MindMapData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const r = await getMindMap();
      setLoading(false);
      if (r.ok && r.data) {
        setMapId(r.data.id);
        setTitle(r.data.title);
        setData(r.data.data && r.data.data.nodes ? r.data.data : { nodes: [], edges: [] });
        loadedRef.current = true;
      }
    })();
  }, []);

  const onSave = useCallback(async () => {
    if (mapId == null) return;
    setSaving(true);
    const r = await saveMindMap(mapId, title, data);
    setSaving(false);
    if (r.ok) {
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    }
  }, [mapId, title, data]);

  useEffect(() => {
    if (!loadedRef.current || !dirty || mapId == null) return;
    const t = setTimeout(() => { onSave(); }, 1500);
    return () => clearTimeout(t);
  }, [data, title, dirty, mapId, onSave]);

  const resetToArchitecture = () => {
    if (!confirm("Заменить текущую карту на исходную структуру сайта? Изменения будут перезаписаны.")) return;
    setData(buildSiteArchitectureMap());
    setDirty(true);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          className="drawing-input font-gost-upright font-black text-xl uppercase tracking-wide flex-1 min-w-[200px]"
        />
        <button onClick={onSave} disabled={saving || mapId == null} className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1 ${saving || mapId == null ? "opacity-50 pointer-events-none" : ""}`}>
          <Icon name="Save" size={14} />Сохранить
        </button>
        <button onClick={resetToArchitecture} className="btn-drawing text-xs inline-flex items-center gap-1" title="Загрузить исходную структуру сайта">
          <Icon name="RefreshCw" size={14} />Структура сайта
        </button>
        <SaveStatus saving={saving} dirty={dirty} savedAt={savedAt} />
      </div>

      <div className="border-2 border-[var(--drawing-line)] h-[calc(100vh-260px)] min-h-[440px]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center font-gost text-[var(--drawing-line-thin)]">
            Загружаем карту…
          </div>
        ) : (
          <MindMapCanvas data={data} onChange={(next) => { setData(next); setDirty(true); }} />
        )}
      </div>
    </>
  );
}

// ===== Вкладка Финансы =====

function FinanceTab() {
  const [modelId, setModelId] = useState<number | null>(null);
  const [title, setTitle] = useState("Финансовая модель");
  const [data, setData] = useState<FinanceData>(defaultFinanceData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const r = await getFinanceModel();
      setLoading(false);
      if (r.ok && r.data) {
        setModelId(r.data.id);
        setTitle(r.data.title);
        setData({ ...defaultFinanceData(), ...(r.data.data || {}) });
        loadedRef.current = true;
      }
    })();
  }, []);

  const onSave = useCallback(async () => {
    if (modelId == null) return;
    setSaving(true);
    const r = await saveFinanceModel(modelId, title, data);
    setSaving(false);
    if (r.ok) {
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    }
  }, [modelId, title, data]);

  useEffect(() => {
    if (!loadedRef.current || !dirty || modelId == null) return;
    const t = setTimeout(() => { onSave(); }, 1200);
    return () => clearTimeout(t);
  }, [data, title, dirty, modelId, onSave]);

  if (loading) {
    return (
      <div className="border-2 border-[var(--drawing-line)] h-[300px] flex items-center justify-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем финмодель…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          className="drawing-input font-gost-upright font-black text-xl uppercase tracking-wide flex-1 min-w-[200px]"
        />
        <button onClick={onSave} disabled={saving || modelId == null} className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1 ${saving || modelId == null ? "opacity-50 pointer-events-none" : ""}`}>
          <Icon name="Save" size={14} />Сохранить
        </button>
        <SaveStatus saving={saving} dirty={dirty} savedAt={savedAt} />
      </div>

      <FinanceCalculator data={data} onChange={(next) => { setData(next); setDirty(true); }} />
    </>
  );
}

// ===== Вкладка Бизнес-план (методика МСП) =====

function BizPlanTab() {
  const [planId, setPlanId] = useState<number | null>(null);
  const [title, setTitle] = useState("Бизнес-план");
  const [data, setData] = useState<BizPlanData>(defaultBizPlanData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const r = await getBizPlan();
      setLoading(false);
      if (r.ok && r.data) {
        setPlanId(r.data.id);
        setTitle(r.data.title);
        setData({ ...defaultBizPlanData(), ...(r.data.data || {}) });
        loadedRef.current = true;
      }
    })();
  }, []);

  const onSave = useCallback(async () => {
    if (planId == null) return;
    setSaving(true);
    const r = await saveBizPlan(planId, title, data);
    setSaving(false);
    if (r.ok) {
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    }
  }, [planId, title, data]);

  useEffect(() => {
    if (!loadedRef.current || !dirty || planId == null) return;
    const t = setTimeout(() => { onSave(); }, 1200);
    return () => clearTimeout(t);
  }, [data, title, dirty, planId, onSave]);

  if (loading) {
    return (
      <div className="border-2 border-[var(--drawing-line)] h-[300px] flex items-center justify-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем бизнес-план…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          className="drawing-input font-gost-upright font-black text-xl uppercase tracking-wide flex-1 min-w-[200px]"
        />
        <button onClick={onSave} disabled={saving || planId == null} className={`btn-drawing btn-drawing-accent text-xs inline-flex items-center gap-1 ${saving || planId == null ? "opacity-50 pointer-events-none" : ""}`}>
          <Icon name="Save" size={14} />Сохранить
        </button>
        <SaveStatus saving={saving} dirty={dirty} savedAt={savedAt} />
      </div>

      <BizPlanMSP data={data} onChange={(next) => { setData(next); setDirty(true); }} />
    </>
  );
}

const OwnerBusinessPlans = () => (
  <OwnerGuard from="/owner/business-plans">
    <BusinessPlansInner />
  </OwnerGuard>
);

export default OwnerBusinessPlans;