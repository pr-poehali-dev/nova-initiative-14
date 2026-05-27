/**
 * Контекстный popup со свойствами выбранного узла или элемента.
 *
 * Десктоп: компактный плавающий блок ~280×500px рядом с курсором
 *          (позиция корректируется, чтобы не вылезать за вьюпорт).
 * Мобиль:  bottom-sheet почти во весь экран с тёмной подложкой.
 *
 * Открывается:
 *   - правый клик по узлу/балке на десктопе
 *   - long-press (~500 мс) по узлу/балке на мобиле
 *
 * Закрывается:
 *   - Esc, клик мимо, кнопка ✕, удаление объекта
 *
 * Содержимое реюзает EditorRightPanel (роутер по типу выбранного объекта).
 */
import { useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import EditorRightPanel from "./EditorRightPanel";
import type {
  FrameModel,
  ModelNode,
  BoundaryCondition,
  ModelLoad,
  DofName,
} from "@/lib/cae-model";

export interface ContextTarget {
  /** Тип объекта, по которому открыт popup. */
  kind: "node" | "element";
  /** ID объекта (для node — селектируется в selectedNode, для element — в selectedElementId). */
  id: string;
  /** Координаты клика в координатах окна (clientX/clientY). */
  clientX: number;
  clientY: number;
}

interface Props {
  target: ContextTarget;
  onClose: () => void;

  // Данные модели и хелперы — те же, что у EditorRightPanel
  model: FrameModel;
  selectedNode: ModelNode | null | undefined;
  selectedElementId: string | null;
  nodeBC: BoundaryCondition | undefined;
  nodeLoad: ModelLoad | undefined;
  bcCustomOpen: boolean;
  setBcCustomOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  addBC: (type: BoundaryCondition["type"]) => void;
  removeBC: () => void;
  toggleCustomDof: (d: DofName) => void;
  addNodalLoad: (fx: number, fy: number) => void;
  setNodalMoment: (mz: number) => void;
  removeLoadOnNode: () => void;
  setMatPickerOpen: (v: boolean) => void;
  setSecPickerOpen: (v: boolean) => void;
  setDistributedLoad: (qy: number) => void;
  addInSpanPoint: (pos: number, py: number) => void;
  removeLoadById: (loadId: string) => void;
  setElementHinge: (end: "start" | "end", on: boolean) => void;
  deleteSelected: () => void;
}

/**
 * Прижимаем popup к границам вьюпорта: 8px отступ от краёв.
 * Используем фактический размер ширины/высоты экрана, чтобы корректно
 * работать на мобильных браузерах с динамическими тулбарами.
 */
function clampDesktopPosition(
  clientX: number,
  clientY: number,
  popupW: number,
  popupH: number,
): { left: number; top: number } {
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Слева от курсора, если справа не помещается
  let left = clientX + 12;
  if (left + popupW + margin > vw) {
    left = Math.max(margin, clientX - popupW - 12);
  }

  // Сверху от курсора, если снизу не помещается
  let top = clientY + 12;
  if (top + popupH + margin > vh) {
    top = Math.max(margin, clientY - popupH - 12);
  }

  return { left, top };
}

const ContextPropertiesPopup = ({
  target,
  onClose,
  model,
  selectedNode,
  selectedElementId,
  nodeBC,
  nodeLoad,
  bcCustomOpen,
  setBcCustomOpen,
  addBC,
  removeBC,
  toggleCustomDof,
  addNodalLoad,
  setNodalMoment,
  removeLoadOnNode,
  setMatPickerOpen,
  setSecPickerOpen,
  setDistributedLoad,
  addInSpanPoint,
  removeLoadById,
  setElementHinge,
  deleteSelected,
}: Props) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Esc — закрыть
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Блокируем скролл body ТОЛЬКО на мобиле — там popup занимает весь экран
  // и фон не должен проскальзывать. На десктопе popup компактный (300×520),
  // блокировать скролл нельзя: исчезает scroll-bar и страница «прыгает» по ширине.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) {
      return; // десктоп — ничего не делаем
    }
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  // Клик мимо — закрыть. Слушаем pointerdown по window, проверяем
  // что клик НЕ внутри popup. Mousedown в фазе capture, чтобы успеть
  // до click на канве (иначе будут гонки с handleSvgClick).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = popupRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        onClose();
      }
    };
    // Небольшая задержка — иначе закроется тем же click-ом, что и открыл.
    const t = window.setTimeout(() => {
      window.addEventListener("pointerdown", onDown, true);
    }, 50);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [onClose]);

  // Если объект, по которому открыли popup, исчез из модели
  // (удалили через кнопку «Удалить»), popup надо закрыть.
  const targetExists =
    target.kind === "node"
      ? !!selectedNode
      : !!selectedElementId && model.elements.some((e) => e.id === selectedElementId);

  useEffect(() => {
    if (!targetExists) onClose();
  }, [targetExists, onClose]);

  // Десктопное позиционирование. На мобиле игнорируется — popup
  // занимает почти весь экран через CSS.
  const POPUP_W = 300;
  const POPUP_H = 520;
  const pos = clampDesktopPosition(target.clientX, target.clientY, POPUP_W, POPUP_H);

  const title =
    target.kind === "node" ? `Узел ${target.id}` : `Элемент ${target.id}`;

  return (
    <>
      {/* Подложка — только на мобиле, чтобы было видно «модальность».
          touchAction:none — гасит скролл фона при свайпе по подложке. */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        style={{ touchAction: "none" }}
        onPointerDown={onClose}
        aria-hidden="true"
      />

      <div
        ref={popupRef}
        role="dialog"
        aria-label={title}
        className="
          fixed z-50 bg-[var(--drawing-bg)] border-2 border-[var(--drawing-line)] shadow-2xl
          flex flex-col
          md:max-h-[80vh]
          inset-x-0 bottom-0 max-h-[85vh]
          md:inset-auto
        "
        style={{
          // На десктопе (≥768px) — позиция у курсора и фикс. размеры.
          // На мобиле эти стили перебиваются Tailwind-классами выше.
          ...(window.matchMedia("(min-width: 768px)").matches
            ? {
                left: pos.left,
                top: pos.top,
                width: POPUP_W,
                maxHeight: POPUP_H,
              }
            : {}),
        }}
      >
        {/* Шапка popup'а с кнопкой закрытия */}
        <div className="flex items-center justify-between px-3 py-2 border-b-2 border-[var(--drawing-line)] bg-[var(--drawing-paper)] shrink-0">
          <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-line)] font-bold">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[var(--drawing-bg)]"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Содержимое скроллится, шапка зафиксирована */}
        <div className="overflow-y-auto flex-1 p-0">
          {/* EditorRightPanel сам обрамляется border + p-3, поэтому никаких доп. обёрток. */}
          <EditorRightPanel
            model={model}
            selectedNode={selectedNode}
            selectedElementId={selectedElementId}
            nodeBC={nodeBC}
            nodeLoad={nodeLoad}
            bcCustomOpen={bcCustomOpen}
            setBcCustomOpen={setBcCustomOpen}
            addBC={addBC}
            removeBC={removeBC}
            toggleCustomDof={toggleCustomDof}
            addNodalLoad={addNodalLoad}
            setNodalMoment={setNodalMoment}
            removeLoadOnNode={removeLoadOnNode}
            setMatPickerOpen={setMatPickerOpen}
            setSecPickerOpen={setSecPickerOpen}
            setDistributedLoad={setDistributedLoad}
            addInSpanPoint={addInSpanPoint}
            removeLoadById={removeLoadById}
            setElementHinge={setElementHinge}
            deleteSelected={deleteSelected}
          />
        </div>
      </div>
    </>
  );
};

export default ContextPropertiesPopup;