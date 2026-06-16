/**
 * Сервис «Бизнес-планы» владельца (/owner/business-plans).
 *
 * Первый модуль — MindMap: интерактивная карта в стиле MindMeister с drag-and-drop.
 * На старте карта наполнена полной архитектурой сайта (страницы, ЛК, CAE,
 * бэкенд-функции, таблицы БД). Хранение на сервере, доступ только владельцу.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import OwnerGuard from "@/components/owner/OwnerGuard";
import MindMapCanvas from "@/components/owner/MindMapCanvas";
import { SITE_URL } from "@/lib/seo";
import {
  getMindMap,
  saveMindMap,
  buildSiteArchitectureMap,
  type MindMapData,
} from "@/lib/mindmap";

function BusinessPlansInner() {
  const [mapId, setMapId] = useState<number | null>(null);
  const [title, setTitle] = useState("Архитектура сайта");
  const [data, setData] = useState<MindMapData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Чтобы автосохранение не срабатывало на первичной загрузке.
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

  const onChange = useCallback((next: MindMapData) => {
    setData(next);
    setDirty(true);
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

  // Автосохранение с дебаунсом 1.5 c после изменений.
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
      <Helmet>
        <title>Бизнес-планы · MindMap · Диплом-Инж.рф</title>
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
          <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
            {saving ? "Сохраняем…" : dirty ? "Есть изменения" : savedAt ? `Сохранено ${savedAt}` : "Сохранено"}
          </span>
        </div>

        <div className="border-2 border-[var(--drawing-line)] h-[calc(100vh-220px)] min-h-[440px]">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center font-gost text-[var(--drawing-line-thin)]">
              Загружаем карту…
            </div>
          ) : (
            <MindMapCanvas data={data} onChange={onChange} />
          )}
        </div>
      </div>
    </>
  );
}

const OwnerBusinessPlans = () => (
  <OwnerGuard from="/owner/business-plans">
    <BusinessPlansInner />
  </OwnerGuard>
);

export default OwnerBusinessPlans;
