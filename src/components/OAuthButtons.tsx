import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  fetchOauthProviders,
  oauthStart,
  PROVIDER_LABELS,
  type OAuthProvider,
} from "@/lib/auth";
import VKIDOneTap from "@/components/VKIDOneTap";

interface Props {
  redirectAfter?: string;
}

// "Простые" провайдеры рисуем кнопкой OAuth-редиректа.
// VK / Mail.ru / OK покрываются единым VK ID OneTap SDK сверху.
const SIMPLE_PROVIDERS: OAuthProvider[] = ["yandex", "google"];

const ICONS: Record<OAuthProvider, string> = {
  yandex: "AtSign",
  vk: "MessageCircle",
  google: "Globe",
  mailru: "Mail",
};

const COLORS: Record<OAuthProvider, string> = {
  yandex: "bg-[#FC3F1D] hover:bg-[#e0381a] text-white border-[#FC3F1D]",
  vk: "bg-[#0077FF] hover:bg-[#0066dd] text-white border-[#0077FF]",
  google: "bg-white hover:bg-gray-50 text-[#1a1a2e] border-[#1a1a2e]",
  mailru: "bg-[#005FF9] hover:bg-[#0050d4] text-white border-[#005FF9]",
};

const OAuthButtons = ({ redirectAfter = "/account" }: Props) => {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [vkSdkAppId, setVkSdkAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOauthProviders()
      .then((res) => {
        // Временно скрываем VK ID до настройки доменов и Mail.ru / OK.
        const list = (res.data?.providers || []).filter(
          (p) => p !== "vk" && p !== "mailru",
        );
        setProviders(list);
        setVkSdkAppId(null);
      })
      .catch(() => {
        setProviders([]);
        setVkSdkAppId(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleSimple = providers.filter((p) => SIMPLE_PROVIDERS.includes(p));

  const onClick = async (provider: OAuthProvider) => {
    setBusy(provider);
    setError(null);
    try {
      const { authorize_url } = await oauthStart(provider, redirectAfter);
      window.location.href = authorize_url;
    } catch {
      setError(`Не удалось начать вход через ${PROVIDER_LABELS[provider]}`);
      setBusy(null);
    }
  };

  if (loading) return null;
  if (!vkSdkAppId && visibleSimple.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[var(--drawing-line-thin)] opacity-40" />
        <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
          или войти через
        </span>
        <div className="flex-1 h-px bg-[var(--drawing-line-thin)] opacity-40" />
      </div>

      {vkSdkAppId && (
        <VKIDOneTap appId={vkSdkAppId} redirectAfter={redirectAfter} />
      )}

      {visibleSimple.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {visibleSimple.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onClick(p)}
              disabled={busy !== null}
              className={`${COLORS[p]} font-gost text-[11px] uppercase tracking-wider border-2 py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-50`}
            >
              <Icon name={ICONS[p]} size={14} />
              {busy === p ? "…" : PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3">
          {error}
        </p>
      )}
    </div>
  );
};

export default OAuthButtons;