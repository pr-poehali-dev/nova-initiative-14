import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  fetchIdentities,
  unlinkIdentity,
  oauthStartLink,
  getAccessToken,
  PROVIDER_LABELS,
  type LinkedIdentity,
  type OAuthProvider,
} from "@/lib/auth";

const PROVIDER_ICONS: Record<OAuthProvider, string> = {
  google: "Chrome",
  yandex: "AtSign",
  vk: "MessageCircle",
  mailru: "Mail",
};

/**
 * Раздел «Способы входа»: показывает привязанные провайдеры (Google, Яндекс,
 * VK, Mail.ru), позволяет привязать новые и отвязать существующие.
 */
const LoginMethodsBlock = () => {
  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [available, setAvailable] = useState<OAuthProvider[]>([]);
  const [hasPassword, setHasPassword] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkedFlash, setLinkedFlash] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    const res = await fetchIdentities(token);
    if (res.ok && res.data) {
      setIdentities(res.data.identities);
      setAvailable(res.data.available_providers);
      setHasPassword(res.data.has_password);
      setError(null);
    } else {
      setError(res.message || res.error || "Не удалось загрузить способы входа");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Показать подтверждение после возврата с привязки (?linked=1).
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("linked") === "1") {
      setLinkedFlash(true);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setLinkedFlash(false), 4000);
    }
  }, [load]);

  const linkedProviders = new Set(identities.map((i) => i.provider));
  const notLinked = available.filter((p) => !linkedProviders.has(p));

  const onLink = async (provider: OAuthProvider) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(provider);
    setError(null);
    try {
      const { authorize_url } = await oauthStartLink(provider, token, "/account");
      window.location.href = authorize_url;
    } catch {
      setError("Не удалось начать привязку. Попробуйте позже.");
      setBusy(null);
    }
  };

  const onUnlink = async (provider: OAuthProvider) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(provider);
    setError(null);
    const res = await unlinkIdentity(token, provider);
    if (res.ok) {
      await load();
    } else {
      setError(res.message || "Не удалось отвязать способ входа");
    }
    setBusy(null);
  };

  return (
    <section className="drawing-frame p-6 bg-[var(--drawing-bg)] md:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="KeyRound" size={18} />
        <h2 className="font-gost-upright text-sm uppercase tracking-widest">Способы входа</h2>
      </div>

      {linkedFlash && (
        <p className="mb-4 flex items-center gap-2 border border-[var(--drawing-line)] bg-[var(--drawing-bg)] px-3 py-2 text-xs font-gost text-[var(--drawing-line)]">
          <Icon name="CheckCircle2" size={14} />
          Способ входа успешно привязан.
        </p>
      )}

      {error && (
        <p className="mb-4 flex items-start gap-2 border border-[var(--drawing-accent)] px-3 py-2 text-xs text-[var(--drawing-accent)]">
          <Icon name="TriangleAlert" size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {loading ? (
        <p className="font-gost text-sm text-[var(--drawing-line-thin)]">Загружаем…</p>
      ) : (
        <div className="space-y-4">
          {/* Пароль */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--drawing-line-thin)] pb-3">
            <span className="flex items-center gap-2 text-sm">
              <Icon name="Lock" size={16} />
              Вход по паролю
            </span>
            <span className="font-gost text-xs uppercase tracking-wider text-[var(--drawing-line-thin)]">
              {hasPassword ? "✓ задан" : "не задан"}
            </span>
          </div>

          {/* Привязанные провайдеры */}
          {identities.length > 0 ? (
            <ul className="space-y-2">
              {identities.map((id) => (
                <li
                  key={id.provider}
                  className="flex items-center justify-between gap-3 border border-[var(--drawing-line-thin)] px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Icon
                      name={PROVIDER_ICONS[id.provider] || "Link"}
                      fallback="Link"
                      size={16}
                    />
                    {PROVIDER_LABELS[id.provider] || id.provider}
                    {id.email && (
                      <span className="font-mono text-xs text-[var(--drawing-line-thin)]">
                        {id.email}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => onUnlink(id.provider)}
                    disabled={busy === id.provider}
                    className="font-gost text-[11px] uppercase tracking-wider text-[var(--drawing-accent)] hover:underline disabled:opacity-50"
                  >
                    {busy === id.provider ? "…" : "Отвязать"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-gost text-sm text-[var(--drawing-line-thin)]">
              Пока не привязан ни один сервис.
            </p>
          )}

          {/* Доступные для привязки */}
          {notLinked.length > 0 && (
            <div>
              <p className="font-gost text-[var(--drawing-line-thin)] text-xs uppercase tracking-wider mb-2">
                Привязать вход через
              </p>
              <div className="flex flex-wrap gap-2">
                {notLinked.map((p) => (
                  <button
                    key={p}
                    onClick={() => onLink(p)}
                    disabled={busy === p}
                    className="inline-flex items-center gap-2 border border-[var(--drawing-line)] px-3 py-2 text-xs font-gost uppercase tracking-widest hover:bg-[var(--drawing-line)] hover:text-[var(--drawing-bg)] transition disabled:opacity-50"
                  >
                    <Icon name={PROVIDER_ICONS[p] || "Link"} fallback="Link" size={14} />
                    {PROVIDER_LABELS[p] || p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasPassword && identities.length === 1 && (
            <p className="text-[var(--drawing-line-thin)] text-xs">
              Это единственный способ входа — отвязать его нельзя. Задайте пароль через
              «Восстановление пароля», чтобы не потерять доступ.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default LoginMethodsBlock;
