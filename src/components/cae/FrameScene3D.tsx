/**
 * 3D-сцена пространственной рамы (three.js / React Three Fiber).
 *
 * Зеркалит роль FrameCanvas, но для трёхмерной модели (meta.dim === "3d"):
 *  - узлы (сферы), стержни (линии), опоры (маркеры), узловые нагрузки (стрелки);
 *  - орбита-камера + сетка + оси (drei);
 *  - выбор узла/элемента кликом с подсветкой;
 *  - деформированная форма поверх исходной, когда есть результат расчёта.
 *
 * Геометрия CAE: ось Y — вертикаль (как в 2D-канве). Three.js по умолчанию тоже
 * Y-вверх, поэтому координаты модели [x,y,z] ложатся в сцену напрямую.
 *
 * Компонент намеренно автономен (read-mostly): правка модели идёт через панели
 * свойств справа, здесь — навигация, выбор и визуальная проверка пространства.
 *
 * Вспомогательные части вынесены в ./scene3d/* без изменения логики:
 *  - palette.ts     — палитра темы (useScenePalette) и общие типы/хелперы;
 *  - CameraFit.tsx  — камера, автоподгонка и быстрые виды;
 *  - SceneMeshes.tsx — узел-сфера (NodeMesh) и стрелка силы (ForceArrow).
 */
