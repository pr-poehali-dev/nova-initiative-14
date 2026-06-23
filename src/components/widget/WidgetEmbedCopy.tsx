/**
 * Блок «Скопировать код виджета» для лендинга.
 *
 * Менеджер по продажам во время звонка просит клиента нажать «Скопировать» —
 * и тот сразу вставляет код на свой сайт. Если клиент НЕ авторизован, вместо
 * кода показываем приглашение войти/зарегистрироваться (личный ключ выдаётся
 * после авторизации). Авторизованным показываем демо-код с подсказкой, что
 * персональный ключ менеджер пришлёт после подключения тарифа.
 */
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";

const DEMO_KEY = "demo_pk_8f3a9c2e1b7d4056";

function snippet(key: string): string {
  return `<script src="${SITE_URL}/widget.js" data-key="${key}" async></script>`;
}

export default function WidgetEmbedCopy() {
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState(false);

  const code = snippet(user ? "ВАШ_КЛЮЧ" : DEMO_KEY);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [code]);

  return (
    <div className="drawing-frame p-5 bg-[var(--drawing-bg)]">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Code2" size={18} className="text-[var(--drawing-accent)]" />
        <h3 className="font-gost-upright font-black text-base uppercase tracking-wide">
          Код для вставки на сайт
        </h3>
      </div>

      {loading ? (
        <div className="py-6 text-center text-[var(--drawing-line-thin)] font-gost text-sm">
          <Icon name="Loader" size={18} className="animate-spin inline" /> Загрузка…
        </div>
      ) : !user ? (
        // Гость: гейт авторизации в самом пункте копирования.
        <div>
          <div className="relative">
            <pre className="select-none blur-[3px] font-mono text-[11px] leading-relaxed bg-[var(--drawing-paper)] border border-[var(--drawing-line)] p-3 overflow-hidden">
              {snippet("••••••••••••••••")}
            </pre>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon name="Lock" size={22} className="text-[var(--drawing-line-thin)]" />
            </div>
          </div>
          <p className="font-gost text-xs text-[var(--drawing-line-thin)] mt-3 mb-3 leading-snug">
            Чтобы скопировать код и получить личный ключ виджета — войдите или
            зарегистрируйтесь. Это займёт минуту.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/login"
              state={{ from: "/widget-balka" }}
              className="btn-drawing btn-drawing-accent text-sm inline-flex items-center gap-2"
            >
              <Icon name="LogIn" size={15} /> Войти
            </Link>
            <Link
              to="/register"
              state={{ from: "/widget-balka" }}
              className="btn-drawing text-sm inline-flex items-center gap-2"
            >
              <Icon name="UserPlus" size={15} /> Регистрация
            </Link>
          </div>
        </div>
      ) : (
        // Авторизован: показываем код с кнопкой копирования.
        <div>
          <pre className="font-mono text-[11px] leading-relaxed bg-[var(--drawing-paper)] border border-[var(--drawing-line)] p-3 overflow-x-auto">
            {code}
          </pre>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button
              onClick={copy}
              className="btn-drawing btn-drawing-accent text-sm inline-flex items-center gap-2"
            >
              <Icon name={copied ? "Check" : "Copy"} size={15} />
              {copied ? "Скопировано" : "Скопировать код"}
            </button>
            <p className="font-gost text-xs text-[var(--drawing-line-thin)] leading-snug flex-1 min-w-[200px]">
              Персональный ключ <code className="font-mono">data-key</code> менеджер
              активирует при подключении тарифа — после этого калькулятор заработает
              на вашем домене.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
