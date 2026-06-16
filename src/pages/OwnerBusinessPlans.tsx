/**
 * Сервис «Бизнес-планы» владельца (/owner/business-plans).
 * Каркас по идее из тикета #47. Доступ только владельцу.
 */
import OwnerGuard from "@/components/owner/OwnerGuard";
import OwnerServiceSkeleton from "@/components/owner/OwnerServiceSkeleton";

const OwnerBusinessPlans = () => (
  <OwnerGuard from="/owner/business-plans">
    <OwnerServiceSkeleton
      path="/owner/business-plans"
      icon="Briefcase"
      title="Бизнес-планы"
      description="Конструктор полноценных бизнес-планов для CAE/PLM и менторства: с возможностью создать новый или скопировать существующий, собрать всю важную информацию и сформировать документ достойного качества для презентации роста и текущего положения."
      ticket={47}
      features={[
        "MindMap-структура планирования (по образцу MindMeister)",
        "Расчёты по канонам и формулам экономики",
        "Графики и визуализация ключевых показателей",
        "Выбор источников по каждому разделу (по умолчанию — самый популярный)",
        "Справки и краткие выжимки из уважаемых источников",
        "Создание и копирование готовых бизнес-планов",
      ]}
    />
  </OwnerGuard>
);

export default OwnerBusinessPlans;
