import { useEffect, useState, type FormEvent } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import {
  createTicket,
  KIND_LABELS,
  IMPORTANCE_LABELS,
  type TicketKind,
  type TicketImportance,
} from "@/lib/support";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Заранее заполненный заголовок (например при «Сообщить об ошибке расчёта»). */
  defaultTitle?: string;
  /** Заранее заполненное тело (с тех. информацией). */
  defaultBody?: string;
  /** Тип обращения по умолчанию. */
  defaultKind?: TicketKind;
}

/**
 * Глобальная модалка отправки тикета в техподдержку.
 *
 * Сценарии:
 *  - Авторизованный юзер: тикет привязывается к user_id, поле email не показываем.
 *  - Гость: обязательно вводит email.
 *  - Юзер сам оценивает важность. После проверки администратор сам поставит
 *    объективную оценку и при необходимости начислит баллы.
 */
export default function SupportTicketModal({
  open,
  onClose,
  defaultTitle = "",
  defaultBody = "",
  defaultKind = "bug",
}: Props) {
  const { user } = useAuth();
  const [kind, setKind] = useState<TicketKind>(defaultKind);
  const [importance, setImportance] = useState<TicketImportance>("normal");
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setKind(defaultKind);
      setImportance("normal");
      setTitle(defaultTitle);
      setBody(defaultBody);
      setEmail("");
      setError(null);
      setSuccess(null);
    }
  }, [open, defaultTitle, defaultBody, defaultKind]);

  if (!open) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Укажите заголовок обращения");
      return;
    }
    if (body.trim().length < 5) {
      setError("Опишите проблему подробнее (минимум 5 символов)");
      return;
    }
    if (!user && !email.trim()) {
      setError("Укажите email для обратной связи");
      return;
    }

    setSubmitting(true);
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const res = await createTicket({
      title: title.trim(),
      body: body.trim(),
      kind,
      self_importance: importance,
      page_url: pageUrl,
      email: user ? undefined : email.trim().toLowerCase(),
    });
    setSubmitting(false);

    if (res.ok && res.data) {
      setSuccess(res.data.ticket_id);
    } else {
      setError(res.message || "Не удалось отправить обращение. Попробуйте позже.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Сообщить о проблеме"
    >
      <div className="bg-[var(--drawing-bg)] border-[2.5px] border-[var(--drawing-line)] max-w-lg w-full relative my-4">
        <div className="absolute -top-px -left-px w-3 h-3 border-t-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)]" />
        <div className="absolute -top-px -right-px w-3 h-3 border-t-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)]" />
        <div className="absolute -bottom-px -left-px w-3 h-3 border-b-[2.5px] border-l-[2.5px] border-[var(--drawing-accent)]" />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-[2.5px] border-r-[2.5px] border-[var(--drawing-accent)]" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-2 right-2 p-1.5 hover:bg-[var(--drawing-line)]/10 transition-colors"
        >
          <Icon name="X" size={16} />
        </button>

        <div className="p-5 pt-6">
          {success ? (
            <div className="text-center py-4">
              <div className="bg-[var(--drawing-accent)] text-white p-3 inline-block mb-3">
                <Icon name="CheckCircle" size={24} />
              </div>
              <h2 className="font-gost-upright text-xl font-black uppercase tracking-wide leading-tight mb-2">
                Обращение принято
              </h2>
              <p className="text-sm text-[var(--drawing-line-thin)] mb-4">
                Номер заявки: <strong className="font-mono text-[var(--drawing-line)]">#{success}</strong>.
                Мы&nbsp;ответим на&nbsp;{user?.email || email} в&nbsp;течение 3-х рабочих дней.
                {user && (
                  <>
                    {" "}Если ваш вклад окажется полезным, администратор начислит баллы&nbsp;&mdash; следите в&nbsp;«Моих обращениях».
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-drawing btn-drawing-accent text-xs"
              >
                Готово
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-[var(--drawing-accent)] text-white p-2 shrink-0">
                  <Icon name="LifeBuoy" size={20} />
                </div>
                <div>
                  <p className="font-gost text-[10px] uppercase tracking-[0.25em] text-[var(--drawing-line-thin)] mb-1">
                    Техподдержка
                  </p>
                  <h2 className="font-gost-upright text-xl font-black uppercase tracking-wide leading-tight">
                    Сообщить о проблеме
                  </h2>
                </div>
              </div>

              <p className="text-xs text-[var(--drawing-line-thin)] mb-4 leading-snug">
                Помогите нам сделать сервис лучше. За&nbsp;полезные сообщения администратор начисляет баллы по&nbsp;факту обработки.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
                    Тип обращения
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(Object.keys(KIND_LABELS) as TicketKind[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={`btn-drawing text-[10px] ${kind === k ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5" : ""}`}
                      >
                        {KIND_LABELS[k]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
                    Заголовок
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    className="drawing-input text-sm"
                    placeholder="Кратко суть проблемы"
                    required
                  />
                </div>

                <div>
                  <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
                    Описание
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    className="drawing-input text-sm font-mono leading-snug resize-y"
                    placeholder="Шаги воспроизведения, ожидаемый результат, что получилось"
                    required
                  />
                </div>

                <div>
                  <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
                    Как сами оцениваете важность
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(Object.keys(IMPORTANCE_LABELS) as TicketImportance[]).map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImportance(i)}
                        className={`btn-drawing text-[10px] ${importance === i ? "border-[var(--drawing-accent)] text-[var(--drawing-accent)] bg-[var(--drawing-accent)]/5" : ""}`}
                      >
                        {IMPORTANCE_LABELS[i]}
                      </button>
                    ))}
                  </div>
                  <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] mt-1.5 opacity-80">
                    Финальную оценку поставит администратор после проверки
                  </p>
                </div>

                {!user && (
                  <div>
                    <label className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
                      Email для ответа
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={255}
                      className="drawing-input text-sm"
                      placeholder="ivan@example.ru"
                      required
                    />
                  </div>
                )}
              </div>

              {error && (
                <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3 mt-3">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-drawing text-xs flex-1"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-drawing btn-drawing-accent text-xs flex-1 disabled:opacity-50"
                >
                  {submitting ? "Отправляем…" : "Отправить"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
