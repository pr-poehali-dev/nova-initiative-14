import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const STORAGE_KEY = "cookie_consent_v1";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const t = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, ts: Date.now() }));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[100]">
      <div className="drawing-frame bg-[var(--drawing-bg)] p-4 md:p-5 shadow-lg relative">
        <div className="zone-marker top-2 left-3">C1</div>
        <div className="font-gost text-[9px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-2">
          Согласие&nbsp;&middot; 152-ФЗ
        </div>
        <div className="extension-line-h w-full mb-3" />
        <p className="font-gost text-xs text-[var(--drawing-line)] leading-relaxed mb-3">
          Мы используем cookies и&nbsp;обрабатываем технические данные для работы сайта и&nbsp;аналитики. Продолжая пользоваться сайтом, вы&nbsp;соглашаетесь с&nbsp;{" "}
          <Link to="/privacy" className="text-[var(--drawing-accent)] hover:underline">
            политикой конфиденциальности
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="btn-drawing btn-drawing-accent text-[11px] inline-flex items-center gap-1.5"
        >
          <Icon name="Check" size={12} />
          Принять
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
