/**
 * Презентационный компонент модальных окон и диалогов CAE-редактора.
 *
 * Вынесен из CaeEditor.tsx без изменения логики: повторяет 1:1 плавающую
 * кнопку «Нагрузки», окно ввода нагрузок, выбор материала/сечения, диалоги
 * горячих клавиш, туториала, приветствия, настроек расчёта и лимита узлов.
 *
 * Состояние и колбэки приходят через пропсы из CaeEditor.tsx.
 */
import type { ComponentProps } from "react";
import Icon from "@/components/ui/icon";
import NodeLimitModal from "@/components/cae/NodeLimitModal";
import { MaterialPicker, SectionPicker } from "@/components/cae/CatalogPanel";
import KeyboardHintsDialog from "@/components/cae/editor/KeyboardHintsDialog";
import EditorTutorial from "@/components/cae/editor/EditorTutorial";
import EditorWelcomeDialog from "@/components/cae/editor/EditorWelcomeDialog";
import EditorAnalysisSettingsDialog from "@/components/cae/editor/EditorAnalysisSettingsDialog";
import LoadInputModal from "@/components/cae/editor/LoadInputModal";

type LoadModalProps = ComponentProps<typeof LoadInputModal>;

interface Props {
  // Плавающая кнопка «Нагрузки»
  showLoadButton: boolean;
  loadButtonNodeId: string;
  onOpenLoadModal: () => void;
  // Окно ввода нагрузок
  loadModalProps: LoadModalProps;
  // Выбор материала / сечения
  materialPickerProps: ComponentProps<typeof MaterialPicker>;
  sectionPickerProps: ComponentProps<typeof SectionPicker>;
  // Диалоги
  helpOpen: boolean;
  onCloseHelp: () => void;
  tutorialOpen: boolean;
  onCloseTutorial: () => void;
  welcomeProps: ComponentProps<typeof EditorWelcomeDialog>;
  analysisSettingsProps: ComponentProps<typeof EditorAnalysisSettingsDialog>;
  nodeLimitProps: ComponentProps<typeof NodeLimitModal>;
}

const CaeEditorModals = ({
  showLoadButton,
  loadButtonNodeId,
  onOpenLoadModal,
  loadModalProps,
  materialPickerProps,
  sectionPickerProps,
  helpOpen,
  onCloseHelp,
  tutorialOpen,
  onCloseTutorial,
  welcomeProps,
  analysisSettingsProps,
  nodeLimitProps,
}: Props) => (
  <>
    {/* Плавающая кнопка «Нагрузки» — видна, когда выбран ровно один узел.
        Даёт явный и заметный способ открыть модалку ввода нагрузок
        (вместо неочевидного правого клика). */}
    {showLoadButton && (
      <button
        onClick={onOpenLoadModal}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[var(--drawing-accent)] text-white font-gost-upright font-bold text-xs uppercase tracking-wider px-5 py-3 shadow-2xl border-2 border-[var(--drawing-line)] flex items-center gap-2 hover:brightness-110 active:scale-95 transition"
      >
        <Icon name="MoveDown" size={16} />
        Нагрузки на узел {loadButtonNodeId}
      </button>
    )}

    <LoadInputModal {...loadModalProps} />

    <MaterialPicker {...materialPickerProps} />
    <SectionPicker {...sectionPickerProps} />

    <KeyboardHintsDialog open={helpOpen} onClose={onCloseHelp} />
    <EditorTutorial open={tutorialOpen} onClose={onCloseTutorial} />
    <EditorWelcomeDialog {...welcomeProps} />
    <EditorAnalysisSettingsDialog {...analysisSettingsProps} />

    <NodeLimitModal {...nodeLimitProps} />
  </>
);

export default CaeEditorModals;