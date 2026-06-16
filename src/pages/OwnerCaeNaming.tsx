/**
 * Сервис «Название и выделение CAE» владельца (/owner/cae-naming).
 * Каркас по идее из тикета #44. Доступ только владельцу.
 */
import OwnerGuard from "@/components/owner/OwnerGuard";
import OwnerServiceSkeleton from "@/components/owner/OwnerServiceSkeleton";

const OwnerCaeNaming = () => (
  <OwnerGuard from="/owner/cae-naming">
    <OwnerServiceSkeleton
      path="/owner/cae-naming"
      icon="Tag"
      title="Название и выделение CAE"
      description="Проработка названия комплексного онлайн-приложения и плана его выделения в отдельный от сайта сервис: когда запланировать перенос, когда пора давать название и стоит ли задуматься над ним уже сейчас."
      ticket={44}
      features={[
        "Варианты названий комплексного приложения",
        "Критерии готовности к выделению в отдельный сервис",
        "План и сроки переноса CAE с основного сайта",
        "Чек-лист брендинга и регистрации названия",
        "Оценка влияния на SEO и пользователей при переносе",
      ]}
    />
  </OwnerGuard>
);

export default OwnerCaeNaming;
