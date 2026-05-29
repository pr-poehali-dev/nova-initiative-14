import { useEffect, useRef, useState } from "react";

/**
 * Хук плавного появления элемента при попадании в зону видимости.
 * Возвращает ref для целевого элемента и флаг visible.
 * Срабатывает один раз (после появления observer отключается).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Если IntersectionObserver недоступен — показываем сразу.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px", ...options },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, visible };
}
