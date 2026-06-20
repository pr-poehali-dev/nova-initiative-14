/**
 * Обёртка над страницей 404, добавляющая поисковым системам сигнал
 * «настоящего» HTTP 404.
 *
 * Зачем: хостинг SPA на любой несуществующий URL отдаёт index.html с кодом
 * 200 OK. Поисковик видит 200 и считает битый адрес валидной страницей —
 * это «мягкий 404» (soft 404), который засоряет индекс и мешает индексации
 * сайта. Мета-тег prerender-status-code заставляет пре-рендер/краулер вернуть
 * корректный код 404, а robots=noindex убирает такие URL из индекса.
 *
 * Сам визуальный компонент NotFound защищён от правок, поэтому сигнал вынесен
 * в эту лёгкую обёртку и используется вместо NotFound в роутере и там, где
 * раньше рендерился NotFound напрямую (например, отсутствующая статья блога).
 */
import { Helmet } from "@/lib/helmet-shim";
import NotFound from "@/pages/NotFound";

const NotFoundPage = () => (
  <>
    <Helmet>
      <title>Страница не найдена · 404 · Диплом-Инж.рф</title>
      <meta name="prerender-status-code" content="404" />
      <meta name="robots" content="noindex, nofollow" />
      <meta name="yandex" content="noindex, nofollow" />
    </Helmet>
    <NotFound />
  </>
);

export default NotFoundPage;