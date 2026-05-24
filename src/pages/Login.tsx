import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";

const Login = () => {
  const { login, loading, error, clearError, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    setTimeout(() => nav(from, { replace: true }), 0);
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    const ok = await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (ok) nav(from, { replace: true });
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
            <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="btn-drawing btn-drawing-accent w-full justify-center disabled:opacity-50"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>

          <p className="font-gost text-xs text-center text-[var(--drawing-line-thin)]">
            Нет аккаунта?{" "}
            <Link to="/register" className="text-[var(--drawing-accent)] hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </>
  );
};

export default Login;
