import { useEffect, useRef, useState } from "react";
import { oauthVkSdkLogin, saveTokens } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  appId: string;
  redirectAfter?: string;
}

const SDK_URL = "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
const REDIRECT_URL = "https://xn----gtbhgbqhkfi.xn--p1ai/oauth/callback";

interface VKIDApi {
  Config: { init: (opts: Record<string, unknown>) => void };
  ConfigResponseMode: { Callback: unknown };
  ConfigSource: { LOWCODE: unknown };
  OneTap: new () => {
    render: (opts: Record<string, unknown>) => {
      on: (
        event: unknown,
        handler: (...args: unknown[]) => void,
      ) => { on: (event: unknown, handler: (...args: unknown[]) => void) => unknown };
    };
  };
  WidgetEvents: { ERROR: unknown };
  OneTapInternalEvents: { LOGIN_SUCCESS: unknown };
  Auth: {
    exchangeCode: (
      code: string,
      deviceId: string,
    ) => Promise<{ access_token?: string; user?: Record<string, unknown> }>;
  };
}

declare global {
  interface Window {
    VKIDSDK?: VKIDApi;
  }
}

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.VKIDSDK) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("Не удалось загрузить VK ID SDK"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

const VKIDOneTap = ({ appId, redirectAfter = "/account" }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { refreshUser } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadSdk()
      .then(() => {
        if (cancelled || !containerRef.current || !window.VKIDSDK) return;
        const VKID = window.VKIDSDK;

        VKID.Config.init({
          app: Number(appId),
          redirectUrl: REDIRECT_URL,
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: "email",
        });

        const oneTap = new VKID.OneTap();
        oneTap
          .render({
            container: containerRef.current,
            showAlternativeLogin: true,
            oauthList: ["mail_ru", "ok_ru"],
          })
          .on(VKID.WidgetEvents.ERROR, (...args: unknown[]) => {
            console.error("[VKID] error", args[0]);
            setError("Ошибка VK ID");
          })
          .on(
            VKID.OneTapInternalEvents.LOGIN_SUCCESS,
            (...args: unknown[]) => {
              const payload = args[0] as { code: string; device_id: string };
              setBusy(true);
              VKID.Auth.exchangeCode(payload.code, payload.device_id)
                .then(async (data) => {
                  const access_token = data?.access_token;
                  if (!access_token) throw new Error("Нет access_token от VK");
                  const sub = (data?.user?.provider || "vk") as
                    | "vk"
                    | "mail_ru"
                    | "ok_ru";
                  const res = await oauthVkSdkLogin({
                    access_token,
                    sub_provider: sub,
                    user: data?.user,
                    redirect_after: redirectAfter,
                  });
                  if (res.ok && res.data) {
                    saveTokens(res.data);
                    await refreshUser();
                    nav(res.data.redirect_after || redirectAfter, {
                      replace: true,
                    });
                  } else {
                    setError(res.message || res.error || "Ошибка входа");
                    setBusy(false);
                  }
                })
                .catch((err: unknown) => {
                  console.error("[VKID exchange]", err);
                  setError("Не удалось завершить вход VK ID");
                  setBusy(false);
                });
            },
          );
      })
      .catch((err) => {
        console.error("[VKID load]", err);
        setError("VK ID недоступен");
      });

    return () => {
      cancelled = true;
    };
  }, [appId, redirectAfter, refreshUser, nav]);

  return (
    <div className="vkid-onetap-wrap">
      <div
        ref={containerRef}
        className="min-h-[44px]"
        style={{ position: "relative" }}
      />
      {busy && (
        <p className="font-gost text-[10px] text-center text-[var(--drawing-line-thin)] mt-2 uppercase tracking-wider">
          завершаем вход…
        </p>
      )}
      {error && (
        <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3 mt-2">
          {error}
        </p>
      )}
    </div>
  );
};

export default VKIDOneTap;