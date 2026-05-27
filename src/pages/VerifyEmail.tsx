import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "@/lib/helmet-shim";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { saveTokens } from "@/lib/auth";
import { SITE_URL } from "@/lib/seo";
import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["sso-auth"];

type Status = "loading" | "success" | "error";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const nav = useNavigate();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Токен подтверждения не найден в ссылке. Проверьте, что скопировали ссылку полностью.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API}?action=verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.access_token) {
          saveTokens(data);
          await refreshUser();
          setStatus("success");
          setTimeout(() => nav("/account", { replace: true }), 2000);
        } else {
          setStatus("error");
          const msg: Record<string, string> = {
            invalid_token: "Ссылка недействительна или уже использована.",
            already_used: "Эта ссылка уже была использована. Попробуйте войти.",
            token_expired: "Ссылка истекла. Запросите новое письмо.",
          };
          setMessage(msg[data.error as string] || data.message || "Не удалось подтвердить email.");
        }
      } catch {
        setStatus("error");
        setMessage("Ошибка соединения. Проверьте интернет и попробуйте ещё раз.");
      }
    })();
  }, [token, nav, refreshUser]);

  return (
    <>
      <Helmet>
        <title>Подтверждение email · Диплом-Инж.рф</title>
        <link rel="canonical" href={`${SITE_URL}/verify-email`} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-[480px] mx-auto px-4 pt-20 md:pt-32 pb-12 text-center">
        {status === "loading" && (
          <div>
            <Icon name="Loader" size={40} className="mx-auto mb-4 text-[var(--drawing-accent)] animate-spin" />
            <p className="font-gost-upright text-xl font-black uppercase tracking-wide mb-2">
              Подтверждаем email…
            </p>
            <p className="text-sm text-[var(--drawing-line-thin)]">Секунду</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="bg-[var(--drawing-bg)] border-2 border-[#1a8a5a] p-8 mb-6 inline-block">
              <Icon name="CircleCheck" size={48} className="text-[#1a8a5a] mx-auto" />
            </div>
            <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
              SSO · Успешно
            </p>
            <h1 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-3">
              Email подтверждён
            </h1>
            <p className="text-sm text-[var(--drawing-line-thin)] mb-6">
              Аккаунт активирован. Переходим в&nbsp;личный кабинет…
            </p>
            <Link to="/account" className="btn-drawing btn-drawing-accent text-sm inline-flex">
              В личный кабинет&nbsp;&rarr;
            </Link>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="bg-[var(--drawing-bg)] border-2 border-[var(--drawing-accent)] p-8 mb-6 inline-block">
              <Icon name="CircleX" size={48} className="text-[var(--drawing-accent)] mx-auto" />
            </div>
            <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
              SSO · Ошибка
            </p>
            <h1 className="font-gost-upright text-2xl font-black uppercase tracking-wide mb-3">
              Не удалось подтвердить
            </h1>
            <p className="text-sm text-[var(--drawing-line-thin)] mb-6 leading-relaxed">
              {message}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login" className="btn-drawing text-sm inline-flex">
                Войти
              </Link>
              <Link to="/register" className="btn-drawing btn-drawing-accent text-sm inline-flex">
                Зарегистрироваться заново
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VerifyEmail;