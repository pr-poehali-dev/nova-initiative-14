/**
 * Модалка заявки внутри виджета партнёра.
 *
 * Показывается посетителю сайта партнёра, когда он исчерпал лимит расчётов
 * (по тарифу партнёра) или нажал «Оформить заказ». Контакт + данные расчёта
 * уходят в widget-api (action=lead) → на email партнёра. Стили инлайновые,
 * чтобы виджет не зависел от темы сайта-носителя.
 */
import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../../backend/func2url.json";

const WIDGET_API = (func2url as Record<string, string>)["widget-api"];

interface Props {
  apiKey: string;
  company: string;
  onClose: () => void;
}

export default function WidgetLeadModal({ apiKey, company, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    if (!name.trim() || !phone.trim()) {
      setError("Укажите имя и телефон");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${WIDGET_API}?action=lead&key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, comment }),
      });
      const data = await res.json();
      if (data.ok) setDone(true);
      else setError(data.message || "Не удалось отправить заявку");
    } catch {
      setError("Не удалось отправить заявку");
    }
    setSending(false);
  }, [apiKey, name, phone, email, comment]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.close} onClick={onClose} aria-label="Закрыть">
          <Icon name="X" size={18} />
        </button>

        {done ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <Icon name="CircleCheck" size={32} className="text-green-600" />
            <p style={styles.title}>Заявка отправлена</p>
            <p style={styles.sub}>
              {company || "Компания"} свяжется с вами по вашему расчёту.
            </p>
            <button style={styles.primary} onClick={onClose}>
              Готово
            </button>
          </div>
        ) : (
          <>
            <p style={styles.title}>Оставьте заявку</p>
            <p style={styles.sub}>
              Менеджер свяжется с вами и поможет с изготовлением по вашему расчёту.
            </p>
            <input style={styles.input} placeholder="Ваше имя *" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={styles.input} placeholder="Телефон *" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input style={styles.input} placeholder="Email (необязательно)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <textarea
              style={{ ...styles.input, minHeight: 56, resize: "vertical" }}
              placeholder="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error && (
              <div style={styles.error}>
                <Icon name="TriangleAlert" size={14} /> {error}
              </div>
            )}
            <button style={styles.primary} onClick={send} disabled={sending}>
              {sending ? "Отправляем…" : "Отправить заявку"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  modal: {
    position: "relative",
    background: "#fff",
    color: "#1a1d21",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
  },
  close: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#6b7280",
  },
  title: { fontSize: 18, fontWeight: 700, margin: "8px 0 4px" },
  sub: { fontSize: 13, color: "#6b7280", marginBottom: 14, lineHeight: 1.4 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 11px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 10,
    outline: "none",
  },
  primary: {
    width: "100%",
    padding: "11px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fdecec",
    color: "#c0392b",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    marginBottom: 10,
  },
};
