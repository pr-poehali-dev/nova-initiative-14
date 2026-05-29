import Icon from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";

/**
 * Кнопка переключения светлой/тёмной темы сайта.
 * Иконка: солнце в тёмной теме (клик → светлая), луна в светлой (клик → тёмная).
 */
const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      className={`flex items-center justify-center min-w-[40px] min-h-[40px] border border-[var(--drawing-line)] text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] hover:border-[var(--drawing-accent)] transition-colors ${className}`}
    >
      <Icon name={isDark ? "Sun" : "Moon"} size={16} />
    </button>
  );
};

export default ThemeToggle;
