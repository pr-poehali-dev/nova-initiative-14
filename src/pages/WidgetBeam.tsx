/**
 * Публичный встраиваемый виджет (/widget/beam).
 *
 * Показывает НАСТОЯЩИЙ CAE-редактор (тот же demo-CAE, что и /cae/demo) в
 * iframe на сайте партнёра — единая кодовая база и единый солвер. Лимиты
 * редактора (число расчётов, узлов, элементов) приходят из тарифа партнёра
 * через widget-api. При исчерпании лимита или по кнопке «Оформить заказ»
 * посетитель оставляет заявку, которая уходит партнёру на email.
 *
 * Доступ по API-ключу (?key=...), привязанному к домену партнёра. Страница
 * изолирована: без общей навигации сайта, закрыта от индексации.
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import CaeDemoEditor from "./CaeDemoEditor";
import WidgetLeadModal from "@/components/widget/WidgetLeadModal";
import func2url from "../../backend/func2url.json";

const WIDGET_API = (func2url as Record<string, string>)["widget-api"];

interface WidgetLimits {
  solveLimit: number;
  nodeLimit: number;
  elementLimit: number;
}

interface ConfigResponse {
  ok: boolean;
  company_name?: string;
  plan?: string;
  limits?: WidgetLimits;
  message?: string;
}

function getKey(): string {
  return new URLSearchParams(window.location.search).get("key") || "";
}

export default function WidgetBeam() {
  const apiKey = getKey();

  const [limits, setLimits] = useState<WidgetLimits | null>(null);
  const [company, setCompany] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadOpen, setLeadOpen] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      setConfigError("Не указан ключ виджета");
      setLoading(false);
      return;
    }
    fetch(`${WIDGET_API}?action=config&key=${encodeURIComponent(apiKey)}`)
      .then((r) => r.json())
      .then((data: ConfigResponse) => {
        if (data.ok && data.limits) {
          setLimits(data.limits);
          setCompany(data.company_name || "");
        } else {
          setConfigError(data.message || "Виджет недоступен");
        }
      })
      .catch(() => setConfigError("Не удалось загрузить виджет"))
      .finally(() => setLoading(false));
  }, [apiKey]);

  const openLead = useCallback(() => setLeadOpen(true), []);

  // После каждого успешного расчёта учитываем его в месячном биллинге партнёра.
  const registerCalc = useCallback(() => {
    fetch(`${WIDGET_API}?action=register-calc&key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => {});
  }, [apiKey]);

  if (loading) {
    return (
      <div style={centerBox}>
        <Icon name="Loader" size={22} className="animate-spin" />
      </div>
    );
  }

  if (configError || !limits) {
    return (
      <div style={centerBox}>
        <div style={errorCard}>
          <Icon name="TriangleAlert" size={18} />
          <span>{configError || "Виджет недоступен"}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <Helmet>
        <title>Калькулятор балки</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Настоящий CAE-редактор с лимитами тарифа партнёра */}
      <CaeDemoEditor
        embedded
        limits={limits}
        onLimitReached={openLead}
        onSolveSuccess={registerCalc}
        company={company}
        widgetKey={apiKey}
      />

      {/* Плавающая кнопка «Оформить заказ» */}
      <button style={orderBtn} onClick={openLead}>
        <Icon name="ShoppingCart" size={16} /> Оформить заказ
      </button>

      {leadOpen && (
        <WidgetLeadModal apiKey={apiKey} company={company} onClose={() => setLeadOpen(false)} />
      )}
    </div>
  );
}

const centerBox: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

const errorCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#fdecec",
  color: "#c0392b",
  borderRadius: 10,
  padding: "14px 18px",
  fontSize: 14,
};

const orderBtn: React.CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  zIndex: 9000,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "12px 20px",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "system-ui, sans-serif",
  cursor: "pointer",
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};