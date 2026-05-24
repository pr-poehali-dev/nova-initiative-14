import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { oauthCallback, saveTokens } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

const OAuthCallback = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const errParam = params.get("error");

    if (errParam) {
      setStatus("error");
      setError(params.get("error_description") || `OAuth ошибка: ${errParam}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setError("Не получены параметры авторизации от провайдера.");
      return;
    }

    oauthCallback(code, state)
      .then((res) => {
        if (res.ok && res.data) {
          saveTokens(res.data);
          refreshUser().then(() => {
            const after = res.data?.redirect_after || "/account";
            nav(after, { replace: true });
          });
        } else {
          setStatus("error");
          setError(res.message || res.error || "Ошибка авторизации");
        }
      })
      .catch((e) => {
        setStatus("error");
        setError(String(e));
      });
  }, [params, nav, refreshUser]);

  return (
    <>
      <Helmet>
        <title>Вход через провайдера · Диплом-Инж.рф</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-[480px] mx-auto px-4 pt-24 pb-12 text-center">
        {status === "working" ? (
          <>
            <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
              SSO · Авторизация
            </p>
            <h1 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide mb-3">
              Завершаем вход…
            </h1>
            <p className="text-sm text-[var(--drawing-line-thin)]">
              Пожалуйста, подождите.
            </p>
          </>
        ) : (
          <>
            <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-accent)] mb-3">
              SSO · Ошибка
            </p>
            <h1 className="font-gost-upright text-xl md:text-2xl font-black uppercase tracking-wide mb-3">
              Не удалось войти
            </h1>
            <p className="text-sm text-[var(--drawing-line-thin)] mb-6 break-words">
              {error}
            </p>
            <Link to="/login" className="btn-drawing btn-drawing-accent text-xs">
              Вернуться к&nbsp;входу
            </Link>
          </>
        )}
      </div>
    </>
  );
};

export default OAuthCallback;
