/**
 * Презентационная обёртка демо-редактора CAE.
 *
 * Вынесена из CaeDemoEditor.tsx без изменения логики: рендерит Helmet и те же
 * общие компоненты раскладки (CaeEditorLayout / CaeEditorModals /
 * CaeEditorContextPopup) плюс модалку лимита демо. Все пропсы приходят уже
 * собранными из CaeDemoEditor.tsx — здесь только разметка.
 */
import type { ComponentProps } from "react";
import { Helmet } from "@/lib/helmet-shim";
import DemoLimitModal from "@/components/cae/DemoLimitModal";
import { SITE_URL } from "@/lib/seo";
import CaeEditorLayout from "./CaeEditorLayout";
import CaeEditorModals from "./CaeEditorModals";
import CaeEditorContextPopup from "./CaeEditorContextPopup";

interface Props {
  layoutProps: ComponentProps<typeof CaeEditorLayout>;
  modalsProps: ComponentProps<typeof CaeEditorModals>;
  popupProps: ComponentProps<typeof CaeEditorContextPopup>;
  demoLimitModalProps: ComponentProps<typeof DemoLimitModal>;
  /** Встроенный режим (виджет): без Helmet/SEO и без стандартной
   *  модалки лимита (вместо неё — партнёрская заявка). */
  embedded?: boolean;
}

const CaeDemoEditorView = ({
  layoutProps,
  modalsProps,
  popupProps,
  demoLimitModalProps,
  embedded,
}: Props) => (
  <>
    {!embedded && (
      <Helmet>
        <title>Демо CAE-редактора — расчёт рам и балок · Диплом-Инж.рф</title>
        <meta
          name="description"
          content="Попробуйте облачный CAE-редактор без регистрации: нарисуйте плоскую раму, задайте нагрузки и опоры, запустите МКЭ-расчёт, получите эпюры N/Q/M прямо в браузере."
        />
        <link rel="canonical" href={`${SITE_URL}/cae/demo`} />
      </Helmet>
    )}

    <CaeEditorLayout {...layoutProps} />

    <CaeEditorModals {...modalsProps} />

    {!embedded && <DemoLimitModal {...demoLimitModalProps} />}

    <CaeEditorContextPopup {...popupProps} />
  </>
);

export default CaeDemoEditorView;