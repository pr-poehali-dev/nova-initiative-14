/**
 * Шим для совместимости старого API react-helmet-async с новой реализацией react-helmet.
 *
 * Было: import { Helmet, HelmetProvider } from "react-helmet-async";
 * Стало: import { Helmet, HelmetProvider } from "@/lib/helmet-shim";
 *
 * react-helmet@6 не требует Provider (использует глобальный side-effect),
 * поэтому HelmetProvider здесь — простой passthrough компонент.
 *
 * Зачем: react-helmet-async@3 имеет CommonJS-only зависимость shallowequal,
 * которую Vite ломает при pre-bundle в dev preview poehali.dev.
 * react-helmet@6 — чистый ESM, без таких проблем.
 */
import { Helmet as RHelmet } from "react-helmet";
import type { ReactNode } from "react";

export const Helmet = RHelmet;

export function HelmetProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
