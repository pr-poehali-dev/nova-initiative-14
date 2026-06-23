/**
 * Публичный встраиваемый виджет-калькулятор балки (/widget/beam).
 *
 * Загружается в iframe на сайтах партнёров (заводы металлоконструкций,
 * продавцы проката, стройкомпании). Посетитель вводит пролёт, нагрузку и
 * профиль → видит прогиб и запас прочности → оформляет заявку, которая
 * уходит на email партнёра. Доступ по API-ключу (?key=...), привязанному
 * к домену партнёра. Страница изолирована: без общей навигации сайта,
 * закрыта от индексации.
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";

const WIDGET_API = (func2url as Record<string, string>)["widget-api"];

interface ProfileOption {
  id: string;
  name: string;
}

interface CalcResult {
  max_deflection_mm: number;
  deflection_limit_mm: number;
  deflection_ratio: string;
  deflection_ok: boolean;
  safety_factor: number | null;
  strength_ok: boolean;
  max_sigma_mpa: number;
}

type SupportType = "simply" | "cantilever";
type LoadType = "udl" | "point";

function getKey(): string {
  const sp = new URLSearchParams(window.location.search);
  return sp.get("key") || "";
}

export default function WidgetBeam() {
  const apiKey = getKey();

  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [company, setCompany] = useState<string>("");
  const [configError, setConfigError] = useState<string | null>(null);

  const [span, setSpan] = useState("4");
  const [support, setSupport] = useState<SupportType>("simply");
  const [loadType, setLoadType] = useState<LoadType>("udl");
  const [loadValue, setLoadValue] = useState("500");
  const [profileId, setProfileId] = useState("I20");

  const [result, setResult] = useState<CalcResult | null>(null);
  const [calcInput, setCalcInput] = useState<Record<string, unknown> | null>(null);
  const [calcing, setCalcing] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const [showLead, setShowLead] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [leadSending, setLeadSending] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Сообщаем родительской странице (embed-скрипту) свою высоту для авто-resize iframe.
  useEffect(() => {
    const postHeight = () => {
      const h = document.body.scrollHeight;
      window.parent?.postMessage({ type: "dipinzh-widget-height", height: h }, "*");
    };
    postHeight();
    const ro = new ResizeObserver(postHeight);
    ro.observe(document.body);
    return () => ro.disconnect();
  });

  useEffect(() => {
    if (!apiKey) {
      setConfigError("Не указан ключ виджета");
      return;
    }
    fetch(`${WIDGET_API}?action=config&key=${encodeURIComponent(apiKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setProfiles(data.profiles || []);
          setCompany(data.company_name || "");
        } else {
          setConfigError(data.message || "Виджет недоступен");
        }
      })
      .catch(() => setConfigError("Не удалось загрузить виджет"));
  }, [apiKey]);

  const calculate = useCallback(async () => {
    setCalcing(true);
    setCalcError(null);
    setResult(null);
    setLeadDone(false);
    setShowLead(false);
    try {
      // Пользователь вводит в кН и кН/м, солвер ждёт Н и Н/м.
      const loadVal = parseFloat(loadValue) * 1000;
      const res = await fetch(`${WIDGET_API}?action=calc&key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          span_m: parseFloat(span),
          load_type: loadType,
          load_value: loadVal,
          profile_id: profileId,
          support,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.result);
        setCalcInput(data.input);
      } else {
        setCalcError(data.message || "Ошибка расчёта");
      }
    } catch {
      setCalcError("Не удалось выполнить расчёт");
    }
    setCalcing(false);
  }, [apiKey, span, loadType, loadValue, profileId, support]);

  const sendLead = useCallback(async () => {
    if (!name.trim() || !phone.trim()) {
      setLeadError("Укажите имя и телефон");
      return;
    }
    setLeadSending(true);
    setLeadError(null);
    try {
      const res = await fetch(`${WIDGET_API}?action=lead&key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          comment,
          calc_input: calcInput,
          calc_result: result,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setLeadDone(true);
      } else {
        setLeadError(data.message || "Не удалось отправить заявку");
      }
    } catch {
      setLeadError("Не удалось отправить заявку");
    }
    setLeadSending(false);
  }, [apiKey, name, phone, email, comment, calcInput, result]);

  if (configError) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorBox}>
            <Icon name="TriangleAlert" size={18} />
            <span>{configError}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Helmet>
        <title>Калькулятор балки</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div style={styles.card}>
        <div style={styles.header}>
          <Icon name="Calculator" size={20} />
          <span style={styles.headerTitle}>Расчёт балки онлайн</span>
        </div>

        {/* Форма параметров */}
        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Схема опирания</span>
            <select
              style={styles.input}
              value={support}
              onChange={(e) => setSupport(e.target.value as SupportType)}
            >
              <option value="simply">На двух опорах</option>
              <option value="cantilever">Консоль (защемление)</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Пролёт, м</span>
            <input
              style={styles.input}
              type="number"
              min="0.1"
              max="30"
              step="0.1"
              value={span}
              onChange={(e) => setSpan(e.target.value)}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Тип нагрузки</span>
            <select
              style={styles.input}
              value={loadType}
              onChange={(e) => setLoadType(e.target.value as LoadType)}
            >
              <option value="udl">Распределённая</option>
              <option value="point">Сосредоточенная</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>
              Нагрузка, {loadType === "udl" ? "кН/м" : "кН"}
            </span>
            <input
              style={styles.input}
              type="number"
              min="0.01"
              step="0.1"
              value={loadValue}
              onChange={(e) => setLoadValue(e.target.value)}
            />
          </label>

          <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
            <span style={styles.label}>Профиль (сортамент)</span>
            <select
              style={styles.input}
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button style={styles.primaryBtn} onClick={calculate} disabled={calcing}>
          {calcing ? "Считаем…" : "Рассчитать"}
        </button>

        {calcError && (
          <div style={styles.errorBox}>
            <Icon name="TriangleAlert" size={16} />
            <span>{calcError}</span>
          </div>
        )}

        {/* Результат */}
        {result && (
          <div style={styles.result}>
            <div style={styles.resultRow}>
              <span>Макс. прогиб</span>
              <strong>
                {result.max_deflection_mm} мм ({result.deflection_ratio})
              </strong>
            </div>
            <div style={styles.resultRow}>
              <span>Допустимый прогиб</span>
              <strong>{result.deflection_limit_mm} мм</strong>
            </div>
            <div style={styles.resultRow}>
              <span>Напряжение</span>
              <strong>{result.max_sigma_mpa} МПа</strong>
            </div>
            {result.safety_factor != null && (
              <div style={styles.resultRow}>
                <span>Запас прочности</span>
                <strong>{result.safety_factor}</strong>
              </div>
            )}
            <div
              style={{
                ...styles.verdict,
                background:
                  result.deflection_ok && result.strength_ok ? "#e7f6ec" : "#fdecec",
                color: result.deflection_ok && result.strength_ok ? "#1a7f37" : "#c0392b",
              }}
            >
              <Icon
                name={result.deflection_ok && result.strength_ok ? "CircleCheck" : "CircleAlert"}
                size={16}
              />
              <span>
                {result.deflection_ok && result.strength_ok
                  ? "Профиль проходит по прогибу и прочности"
                  : "Профиль не проходит — увеличьте сечение"}
              </span>
            </div>

            {!leadDone && !showLead && (
              <button style={styles.orderBtn} onClick={() => setShowLead(true)}>
                <Icon name="ShoppingCart" size={16} /> Оформить заказ
              </button>
            )}
          </div>
        )}

        {/* Форма заявки */}
        {showLead && !leadDone && (
          <div style={styles.leadForm}>
            <div style={styles.leadTitle}>Оставьте заявку — мы свяжемся с вами</div>
            <input
              style={styles.input}
              placeholder="Ваше имя *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Телефон *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Email (необязательно)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <textarea
              style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
              placeholder="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {leadError && (
              <div style={styles.errorBox}>
                <Icon name="TriangleAlert" size={16} />
                <span>{leadError}</span>
              </div>
            )}
            <button style={styles.primaryBtn} onClick={sendLead} disabled={leadSending}>
              {leadSending ? "Отправляем…" : "Отправить заявку"}
            </button>
          </div>
        )}

        {leadDone && (
          <div style={styles.successBox}>
            <Icon name="CircleCheck" size={18} />
            <span>Заявка отправлена! {company || "Компания"} свяжется с вами.</span>
          </div>
        )}

        <div style={styles.footer}>
          Расчёт: облачный CAE{" "}
          <a
            href="https://xn----gtbhgbqhkfi.xn--p1ai/cae"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            Диплом-Инж.рф
          </a>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: 12,
    background: "transparent",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  card: {
    maxWidth: 480,
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #e3e6ea",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    color: "#1a1d21",
  },
  header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: 600 },
  input: {
    padding: "9px 11px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    color: "#1a1d21",
  },
  primaryBtn: {
    marginTop: 16,
    width: "100%",
    padding: "11px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  orderBtn: {
    marginTop: 14,
    width: "100%",
    padding: "11px 16px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  result: {
    marginTop: 18,
    padding: 14,
    background: "#f8fafc",
    border: "1px solid #e3e6ea",
    borderRadius: 10,
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "5px 0",
    fontSize: 14,
    borderBottom: "1px solid #eef1f4",
  },
  verdict: {
    marginTop: 12,
    padding: "9px 12px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
  },
  leadForm: { marginTop: 16, display: "flex", flexDirection: "column", gap: 10 },
  leadTitle: { fontSize: 15, fontWeight: 700 },
  errorBox: {
    marginTop: 12,
    padding: "9px 12px",
    background: "#fdecec",
    color: "#c0392b",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },
  successBox: {
    marginTop: 16,
    padding: "12px 14px",
    background: "#e7f6ec",
    color: "#1a7f37",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  footer: { marginTop: 16, textAlign: "center", fontSize: 11, color: "#9ca3af" },
  footerLink: { color: "#6b7280", textDecoration: "none" },
};