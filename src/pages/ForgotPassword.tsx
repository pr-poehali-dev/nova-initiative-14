import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { SITE_URL } from "@/lib/seo";
import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["sso-auth"];

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}?action=request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
      } else {
        setError(data.message || "Произошла ошибка. Попробуйте позже.");
      }
    } catch {
      setError("Ошибка соединения. Проверьте интернет.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Восстановление пароля · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/forgot-password`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-[480px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3 text-center">
          SSO · Восстановление пароля
        </p>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide text-center mb-2">
          Забыли пароль?
        </h1>
        <p className="text-sm text-center text-[var(--drawing-line-thin)] mb-8">
          Введите email — пришлём ссылку для&nbsp;создания нового пароля.
        </p>

        {done ? (
          <div className="drawing-frame p-6 md:p-8 bg-[var(--drawing-bg)] text-center">
            <Icon name="Mail" size={36} className="mx-auto mb-4 text-[var(--drawing-accent)]" />
            <h2 className="font-gost-upright text-lg font-black uppercase tracking-wide mb-3">
              Письмо отправлено
            </h2>
            <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed mb-6">
              Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.
              Проверьте папку «Входящие» и «Спам».
            </p>
            <p className="text-xs text-[var(--drawing-line-thin)] mb-6">
              Ссылка действительна 2 часа.
            </p>
            <Link to="/login" className="btn-drawing text-sm inline-flex">
              ← Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 drawing-frame p-6 md:p-8 bg-[var(--drawing-bg)]">
            <div>
              <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="drawing-input"
                placeholder="ivan@example.ru"
              />
            </div>

            {error && (
              <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-drawing btn-drawing-accent w-full justify-center disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Icon name="Loader" size={14} className="mr-2 animate-spin" />
                  Отправляем…
                </>
              ) : (
                "Отправить ссылку для сброса"
              )}
            </button>

            <p className="font-gost text-xs text-center text-[var(--drawing-line-thin)]">
              Вспомнили пароль?{" "}
              <Link to="/login" className="text-[var(--drawing-accent)] hover:underline">
                Войти
              </Link>
            </p>
          </form>
        )}
      </div>
    </>
  );
};

export default ForgotPassword;