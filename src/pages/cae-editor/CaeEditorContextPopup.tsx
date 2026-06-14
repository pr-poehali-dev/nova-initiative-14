/**
 * Презентационная обёртка контекстного popup'а свойств узла/элемента.
 *
 * Вынесена из CaeEditor.tsx без изменения логики: рендерит
 * ContextPropertiesPopup только когда есть активная цель (target),
 * пробрасывая в него все пропсы 1:1.
 *
 * Открывается правым кликом (десктоп) или long-press 500мс (мобиль).
 */
import type { ComponentProps } from "react";
import ContextPropertiesPopup from "@/components/cae/editor/ContextPropertiesPopup";

type PopupProps = ComponentProps<typeof ContextPropertiesPopup>;

interface Props {
  /** Активная цель popup'а; null — popup скрыт. */
  target: PopupProps["target"] | null;
  popupProps: Omit<PopupProps, "target">;
}

const CaeEditorContextPopup = ({ target, popupProps }: Props) => {
  if (!target) return null;
  return <ContextPropertiesPopup target={target} {...popupProps} />;
};

export default CaeEditorContextPopup;
