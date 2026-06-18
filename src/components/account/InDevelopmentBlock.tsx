/**
 * Блок «В разработке» в личном кабинете владельца (только is_owner).
 *
 * Единая витрина внутренних сервисов в стадии разработки. Каждая карточка ведёт
 * в свой раздел. Сейчас здесь:
 *  - НИР — рабочий раздел с серверным хранением и версиями;
 *  - три сервиса из идей-тикетов в работе (каркасы): Бизнес-планы (#47),
 *    Статистика посетителей (#46), Название/выделение CAE (#44).
 * Расширяется добавлением записи в массив SERVICES.
 */
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

type ServiceState = "ready" | "skeleton";

interface DevService {
  to: string;
  icon: string;
  title: string;
  description: string;
  state: ServiceState;
  /** Номер тикета-источника идеи (если есть). */
  ticket?: number;
}

const SERVICES: DevService[] = [
  {
    to: "/owner/research",
    icon: "FlaskConical",
    title: "Редактор НИР",
    description:
      "Конструктор научно-исследовательской работы по ГОСТ 7.32-2017: разделы с подсказками, дорожная карта прогресса, настройки оформления под вуз/кафедру (по умолчанию УрФУ) и экспорт в Word, PDF и с рамкой по ЕСКД. Версии и хранение на сервере.",
    state: "ready",
  },
  {
    to: "/owner/economics",
    icon: "Wallet",
    title: "Экономика сайта",
    description:
      "Учёт расходов на создание и поддержку: итог затрат, регулярные платежи в месяц и разбивка по категориям. Данные на сервере.",
    state: "ready",
  },
  {
    to: "/owner/blog",
    icon: "PenSquare",
    title: "Статьи для блогов",
    description:
      "Закрытое хранилище статей для Яндекс Дзен и других площадок: список, редактор с разметкой, метаданные (обложка, теги, статус) и превью «как в Дзене». Доступ только владельцу.",
    state: "ready",
  },
  {
    to: "/owner/business-plans",
    icon: "Briefcase",
    title: "Бизнес-планы",
    description:
      "Конструктор по методике «Корпорации МСП»: резюме, маркетинг, производство, персонал, финансы (себестоимость, ФОТ, взносы, прибыль) и план действий. Плюс MindMap-карта и калькулятор.",
    state: "ready",
    ticket: 47,
  },
  {
    to: "/owner/visitor-research",
    icon: "Radar",
    title: "Статистика посетителей",
    description:
      "Маркетинговое исследование поведения: путь посетителя по ссылке-приглашению, демо CAE, точки ухода со страницы.",
    state: "skeleton",
    ticket: 46,
  },
  {
    to: "/owner/cae-naming",
    icon: "Tag",
    title: "Название и выделение CAE",
    description:
      "Проработка названия комплексного приложения и плана его выделения в отдельный сервис от сайта.",
    state: "skeleton",
    ticket: 44,
  },
];

const STATE_META: Record<ServiceState, { label: string; cls: string }> = {
  ready: {
    label: "Готово к работе",
    cls: "border-green-700 text-green-700",
  },
  skeleton: {
    label: "В разработке",
    cls: "border-[var(--drawing-accent)] text-[var(--drawing-accent)]",
  },
};

export default function InDevelopmentBlock() {
  return (
    <section className="drawing-frame p-6 bg-[var(--drawing-bg)] mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="Hammer" size={18} />
        <h2 className="font-gost-upright text-sm uppercase tracking-widest">
          В разработке
        </h2>
        <span className="inline-flex items-center gap-1 bg-[var(--drawing-line)] text-[var(--drawing-bg)] px-1.5 py-0.5 font-gost text-[9px] uppercase tracking-wider ml-1">
          <Icon name="Crown" size={9} /> Владелец
        </span>
      </div>
      <p className="font-gost text-xs text-[var(--drawing-line-thin)] mb-4 leading-snug">
        Внутренние сервисы в&nbsp;стадии разработки. НИР уже работает, остальные&nbsp;—
        каркасы по&nbsp;идеям из&nbsp;тикетов в&nbsp;работе.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {SERVICES.map((s) => {
          const meta = STATE_META[s.state];
          return (
            <Link
              key={s.to}
              to={s.to}
              className="flex items-start gap-3 border-[1.5px] border-[var(--drawing-line)] hover:border-[var(--drawing-accent)] p-3 transition-colors group"
            >
              <Icon
                name={s.icon}
                size={22}
                fallback="Hammer"
                className="text-[var(--drawing-accent)] shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-gost-upright font-bold text-sm group-hover:text-[var(--drawing-accent)] transition-colors">
                    {s.title}
                  </p>
                  <span
                    className={`inline-flex items-center font-gost text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                  {s.ticket && (
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[var(--drawing-line-thin)]">
                      <Icon name="Ticket" size={9} className="shrink-0" />#{s.ticket}
                    </span>
                  )}
                </div>
                <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-0.5">
                  {s.description}
                </p>
              </div>
              <Icon
                name="ArrowRight"
                size={16}
                className="text-[var(--drawing-line-thin)] shrink-0 mt-1 group-hover:text-[var(--drawing-accent)] transition-colors"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}