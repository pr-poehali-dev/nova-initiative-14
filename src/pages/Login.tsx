import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import OAuthButtons from "@/components/OAuthButtons";
import { resendVerification } from "@/lib/auth";
import Icon from "@/components/ui/icon";

const Login = () => {
  const { login, loading, error, clearError, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Состояние повторной отправки письма — показываем кнопку только при нужной ошибке
  const [resendBusy, setResendBusy] = useState(false);
  const [resendDone, setResendDone] = useState<string | null>(null);

  // Опознаём ошибку «email не подтверждён» — текст приходит с бэка
  const needsVerification =
    !!error && /подтвердите email|не подтверждён|не подтвержден/i.test(error);

  if (user) {
    setTimeout(() => nav(from, { replace: true }), 0);
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setResendDone(null);
    setSubmitting(true);
    const ok = await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (ok) nav(from, { replace: true });
  };

  const onResend = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;
    setResendBusy(true);
    setResendDone(null);
    const res = await resendVerification(trimmedEmail);
    setResendBusy(false);
    setResendDone(
      res.ok
        ? "Письмо отправлено заново. Проверьте папку «Входящие» и «Спам»."
        : res.message || "Не удалось отправить письмо. Попробуйте позже.",
    );
  };

  return (
    <>
      <Helmet>
        <title>Вход в личный кабинет · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/login`} />
      </Helmet>
      <div className="max-w-[480px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3 text-center">
          SSO · Авторизация
        </p>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide text-center mb-2">
          Вход в кабинет
        </h1>
        <p className="text-sm text-center text-[var(--drawing-line-thin)] mb-8">
          Единый аккаунт для&nbsp;наставничества и&nbsp;CAE.
        </p>

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
          <div>
            <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
              Пароль
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="drawing-input"
              placeholder="не менее 8 символов"
              minLength={8}
            />
          </div>

          {error && (
            <div className="border-l-2 border-[var(--drawing-accent)] pl-3 space-y-2">
              <p className="font-gost text-xs text-[var(--drawing-accent)]">
                {error}
              </p>
              {needsVerification && (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendBusy || !email.trim()}
                  className="btn-drawing text-[11px] inline-flex border-[var(--drawing-accent)] text-[var(--drawing-accent)] hover:bg-[var(--drawing-accent)] hover:text-white transition-colors disabled:opacity-50"
                  title="Отправит письмо с ссылкой подтверждения на указанный email"
                >
                  <Icon name={resendBusy ? "Loader" : "Mail"} size={12} className={`mr-1.5 ${resendBusy ? "animate-spin" : ""}`} />
                  {resendBusy ? "Отправляем…" : "Отправить письмо заново"}
                </button>
              )}
            </div>
          )}

          {resendDone && (
            <p className="font-gost text-xs text-[var(--drawing-line)] border-l-2 border-[var(--drawing-line)] pl-3 bg-[var(--drawing-line)]/5 py-2">
              {resendDone}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="btn-drawing btn-drawing-accent w-full justify-center disabled:opacity-50"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>

          <div className="flex items-center justify-between font-gost text-xs text-[var(--drawing-line-thin)]">
            <span>
              Нет аккаунта?{" "}
              <Link to="/register" className="text-[var(--drawing-accent)] hover:underline">
                Зарегистрироваться
              </Link>
            </span>
            <Link to="/forgot-password" className="text-[var(--drawing-accent)] hover:underline">
              Забыли пароль?
            </Link>
          </div>

          <OAuthButtons redirectAfter={from} />
        </form>
      </div>
    </>
  );
};

export default Login;