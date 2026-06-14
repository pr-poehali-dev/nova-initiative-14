/**
 * Презентационный компонент основной раскладки CAE-редактора.
 *
 * Вынесен из CaeEditor.tsx без изменения логики: повторяет 1:1 разметку
 * верхней панели, баннера черновика, левой панели инструментов, кнопок-
 * «язычков» для 3D, канвы и боковых панелей.
 *
 * Вся бизнес-логика (хуки, состояние, действия) остаётся в CaeEditor.tsx —
 * сюда приходят только готовые значения и колбэки через пропсы.
 */
import type { ComponentProps } from "react";
import Icon from "@/components/ui/icon";
import EditorTopBar from "@/components/cae/editor/EditorTopBar";
import EditorCanvasArea from "@/components/cae/editor/EditorCanvasArea";
import EditorSidePanels from "@/components/cae/editor/EditorSidePanels";
import EditorLeftPanel from "@/components/cae/editor/EditorLeftPanel";
import DraftRestoreBanner from "@/components/cae/editor/DraftRestoreBanner";

interface Props {
  is3d: boolean;
  leftPanelOpen: boolean;
  setLeftPanelOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  draftFound: { savedAt: number } | null | undefined;
  restoreDraft: () => void;
  discardDraft: () => void;
  topBarProps: ComponentProps<typeof EditorTopBar>;
  leftPanelProps: ComponentProps<typeof EditorLeftPanel>;
  canvasProps: ComponentProps<typeof EditorCanvasArea>;
  sidePanelsProps: ComponentProps<typeof EditorSidePanels>;
}

const CaeEditorLayout = ({
  is3d,
  leftPanelOpen,
  setLeftPanelOpen,
  rightPanelOpen,
  setRightPanelOpen,
  draftFound,
  restoreDraft,
  discardDraft,
  topBarProps,
  leftPanelProps,
  canvasProps,
  sidePanelsProps,
}: Props) => (
  <div className="pt-16 md:pt-16">
    <EditorTopBar {...topBarProps} />

    {draftFound && (
      <DraftRestoreBanner
        savedAt={draftFound.savedAt}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />
    )}

    <div
      className={
        is3d
          ? "relative w-full px-0 py-0"
          : "max-w-[1400px] mx-auto px-3 py-3 grid gap-3 lg:grid-cols-[240px_1fr_300px]"
      }
    >
      {/* Левая панель инструментов.
          3D: скрываемый плавающий оверлей слева поверх канвы.
          2D: статичная колонка слева. */}
      <div
        className={
          is3d
            ? `hidden lg:block absolute top-3 left-3 z-20 w-[240px] transition-transform duration-200 ${
                leftPanelOpen ? "translate-x-0" : "-translate-x-[260px]"
              }`
            : "hidden lg:block"
        }
      >
        <EditorLeftPanel {...leftPanelProps} />
      </div>

      {/* 3D: кнопки-«язычки» для показа/скрытия панелей. */}
      {is3d && (
        <>
          <button
            onClick={() => setLeftPanelOpen((v) => !v)}
            className="hidden lg:flex absolute top-3 z-30 items-center justify-center w-7 h-12 bg-[var(--drawing-bg)] border border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] transition-all duration-200"
            style={{ left: leftPanelOpen ? "259px" : "12px" }}
            title={leftPanelOpen ? "Скрыть панель инструментов" : "Показать панель инструментов"}
          >
            <Icon name={leftPanelOpen ? "ChevronLeft" : "ChevronRight"} size={16} />
          </button>
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            className="hidden lg:flex absolute top-3 z-30 items-center justify-center w-7 h-12 bg-[var(--drawing-bg)] border border-[var(--drawing-line)] hover:bg-[var(--drawing-paper)] transition-all duration-200"
            style={{ right: rightPanelOpen ? "319px" : "12px" }}
            title={rightPanelOpen ? "Скрыть инспектор" : "Показать инспектор"}
          >
            <Icon name={rightPanelOpen ? "ChevronRight" : "ChevronLeft"} size={16} />
          </button>
        </>
      )}

      <EditorCanvasArea {...canvasProps} />

      <div
        className={
          is3d
            ? `hidden lg:block absolute top-3 right-3 z-20 w-[300px] max-h-[calc(100vh-96px)] overflow-y-auto transition-transform duration-200 ${
                rightPanelOpen ? "translate-x-0" : "translate-x-[320px]"
              }`
            : "contents"
        }
      >
        <EditorSidePanels {...sidePanelsProps} />
      </div>
    </div>
  </div>
);

export default CaeEditorLayout;
