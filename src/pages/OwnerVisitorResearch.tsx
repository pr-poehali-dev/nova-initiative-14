/**
 * Сервис «Статистика посетителей» владельца (/owner/visitor-research).
 * Каркас по идее из тикета #46. Доступ только владельцу.
 */
import OwnerGuard from "@/components/owner/OwnerGuard";
import OwnerServiceSkeleton from "@/components/owner/OwnerServiceSkeleton";

const OwnerVisitorResearch = () => (
  <OwnerGuard from="/owner/visitor-research">
    <OwnerServiceSkeleton
      path="/owner/visitor-research"
      icon="Radar"
      title="Статистика посетителей"
      description="Маркетинговое исследование поведения посетителей: понять, кто заходил по ссылке-приглашению, пробовали ли функционал, что могло не понравиться и в какой момент человек ушёл со страницы."
      ticket={46}
      features={[
        "Статистика по приглашениям: переходы по ссылке, страна, город",
        "Пошаговый разбор пути посетителя — вплоть до листания страницы",
        "Анализ демо-режимов CAE: как создавали проект",
        "Точки ухода со страницы и узкие места воронки",
        "Подробная статистика для админа и владельца",
        "Разделение «своих» (зарегистрированных) и новых посетителей",
      ]}
    />
  </OwnerGuard>
);

export default OwnerVisitorResearch;
