/**
 * Минимальная замена react-helmet-async без внешней зависимости.
 * Helmet — рендерит детей в <head> через React Portal.
 * HelmetProvider — пустая обёртка для совместимости.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// HelmetProvider — просто прокидывает children
export const HelmetProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

// Helmet — рендерит children в document.head через Portal
export const Helmet = ({ children }: { children?: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!containerRef.current) {
    containerRef.current = document.createElement("div");
    document.head.appendChild(containerRef.current);
  }

  useEffect(() => {
    const container = containerRef.current!;
    return () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  if (!containerRef.current) return null;
  return createPortal(children, containerRef.current);
};
