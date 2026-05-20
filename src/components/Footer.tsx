import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import useContacts from "@/hooks/useContacts";

const footerLinks = [
  { label: "Программа", to: "/program" },
  { label: "Тарифы", to: "/pricing" },
  { label: "Кейсы", to: "/cases" },
  { label: "Наставники", to: "/experts" },
  { label: "О нас", to: "/about" },
  { label: "Отзывы", to: "/reviews" },
  { label: "Вакансии", to: "/vacancies" },
  { label: "FAQ", to: "/faq" },
  { label: "Контакты", to: "/contacts" },
  { label: "Политика конфиденциальности", to: "/privacy" },
];

const Footer = () => {
  const { contacts: c } = useContacts();

  return (
    <footer className="border-t-[2.5px] border-[var(--drawing-line)] bg-[var(--drawing-bg)]">
      <div className="max-w-[1200px] mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="flex flex-col gap-3">
            <Link to="/" className="font-gost font-black text-lg tracking-wide flex items-center gap-0 w-fit uppercase">
              <span className="text-[var(--drawing-accent)]">ДИПЛОМ</span>
              <span className="text-[var(--drawing-line)]">-</span>
              <span className="text-[var(--drawing-accent)]">ИНЖ</span>
              <span className="text-[var(--drawing-line)]">.РФ</span>
            </Link>
            <p className="font-gost-upright text-xs text-[var(--drawing-line-thin)] leading-relaxed max-w-[280px]">
              Наставничество по дипломному проекту&nbsp;&middot; Машиностроение и&nbsp;механика&nbsp;&middot; Екатеринбург
            </p>
            <a
              href="https://xn----gtbhgbqhkfi.xn--p1ai/"
              className="font-gost text-[10px] uppercase tracking-[0.15em] text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] transition-colors w-fit"
            >
              диплом-инж.рф
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-gost text-[10px] uppercase tracking-widest text-[var(--drawing-line-thin)] mb-1">
              Навигация
            </span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {footerLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="font-gost text-xs text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-gost text-[10px] uppercase tracking-widest text-[var(--drawing-line-thin)] mb-1">
              Контакты
            </span>
            {c.telegram && c.telegram_link && (
              <a
                href={c.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-gost text-xs text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors flex items-center gap-1.5"
              >
                <Icon name="Send" size={12} />
                Telegram {c.telegram}
              </a>
            )}
            {c.vk && c.vk_link && (
              <a
                href={c.vk_link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-gost text-xs text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors flex items-center gap-1.5"
              >
                <Icon name="Users" size={12} />
                ВКонтакте {c.vk}
              </a>
            )}
            {c.max && c.max_link && (
              <a
                href={c.max_link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-gost text-xs text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors flex items-center gap-1.5"
              >
                <Icon name="MessageCircle" size={12} />
                MAX {c.max}
              </a>
            )}
            {c.phone && (
              <a
                href={c.phone_tel || `tel:${c.phone}`}
                className="font-gost text-xs text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors flex items-center gap-1.5"
              >
                <Icon name="Phone" size={12} />
                {c.phone}
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="font-gost text-xs text-[var(--drawing-line)] hover:text-[var(--drawing-accent)] transition-colors flex items-center gap-1.5"
              >
                <Icon name="Mail" size={12} />
                {c.email}
              </a>
            )}
            {c.working_hours_label && (
              <span className="font-gost text-xs text-[var(--drawing-line-thin)] flex items-center gap-1.5">
                <Icon name="Clock" size={12} />
                {c.working_hours_label}
              </span>
            )}
          </div>
        </div>

        <div className="extension-line-h w-full mb-6" />

        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <p className="font-gost-upright text-[10px] text-[var(--drawing-line-thin)] opacity-70">
            &copy; {new Date().getFullYear()} Диплом-Инж.рф&nbsp;&middot; Все права защищены.
          </p>

          <div className="overflow-x-auto">
            <table className="stamp-table">
              <tbody>
                <tr>
                  <td rowSpan={2} className="thick-border text-center text-[9px] px-2">
                    Диплом-Инж.рф
                  </td>
                  <td className="text-[9px] text-center">Изм.</td>
                  <td className="text-[9px] text-center">Лист</td>
                  <td className="text-[9px] text-center">№ докум.</td>
                  <td className="text-[9px] text-center">Подп.</td>
                  <td className="text-[9px] text-center">Дата</td>
                </tr>
                <tr>
                  <td className="text-[9px] text-center">1</td>
                  <td className="text-[9px] text-center">1</td>
                  <td className="text-[9px] text-center">001</td>
                  <td className="text-[9px] text-center">&mdash;</td>
                  <td className="text-[9px] text-center">2026</td>
                </tr>
                <tr>
                  <td className="text-[9px]">Разраб.</td>
                  <td colSpan={3} className="text-[9px]">Наставник</td>
                  <td colSpan={2} className="text-[9px] text-center">Лит.</td>
                </tr>
                <tr>
                  <td className="text-[9px]">Пров.</td>
                  <td colSpan={3} className="text-[9px]">&mdash;</td>
                  <td className="text-[9px] text-center">У</td>
                  <td className="text-[9px] text-center">1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;