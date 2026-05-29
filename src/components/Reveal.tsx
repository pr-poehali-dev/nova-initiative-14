import { ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Задержка появления в миллисекундах (для каскадного эффекта) */
  delay?: number;
}

/**
 * Обёртка для плавного появления контента при прокрутке.
 * Не меняет вёрстку внутри — добавляет только анимацию opacity/translateY.
 */
export default function Reveal({ children, className, delay = 0 }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal${visible ? " reveal-visible" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
