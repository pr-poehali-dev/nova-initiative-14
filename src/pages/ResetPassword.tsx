import { useState, type FormEvent } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { saveTokens } from "@/lib/auth";
import { SITE_URL } from "@/lib/seo";

import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["sso-auth"];

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const nav = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  if (!token) {
    return (
      <div className="max-w-[480px] mx-auto px-4 pt-20 md:pt-32 pb-12 text-center">
        <Icon name="CircleX" size={40} className="mx-auto mb-4 text-[var(--drawing-accent)]" />
        <h1 className="font-gost-upright text-xl font-black uppercase tracking-wide mb-3">
          Ссылка недействительна
        </h1>
        <p className="text-sm text-[var(--drawing-line-thin)] mb-6">
          Токен сброса пароля отсутствует. Запросите новую ссылку.
        </p>
        <Link to="/forgot-password" className="btn-drawing btn-drawing-accent text-sm inline-flex">
          Запросить сброс пароля
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}?action=reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.access_token) {
        saveTokens(data);
        await refreshUser();
        nav("/account", { replace: true });
      } else {
        const msg: Record<string, string> = {
          invalid_token: "Ссылка недействительна или уже использована.",
          already_used: "Эта ссылка уже была использована. Запросите новую.",
          token_expired: "Ссылка истекла. Запросите новую ссылку для сброса.",
          weak_password: "Пароль должен быть не короче 8 символов.",
        };
        setError(msg[data.error as string] || data.message || "Произошла ошибка. Попробуйте ещё раз.");
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
        <title>Новый пароль · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/reset-password`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-[480px] mx-auto px-4 pt-20 md:pt-24 pb-12">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3 text-center">
          SSO · Сброс пароля
        </p>
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide text-center mb-2">
          Новый пароль
        </h1>
        <p className="text-sm text-center text-[var(--drawing-line-thin)] mb-8">
          Придумайте надёжный пароль не&nbsp;короче 8&nbsp;символов.
        </p>

        <form onSubmit={onSubmit} className="space-y-5 drawing-frame p-6 md:p-8 bg-[var(--drawing-bg)]">
          <div>
            <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
              Новый пароль
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="drawing-input pr-10"
                placeholder="не менее 8 символов"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)]"
                aria-label={showPass ? "Скрыть пароль" : "Показать пароль"}
              >
                <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] block mb-2">
              Повторите пароль
            </label>
            <input
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="drawing-input"
            />
          </div>

          {error && (
            <div className="border-l-2 border-[var(--drawing-accent)] pl-3 space-y-2">
              <p className="font-gost text-xs text-[var(--drawing-accent)]">{error}</p>
              {(error.includes("истекла") || error.includes("использована")) && (
                <Link
                  to="/forgot-password"
                  className="font-gost text-xs text-[var(--drawing-accent)] underline hover:no-underline"
                >
                  Запросить новую ссылку →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-drawing btn-drawing-accent w-full justify-center disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Icon name="Loader" size={14} className="mr-2 animate-spin" />
                Сохраняем…
              </>
            ) : (
              "Сохранить новый пароль"
            )}
          </button>
        </form>
      </div>
    </>
  );
};

export default ResetPassword;