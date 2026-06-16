/**
 * HTTP-обёртки и типы для MindMap (модуль «Бизнес-планы», research-api).
 * Карта — единый документ владельца с узлами и связями, хранится как JSON.
 * Также здесь генератор стартовой карты с полной архитектурой сайта.
 */
import func2url from "../../backend/func2url.json";
import { authorizedFetch } from "@/lib/auth";

const API = (func2url as Record<string, string>)["research-api"];

/** Цветовые роли узлов (мапятся в стили на канве). */
export type NodeColor = "root" | "group" | "leaf" | "backend" | "db" | "accent";

export interface MindNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: NodeColor;
}

export interface MindEdge {
  from: string;
  to: string;
}

export interface MindMapData {
  nodes: MindNode[];
  edges: MindEdge[];
}

export interface MindMap {
  id: number;
  title: string;
  data: MindMapData;
  updated_at: string | null;
}

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  message?: string;
}

async function call<T = unknown>(action: string, body?: unknown): Promise<ApiResult<T>> {
  const qs = new URLSearchParams({ action }).toString();
  const res = await authorizedFetch(`${API}?${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const obj = (data as Record<string, unknown>) || {};
  return {
    ok: res.ok,
    status: res.status,
    data: data as T,
    error: (obj.error as string) || undefined,
    message: (obj.message as string) || undefined,
  };
}

/** Получить карту владельца (создаст стартовую при первом обращении). */
export function getMindMap() {
  return call<MindMap>("mindmap-get", {
    default_title: "Архитектура сайта",
    default_data: buildSiteArchitectureMap(),
  });
}

/** Сохранить карту. */
export function saveMindMap(id: number, title: string, data: MindMapData) {
  return call<{ ok: boolean }>("mindmap-save", { id, title, data });
}

/**
 * Стартовая карта: полная структура сайта Диплом-Инж.рф.
 * Автораскладка «радиальными колонками» вокруг корня: группы по вертикали
 * слева и справа, листья — рядом со своей группой.
 */
export function buildSiteArchitectureMap(): MindMapData {
  const nodes: MindNode[] = [];
  const edges: MindEdge[] = [];

  const ROOT_X = 1400;
  const ROOT_Y = 1200;
  nodes.push({ id: "root", text: "Диплом-Инж.рф", x: ROOT_X, y: ROOT_Y, color: "root" });

  // Группа: { id, заголовок, цвет листьев, [листья], сторона (-1 слева / +1 справа), индекс ряда }
  type Group = { id: string; title: string; leafColor: NodeColor; leaves: string[]; side: -1 | 1; row: number };
  const groups: Group[] = [
    {
      id: "g_marketing", title: "Маркетинговые страницы", leafColor: "leaf", side: -1, row: 0,
      leaves: ["Главная /", "Программа", "Цены", "Кейсы", "Эксперты", "FAQ", "Контакты", "О нас", "Отзывы", "Вакансии", "Блог", "Статья блога"],
    },
    {
      id: "g_auth", title: "Авторизация", leafColor: "leaf", side: -1, row: 1,
      leaves: ["Вход", "Регистрация", "Подтверждение email", "Забыли пароль", "Сброс пароля", "OAuth callback"],
    },
    {
      id: "g_account", title: "Личный кабинет", leafColor: "accent", side: -1, row: 2,
      leaves: ["Подписка", "Спец-я (маш/строй)", "Очки и ачивки", "Мои тикеты", "Профиль", "Способы входа", "Дорожные карты", "Админ-панель"],
    },
    {
      id: "g_cae", title: "CAE-приложение", leafColor: "accent", side: 1, row: 0,
      leaves: ["Лендинг CAE", "Мои проекты", "Новый проект", "Редактор проекта", "Демо-редактор", "Changelog CAE"],
    },
    {
      id: "g_owner", title: "В разработке (владелец)", leafColor: "accent", side: 1, row: 1,
      leaves: ["НИР", "Экономика сайта", "Бизнес-планы", "Статистика посетителей", "Название CAE"],
    },
    {
      id: "g_admin", title: "Админ-разделы", leafColor: "leaf", side: 1, row: 2,
      leaves: ["Генератор рекламы", "Статистика", "Посетители", "QR-коды", "Печать листовок"],
    },
    {
      id: "g_backend", title: "Бэкенд (функции)", leafColor: "backend", side: 1, row: 3,
      leaves: ["sso-auth — авторизация", "cae-api — проекты", "cae-solver — решатель", "cae-verify — проверка", "support-api — тикеты", "notifications-api — уведомления", "referral-api — рефералы", "research-api — НИР/планы", "track-visit — визиты", "page-view — просмотры", "recovery-log — восстановление", "get-contacts — контакты", "get-tariffs — тарифы", "create-lead — заявки", "create-vacancy — вакансии"],
    },
    {
      id: "g_db", title: "База данных", leafColor: "db", side: -1, row: 3,
      leaves: ["sso_users — пользователи", "cae_projects — проекты", "cae_solver_runs — расчёты", "support_tickets — тикеты", "user_points — очки", "user_notifications — уведомления", "engineering_articles — статьи", "site_visits — визиты", "ad_campaigns — кампании", "owner_research_papers — НИР", "owner_site_expenses — расходы", "owner_mindmaps — карты"],
    },
  ];

  // Раскладка: считаем «высоту» каждой группы по числу листьев, чтобы они не
  // налезали друг на друга. Листья ставим вертикальной колонкой за группой.
  const LEAF_GAP = 64;
  const GROUP_DX = 360;     // отступ группы от корня по X
  const LEAF_DX = 300;      // отступ листьев от группы по X
  const ROW_GAP = 130;      // вертикальный зазор между блоками групп

  // Раздельные курсоры высоты для левой и правой стороны.
  const sideTopY: Record<number, number> = { [-1]: ROOT_Y - 900, [1]: ROOT_Y - 900 };

  for (const g of groups) {
    const blockHeight = Math.max(1, g.leaves.length) * LEAF_GAP;
    const topY = sideTopY[g.side];
    const centerY = topY + blockHeight / 2;
    const gx = ROOT_X + g.side * GROUP_DX;

    nodes.push({ id: g.id, text: g.title, x: gx, y: centerY, color: "group" });
    edges.push({ from: "root", to: g.id });

    g.leaves.forEach((leaf, i) => {
      const lid = `${g.id}_${i}`;
      const ly = topY + i * LEAF_GAP + LEAF_GAP / 2;
      const lx = gx + g.side * LEAF_DX;
      nodes.push({ id: lid, text: leaf, x: lx, y: ly, color: g.leafColor });
      edges.push({ from: g.id, to: lid });
    });

    sideTopY[g.side] = topY + blockHeight + ROW_GAP;
  }

  return { nodes, edges };
}
