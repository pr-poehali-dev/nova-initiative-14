import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  fetchOauthProviders,
  oauthStart,
  PROVIDER_LABELS,
  type OAuthProvider,
} from "@/lib/auth";

interface Props {
  redirectAfter?: string;
}

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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOauthProviders()
      .then((res) => setProviders(res.data?.providers || []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  const onClick = async (provider: OAuthProvider) => {
    setBusy(provider);
    setError(null);
    try {
      const { authorize_url } = await oauthStart(provider, redirectAfter);
      window.location.href = authorize_url;
    } catch (e) {
      setError(`Не удалось начать вход через ${PROVIDER_LABELS[provider]}`);
      setBusy(null);
    }
  };

  if (loading) return null;
  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[var(--drawing-line-thin)] opacity-40" />
        <span className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)]">
          или войти через
        </span>
        <div className="flex-1 h-px bg-[var(--drawing-line-thin)] opacity-40" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {providers.map((p) => (
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
      {error && (
        <p className="font-gost text-xs text-[var(--drawing-accent)] border-l-2 border-[var(--drawing-accent)] pl-3">
          {error}
        </p>
      )}
    </div>
  );
};

export default OAuthButtons;
