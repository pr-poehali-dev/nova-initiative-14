import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "@dr.pogodin/react-helmet";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import OAuthButtons from "@/components/OAuthButtons";

const Register = () => {
  const { register, loading, error, clearError, user } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [fullName, setFullName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    setTimeout(() => nav("/account", { replace: true }), 0);
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (password !== password2) {
      setLocalError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setLocalError("Пароль должен быть не короче 8 символов");
      return;
    }

    setSubmitting(true);
    const ok = await register(email.trim().toLowerCase(), password, fullName);
    setSubmitting(false);
    if (ok) nav("/account", { replace: true });
  };

  const msg = localError || error;

  return (
    <>
      <Helmet>
        <title>Регистрация · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/register`} />
      </Helmet>
      <div className="max-w-[480px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3 text-center">
          SSO · Регистрация
        </p>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide text-center mb-2">
          Создать аккаунт
        </h1>
        <p className="text-sm text-center text-[var(--drawing-line-thin)] mb-8">
          Один аккаунт &mdash; для&nbsp;наставничества, статей и&nbsp;будущего CAE-калькулятора.
        </p>

        <form onSubmit={onSubmit} className="space-y-5 drawing-frame p-6 md:p-8 bg-[var(--drawing-bg)]">
          <div>
            <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
              Имя (необязательно)
            </label>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="drawing-input"
              placeholder="Иван Петров"
              maxLength={200}
            />
          </div>
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="drawing-input"
              placeholder="не менее 8 символов"
              minLength={8}
            />
          </div>
          <div>
            <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
              Повторите пароль
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="drawing-input"
              minLength={8}
            />
          </div>

          {msg && (
            <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3">
              {msg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="btn-drawing btn-drawing-accent w-full justify-center disabled:opacity-50"
          >
            {submitting ? "Создаём…" : "Зарегистрироваться"}
          </button>

          <p className="font-gost text-xs text-center text-[var(--drawing-line-thin)]">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-[var(--drawing-accent)] hover:underline">
              Войти
            </Link>
          </p>

          <OAuthButtons redirectAfter="/account" />
        </form>

        <p className="font-gost text-[10px] text-center text-[var(--drawing-line-thin)] opacity-70 mt-6 leading-relaxed">
          Регистрируясь, вы&nbsp;соглашаетесь с&nbsp;
          <Link to="/privacy" className="underline">политикой конфиденциальности</Link>.
        </p>
      </div>
    </>
  );
};

export default Register;