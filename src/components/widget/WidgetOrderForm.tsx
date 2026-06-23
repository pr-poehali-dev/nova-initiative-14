/**
 * Форма «Заказать подключение виджета» для лендинга /widget-balka.
 *
 * Заявка потенциального партнёра уходит тем же каналом, что и заявки с сайта
 * (backend create-lead → Bitrix24 + письмо на info@). Поля переиспользуют
 * универсальную схему лида, но заполнены под B2B-контекст виджета: компания,
 * сайт, контакт. Так менеджер сразу видит, что это заявка на виджет.
 */
import { useState, FormEvent } from "react";
import Icon from "@/components/ui/icon";
import { getVisitorData } from "@/hooks/useVisitorTracking";
import { markFormSubmitted } from "@/App";
import func2url from "../../../backend/func2url.json";

export default function WidgetOrderForm() {
  const [company, setCompany] = useState("");
  const [site, setSite] = useState("");
  const [contact, setContact] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return setError("Укажите название компании");
    if (!contact.trim()) return setError("Укажите телефон, email или Telegram");
    if (!consent) return setError("Необходимо согласие на обработку данных");
    setError(null);
    setLoading(true);
    try {
      markFormSubmitted();
      await fetch(func2url["create-lead"], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company,
          contact,
          // Переиспользуем поля лида под контекст виджета — видно в письме/CRM.
          topic: "Подключение виджета калькулятора балки",
          university: site ? `Сайт партнёра: ${site}` : "",
          commentsText: comment,
          hasComments: comment ? "yes" : "",
          timeLeft: "widget",
          visitor: getVisitorData(),
        }),
      });
      setDone(true);
    } catch {
      setError("Не удалось отправить заявку. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="drawing-frame p-6 bg-[var(--drawing-bg)] text-center">
        <Icon name="CircleCheck" size={28} className="text-green-600 mx-auto mb-2" />
        <p className="font-gost-upright font-black text-base uppercase mb-1">
          Заявка отправлена
        </p>
        <p className="font-gost text-sm text-[var(--drawing-line-thin)]">
          Менеджер свяжется с вами, поможет подключить виджет и настроит заявки на
          вашу почту.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="drawing-frame p-5 bg-[var(--drawing-bg)]">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Send" size={18} className="text-[var(--drawing-accent)]" />
        <h3 className="font-gost-upright font-black text-base uppercase tracking-wide">
          Заказать подключение
        </h3>
      </div>
      <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-4 leading-snug">
        Оставьте заявку — подключим виджет на ваш сайт и настроим заявки на вашу
        почту. Без обязательств.
      </p>

      <div className="space-y-3">
        <input
          className="w-full border-2 border-[var(--drawing-line)] bg-transparent px-3 py-2 text-sm"
          placeholder="Название компании *"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          className="w-full border-2 border-[var(--drawing-line)] bg-transparent px-3 py-2 text-sm"
          placeholder="Адрес сайта (необязательно)"
          value={site}
          onChange={(e) => setSite(e.target.value)}
        />
        <input
          className="w-full border-2 border-[var(--drawing-line)] bg-transparent px-3 py-2 text-sm"
          placeholder="Телефон, email или Telegram *"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <textarea
          className="w-full border-2 border-[var(--drawing-line)] bg-transparent px-3 py-2 text-sm min-h-[60px] resize-y"
          placeholder="Комментарий (что продаёте, какие расчёты нужны)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <label className="flex items-start gap-2 font-gost text-xs text-[var(--drawing-line-thin)] cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span>
            Согласен на обработку персональных данных для обратной связи.
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-3 border-2 border-red-500/60 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2">
          <Icon name="TriangleAlert" size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-drawing btn-drawing-accent text-sm mt-4 w-full inline-flex items-center justify-center gap-2"
      >
        <Icon name={loading ? "Loader" : "Send"} size={15} className={loading ? "animate-spin" : ""} />
        {loading ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}