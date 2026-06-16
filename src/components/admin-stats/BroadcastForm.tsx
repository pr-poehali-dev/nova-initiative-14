import { useState } from "react";
import Icon from "@/components/ui/icon";
import { sendBroadcast } from "@/lib/notifications";

/**
 * Форма системного объявления всем пользователям.
 * Создаёт одно broadcast-уведомление, которое покажется в колокольчике у всех.
 * Доступна только администратору (страница /admin/stats закрыта от не-админов).
 */
export default function BroadcastForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async () => {
    if (!title.trim()) {
      setError("Введите заголовок объявления");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await sendBroadcast({
      title: title.trim(),
      body: body.trim() || undefined,
      link: link.trim() || undefined,
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTitle("");
      setBody("");
      setLink("");
    } else {
      setError(res.message || "Не удалось отправить объявление");
    }
  };

  return (
    <div className="border border-[var(--drawing-line)] p-4 mt-8">
      <p className="font-gost-upright text-base font-black uppercase tracking-wide mb-1 flex items-center gap-2">
        <Icon name="Megaphone" size={16} />
        Объявление всем
      </p>
      <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] mb-3 leading-snug">
        Появится в колокольчике у всех пользователей. Одна запись — рассылается
        широковещательно, без нагрузки на сервер.
      </p>

      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок (например: Обновили тарифы)"
          maxLength={200}
          className="drawing-input w-full"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Текст объявления (необязательно)"
          rows={3}
          className="drawing-input w-full resize-none"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Ссылка по клику, например /pricing (необязательно)"
          maxLength={500}
          className="drawing-input w-full"
        />
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button onClick={onSend} disabled={busy} className="btn-drawing text-sm disabled:opacity-50">
          {busy ? "Отправляем…" : "Отправить всем"}
        </button>
        {done && (
          <span className="font-gost text-[12px] text-[var(--drawing-accent)] inline-flex items-center gap-1">
            <Icon name="Check" size={14} />Объявление отправлено
          </span>
        )}
        {error && (
          <span className="font-gost text-[12px] text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
}
