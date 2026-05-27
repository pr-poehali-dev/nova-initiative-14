import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/lib/seo";
import OAuthButtons from "@/components/OAuthButtons";
import Icon from "@/components/ui/icon";
import {
  getRememberedRefCode,
  rememberRefCode,
  clearRememberedRefCode,
} from "@/lib/referrals";

const Register = () => {
  const { register, loading, error, clearError, user } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [fullName, setFullName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Реф-код берём сначала из URL (?ref=), потом из localStorage (если был сохранён ранее)
  const initialRef =
    searchParams.get("ref")?.trim().toUpperCase().slice(0, 16) ||
    getRememberedRefCode() ||
    "";
  const [refCode, setRefCode] = useState(initialRef);

  // Согласия: маркетинг и вайтлист. Если в URL пришёл флаг — ставим включённым.
  const [marketingConsent, setMarketingConsent] = useState(
    searchParams.get("marketing") === "1",
  );
  const [joinWaitlist, setJoinWaitlist] = useState(
    searchParams.get("waitlist") === "1" || searchParams.get("from") === "cae-demo",
  );

  // Запомним реф-код, чтобы он не потерялся при переходах
  useEffect(() => {
    if (refCode) rememberRefCode(refCode);
  }, [refCode]);

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
    const ok = await register(email.trim().toLowerCase(), password, fullName, {
      refCode: refCode || undefined,
      marketingConsent,
      joinWaitlist,
    });
    setSubmitting(false);
    if (ok) {
      clearRememberedRefCode();
      nav("/account", { replace: true });
    }
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

        {/* Бейдж пригласившего */}
        {refCode && (
          <div className="border-[1.5px] border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/10 p-3 mb-5 flex items-start gap-2 text-xs">
            <Icon name="Gift" size={16} className="text-[var(--drawing-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="font-gost-upright font-bold text-[var(--drawing-accent)] uppercase tracking-wider text-[11px] mb-1">
                Вы регистрируетесь по приглашению
              </p>
              <p className="text-[var(--drawing-line-thin)] leading-snug">
                Код: <strong className="font-mono text-[var(--drawing-line)]">{refCode}</strong>.
                После регистрации вы&nbsp;и&nbsp;пригласивший получите по&nbsp;<strong>10&nbsp;баллов</strong>.
              </p>
            </div>
          </div>
        )}

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

          {/* Реф-код, скрыт под раскрытием */}
          <details className="text-xs">
            <summary className="cursor-pointer font-gost uppercase tracking-wider text-[10px] text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]">
              Есть код приглашения?
            </summary>
            <input
              type="text"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toUpperCase().slice(0, 16))}
              className="drawing-input mt-2 font-mono"
              placeholder="ABCDEFGH"
              maxLength={16}
            />
          </details>

          {/* Согласия */}
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 accent-[var(--drawing-accent)]"
              />
              <span className="text-[var(--drawing-line-thin)] leading-snug">
                Хочу получать новости о&nbsp;запуске тарифов и&nbsp;инженерные материалы (отписаться можно в&nbsp;1&nbsp;клик)
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs cursor-pointer border-[1.5px] border-[var(--drawing-accent)] bg-[var(--drawing-accent)]/10 p-2 -mx-1">
              <input
                type="checkbox"
                checked={joinWaitlist}
                onChange={(e) => setJoinWaitlist(e.target.checked)}
                className="mt-0.5 accent-[var(--drawing-accent)]"
              />
              <span className="leading-snug">
                <strong className="text-[var(--drawing-accent)] font-gost-upright uppercase tracking-wider text-[11px]">
                  Лист ожидания приоритетной волны
                </strong>
                <br />
                <span className="text-[var(--drawing-line-thin)]">
                  Получу полный доступ к&nbsp;CAE первым и&nbsp;лучшие условия после официального старта
                </span>
              </span>
            </label>
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