import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { GizmoHelper, GizmoViewcube, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import Icon from "@/components/ui/icon";
import type { FrameModel, SolverResponse } from "@/lib/cae-model";
import { useScenePalette, type Vec3, type ViewName, vec } from "./scene3d/palette";
import CameraFit from "./scene3d/CameraFit";
import { NodeMesh, ForceArrow } from "./scene3d/SceneMeshes";
import BoxSelect3D, { type SelectRect } from "./scene3d/BoxSelect3D";

interface Props {
  model: FrameModel;
  selectedNodeIds: string[];
  selectedElementIds: string[];
  onSelectNodes: (ids: string[]) => void;
  onSelectElements: (ids: string[]) => void;
  result: SolverResponse | null;
  /** Показывать деформированную форму поверх исходной. */
  showDeformed?: boolean;
  /** Триггер автоподгонки камеры под содержимое. */
  fitRequestId?: number;
  /** Активный инструмент: draw-node / draw-element / select. */
  mode?: "draw-node" | "draw-element" | "select";
  /** Шаг сетки для привязки клика по полу (м). */
  gridStep?: number;
  /** Добавить узел по координатам (клик по полу сцены в режиме «Узел»). */
  onAddNodeAt?: (x: number, y: number, z: number) => void;
  /** Соединить два узла стержнем по id (режим «Балка», клик по двум узлам). */
  onConnectTwoNodes?: (a: string, b: string) => void;
  /**
   * Открыть окно свойств у курсора при клике по узлу/стержню (тикет #60).
   * Координаты — экранные (clientX/clientY) для позиционирования popup.
   */
  onRequestContext?: (req: {
    kind: "node" | "element";
    id: string;
    clientX: number;
    clientY: number;
  }) => void;
}

export default function FrameScene3D({
  model,
  selectedNodeIds,
  selectedElementIds,
  onSelectNodes,
  onSelectElements,
  result,
  showDeformed,
  fitRequestId,
  mode = "select",
  gridStep = 0.5,
  onAddNodeAt,
  onConnectTwoNodes,
  onRequestContext,
}: Props) {
  const palette = useScenePalette();
  const nodeById = useMemo(
    () => new Map(model.nodes.map((n) => [n.id, n])),
    [model.nodes],
  );

  // Габариты модели для масштаба маркеров и камеры.
  const { center, radius, markerScale } = useMemo(() => {
    if (model.nodes.length === 0) {
      return { center: [0, 0, 0] as Vec3, radius: 2, markerScale: 0.05 };
    }
    const xs = model.nodes.map((n) => n.coords[0]);
    const ys = model.nodes.map((n) => n.coords[1]);
    const zs = model.nodes.map((n) => n.coords[2]);
    const min = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
    const max = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
    const c: Vec3 = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];
    const span = Math.max(
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2],
      1,
    );
    return { center: c, radius: span, markerScale: Math.max(span * 0.015, 0.03) };
  }, [model.nodes]);

  // Деформированная форма: масштабируем смещения, чтобы они были видны.
  const deformScale = useMemo(() => {
    if (!result) return 0;
    const maxDisp = result.summary?.max_displacement || 0;
    if (maxDisp <= 0) return 0;
    return (radius * 0.12) / maxDisp;
  }, [result, radius]);

  const dispById = useMemo(() => {
    const m = new Map<string, { ux: number; uy: number; uz: number }>();
    result?.nodal_displacements?.forEach((d) =>
      m.set(d.node_id, { ux: d.ux || 0, uy: d.uy || 0, uz: d.uz || 0 }),
    );
    return m;
  }, [result]);

  const handleSelectNode = (id: string, additive: boolean) => {
    onSelectElements([]);

    // Режим «Балка»: клик по узлам подряд соединяет их стержнем (как в 2D).
    if (mode === "draw-element" && onConnectTwoNodes) {
      if (selectedNodeIds.length === 1 && selectedNodeIds[0] !== id) {
        onConnectTwoNodes(selectedNodeIds[0], id);
      } else {
        onSelectNodes([id]);
      }
      return;
    }

    if (additive) {
      onSelectNodes(
        selectedNodeIds.includes(id)
          ? selectedNodeIds.filter((x) => x !== id)
          : [...selectedNodeIds, id],
      );
    } else {
      // Левый клик = ТОЛЬКО выделение. Свойства показываются в правом
      // инспекторе. Окно у курсора открывается контекстным меню (см. ниже),
      // чтобы клик-выбор не «прыгал» модалкой при каждом тапе.
      onSelectNodes([id]);
    }
  };

  const handleSelectElement = (id: string) => {
    onSelectNodes([]);
    onSelectElements([id]);
  };

  // Контекстное меню (правый клик мыши) по узлу/элементу — открывает окно
  // свойств у курсора. На правую кнопку также висит вращение камеры
  // (OrbitControls), но onContextMenu гасит системное меню и даёт popup.
  const requestContextAt = (
    kind: "node" | "element",
    id: string,
    e: { clientX: number; clientY: number },
  ) => {
    if (onRequestContext) {
      onRequestContext({ kind, id, clientX: e.clientX, clientY: e.clientY });
    }
  };

  // Точка-«призрак» под курсором в режиме «Узел» — куда встанет узел.
  const [ghost, setGhost] = useState<Vec3 | null>(null);

  // Рамка массового выделения (экранные координаты) для DOM-оверлея.
  const [selectRect, setSelectRect] = useState<SelectRect | null>(null);

  // Запрос быстрого вида: меняем id, чтобы триггерить эффект камеры даже при
  // повторном выборе того же вида.
  const [viewRequest, setViewRequest] = useState<{ view: ViewName; id: number }>();
  const setView = (view: ViewName) =>
    setViewRequest((p) => ({ view, id: (p?.id ?? 0) + 1 }));

  const VIEW_BUTTONS: { view: ViewName; label: string; title: string }[] = [
    { view: "iso", label: "ISO", title: "Изометрия" },
    { view: "front", label: "Спер.", title: "Спереди (плоскость XY)" },
    { view: "right", label: "Сбоку", title: "Сбоку (плоскость ZY)" },
    { view: "top", label: "Сверху", title: "Сверху (план XZ)" },
  ];

  return (
    <div className="absolute inset-0">
      {/* Быстрые виды — компактная панель снизу слева. */}
      <div className="absolute bottom-2 left-2 z-10 flex bg-[var(--drawing-bg)] text-[var(--drawing-line)] border border-[var(--drawing-line)] shadow-sm">
        {VIEW_BUTTONS.map((b, i) => (
          <button
            key={b.view}
            onClick={() => setView(b.view)}
            title={b.title}
            className={`px-2.5 py-1.5 font-gost text-[10px] uppercase tracking-wider hover:bg-[var(--drawing-paper)] active:bg-[var(--drawing-paper)] flex items-center gap-1 ${
              i > 0 ? "border-l border-[var(--drawing-line)]" : ""
            }`}
          >
            {b.view === "iso" && <Icon name="Box" size={12} />}
            {b.label}
          </button>
        ))}
      </div>

    <Canvas
      camera={{ fov: 45, position: [5, 4, 5] }}
      onPointerMissed={() => {
        onSelectNodes([]);
        onSelectElements([]);
      }}
      style={{ background: palette.bg }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={0.6} />
      <directionalLight position={[-10, 5, -10]} intensity={0.3} />

      {/* Сетка в горизонтальной плоскости XZ (пол) на уровне минимума по Y.
          Цвет — тонкая линия темы, как сетка 2D-канвы. */}
      <gridHelper
        args={[Math.max(radius * 3, 6), Math.max(Math.round(radius * 3), 6), palette.thin, palette.grid]}
        position={[center[0], 0, center[2]]}
      />

      {/* Невидимая плоскость-«пол» для добавления узлов кликом в режиме «Узел».
          Клик даёт точку на плоскости Y=0, координаты привязываем к шагу сетки. */}
      {mode === "draw-node" && onAddNodeAt && (
        <mesh
          position={[center[0], 0, center[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            const p = e.point;
            const snap = (v: number) => Math.round(v / gridStep) * gridStep;
            onAddNodeAt(snap(p.x), 0, snap(p.z));
          }}
          onPointerMove={(e) => {
            const p = e.point;
            const snap = (v: number) => Math.round(v / gridStep) * gridStep;
            setGhost([snap(p.x), 0, snap(p.z)]);
          }}
          onPointerOut={() => setGhost(null)}
        >
          <planeGeometry args={[Math.max(radius * 6, 20), Math.max(radius * 6, 20)]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Призрак узла — подсветка точки привязки под курсором + столбик к полу. */}
      {mode === "draw-node" && ghost && (
        <group>
          <mesh position={ghost}>
            <sphereGeometry args={[markerScale * 1.4, 16, 16]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.55} />
          </mesh>
          <Html
            position={ghost}
            center
            distanceFactor={radius * 8}
            style={{ pointerEvents: "none" }}
          >
            <div
              className="font-mono text-[10px] whitespace-nowrap px-1 py-0.5 border"
              style={{
                background: palette.bg,
                color: palette.accent,
                borderColor: palette.accent,
                transform: "translateY(140%)",
              }}
            >
              {ghost[0].toFixed(2)}, {ghost[2].toFixed(2)}
            </div>
          </Html>
        </group>
      )}

      {/* Оси координат в начале (X-красная, Y-зелёная, Z-синяя). */}
      <axesHelper args={[Math.max(radius * 0.6, 1)]} />

      {/* Стержни исходной модели. */}
      {model.elements.map((el) => {
        const a = nodeById.get(el.node_start);
        const b = nodeById.get(el.node_end);
        if (!a || !b) return null;
        const selected = selectedElementIds.includes(el.id);
        return (
          <group key={el.id}>
            <Line
              points={[vec(a.coords), vec(b.coords)]}
              color={selected ? palette.accent : palette.line}
              lineWidth={selected ? 4 : 2.5}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectElement(el.id);
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                e.nativeEvent.preventDefault();
                const ne = e.nativeEvent as PointerEvent;
                handleSelectElement(el.id);
                requestContextAt("element", el.id, { clientX: ne.clientX, clientY: ne.clientY });
              }}
            />
          </group>
        );
      })}

      {/* Деформированная форма (зелёная пунктирная) поверх исходной. */}
      {showDeformed &&
        deformScale > 0 &&
        model.elements.map((el) => {
          const a = nodeById.get(el.node_start);
          const b = nodeById.get(el.node_end);
          if (!a || !b) return null;
          const da = dispById.get(el.node_start) || { ux: 0, uy: 0, uz: 0 };
          const db = dispById.get(el.node_end) || { ux: 0, uy: 0, uz: 0 };
          const pa: Vec3 = [
            a.coords[0] + da.ux * deformScale,
            a.coords[1] + da.uy * deformScale,
            a.coords[2] + da.uz * deformScale,
          ];
          const pb: Vec3 = [
            b.coords[0] + db.ux * deformScale,
            b.coords[1] + db.uy * deformScale,
            b.coords[2] + db.uz * deformScale,
          ];
          return (
            <Line
              key={`def-${el.id}`}
              points={[pa, pb]}
              color={palette.success}
              lineWidth={2}
              dashed
              dashSize={markerScale * 4}
              gapSize={markerScale * 2}
            />
          );
        })}

      {/* Узлы. */}
      {model.nodes.map((n) => (
        <NodeMesh
          key={n.id}
          id={n.id}
          pos={vec(n.coords)}
          selected={selectedNodeIds.includes(n.id)}
          scale={markerScale * 1.4}
          palette={palette}
          onSelect={handleSelectNode}
          onContext={(id, scr) => {
            handleSelectNode(id, false);
            requestContextAt("node", id, scr);
          }}
        />
      ))}

      {/* Подписи выбранных узлов — в чертёжном стиле, как метки 2D-канвы.
          Показываем только для выбранных, чтобы не перегружать сцену. */}
      {model.nodes
        .filter((n) => selectedNodeIds.includes(n.id))
        .map((n) => (
          <Html
            key={`lbl-${n.id}`}
            position={vec(n.coords)}
            center
            distanceFactor={radius * 8}
            style={{ pointerEvents: "none" }}
          >
            <div
              className="font-gost text-[11px] font-bold whitespace-nowrap px-1.5 py-0.5 border"
              style={{
                background: palette.bg,
                color: palette.accent,
                borderColor: palette.accent,
                transform: "translateY(-150%)",
              }}
            >
              {n.id}
            </div>
          </Html>
        ))}

      {/* Опоры — полупрозрачные кубики цвета линий темы (как опоры 2D-канвы). */}
      {model.boundary_conditions.map((bc) => {
        const n = nodeById.get(bc.node_id);
        if (!n) return null;
        return (
          <mesh key={bc.id} position={vec(n.coords)}>
            <boxGeometry
              args={[markerScale * 3, markerScale * 3, markerScale * 3]}
            />
            <meshStandardMaterial color={palette.line} transparent opacity={0.4} />
          </mesh>
        );
      })}

      {/* Узловые силы — стрелки. */}
      {model.loads
        .filter((l) => l.type === "nodal_force" && l.node_id)
        .map((l) => {
          const n = nodeById.get(l.node_id!);
          if (!n) return null;
          const f = l.force || [0, 0, 0];
          const mag = Math.hypot(f[0], f[1], f[2]);
          if (mag < 1e-9) return null;
          const dir = new THREE.Vector3(f[0], f[1], f[2]).normalize();
          const len = Math.max(radius * 0.18, markerScale * 6);
          const origin = new THREE.Vector3(...vec(n.coords));
          return (
            <ForceArrow
              key={l.id}
              dir={dir}
              origin={origin}
              length={len}
              headScale={markerScale * 2}
              color={palette.accent}
            />
          );
        })}

      {/* Подпись пустой модели. */}
      {model.nodes.length === 0 && (
        <Html center>
          <div className="font-gost text-xs text-[var(--drawing-line-thin)] whitespace-nowrap bg-[var(--drawing-bg)]/80 px-3 py-1.5 border border-[var(--drawing-line-thin)]">
            Пустая 3D-модель — добавьте узлы и стержни в панели справа
          </div>
        </Html>
      )}

      {/* Рамка массового выделения левой кнопкой (тикет #60). Только в режиме
          выбора — в режимах рисования левая кнопка занята созданием узлов. */}
      <BoxSelect3D
        nodes={model.nodes}
        enabled={mode === "select"}
        onSelectNodes={(ids) => {
          onSelectElements([]);
          onSelectNodes(ids);
        }}
        onRectChange={setSelectRect}
      />

      <CameraFit
        center={center}
        radius={radius}
        fitRequestId={fitRequestId}
        viewRequest={viewRequest}
      />

      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewcube
          color={palette.paper}
          textColor={palette.line}
          strokeColor={palette.line}
          hoverColor={palette.accent}
        />
      </GizmoHelper>
    </Canvas>

    {/* Визуальный прямоугольник рамки выделения (поверх canvas, не мешает мыши). */}
    {selectRect && (
      <div
        className="fixed pointer-events-none z-20 border-2 border-dashed"
        style={{
          left: Math.min(selectRect.x0, selectRect.x1),
          top: Math.min(selectRect.y0, selectRect.y1),
          width: Math.abs(selectRect.x1 - selectRect.x0),
          height: Math.abs(selectRect.y1 - selectRect.y0),
          borderColor: palette.accent,
          background: `${palette.accent}1a`,
        }}
      />
    )}
    </div>
  );
}