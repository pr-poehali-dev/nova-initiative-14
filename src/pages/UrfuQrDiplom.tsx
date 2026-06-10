/**
 * Лендинг QR-флаера для наставничества по диплому (раздача у УрФУ).
 * Маршрут: /urfu_qr_diplom
 */
import UrfuFlyerLanding, {
  type UrfuFlyerConfig,
} from "@/components/landing/UrfuFlyerLanding";

const CONFIG: UrfuFlyerConfig = {
  path: "/urfu_qr_diplom",
  seoTitle: "Наставничество по дипломному проекту УрФУ · машиностроение — Диплом-Инж.рф",
  seoDescription:
    "Практикующие инженеры-конструкторы Екатеринбурга помогут довести дипломный проект (ВКР) до защиты: разбор замечаний, чертежи КОМПАС-3D и SolidWorks, расчёты, оформление по ЕСКД.",
  eyebrow: "Наставничество · Екатеринбург",
  title: "Доведём твой диплом до защиты",
  lead: "Практикующие инженеры-конструкторы помогут с дипломным проектом УрФУ: разберём замечания научрука, проверим чертежи и пояснительную записку, поможем с расчётами и оформлением по ЕСКД.",
  freeNote:
    "Первая консультация и диагностика проекта — бесплатно. Расскажем честно, что нужно доделать до защиты.",
  points: [
    { icon: "PencilRuler", text: "Чертежи в КОМПАС-3D и SolidWorks, оформление по ЕСКД" },
    { icon: "ClipboardCheck", text: "Разбор замечаний научрука и подготовка к защите ВКР" },
    { icon: "Users", text: "Работа один на один с практикующим инженером" },
  ],
  ctaLabel: "Узнать о программе",
  ctaTo: "/program",
  secondaryLabel: "Связаться с нами",
  secondaryTo: "/contacts",
};

export default function UrfuQrDiplom() {
  return <UrfuFlyerLanding config={CONFIG} />;
}
