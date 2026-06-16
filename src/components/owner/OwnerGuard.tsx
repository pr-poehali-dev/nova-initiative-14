/**
 * Гард доступа для владельческих разделов. Пускает только is_owner; остальных
 * редиректит (гостей — на /login, прочих — в кабинет). Пока проверяется
 * сессия — показывает заглушку загрузки.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function OwnerGuard({ from, children }: { from: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav("/login", { replace: true, state: { from } });
    } else if (!user.is_owner) {
      nav("/account", { replace: true });
    }
  }, [user, loading, nav, from]);

  if (loading || !user || !user.is_owner) {
    return (
      <div className="max-w-[800px] mx-auto px-4 pt-24 pb-12 text-center font-gost text-[var(--drawing-line-thin)]">
        Загружаем…
      </div>
    );
  }
  return <>{children}</>;
}
