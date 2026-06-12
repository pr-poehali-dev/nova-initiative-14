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
 */
import { useMemo, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewcube, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import Icon from "@/components/ui/icon";
import type { FrameModel, SolverResponse } from "@/lib/cae-model";

/**
 * Палитра 3D-сцены. Читается из CSS-переменных «чертёжной» темы, чтобы
 * 3D-канва выглядела одинаково с 2D-редактором и корректно реагировала
 * на светлую/тёмную тему. Значения после двоеточия — фолбэк (светлая тема).
 */
interface ScenePalette {
  bg: string;
  line: string;
  thin: string;
  accent: string;
  success: string;
  grid: string;
  paper: string;
}

const FALLBACK_PALETTE: ScenePalette = {
  bg: "#faf8f0",
  line: "#1a1a2e",
  thin: "#3a3a5e",
  accent: "#c0392b",
  success: "#1a8a5a",
  grid: "#d8d4c4",
  paper: "#f5f3e8",
};

/** Читает текущие значения CSS-переменных темы (реагирует на html.dark). */
function useScenePalette(): ScenePalette {
  const [palette, setPalette] = useState<ScenePalette>(FALLBACK_PALETTE);
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (name: string, fb: string) =>
        s.getPropertyValue(name).trim() || fb;
      setPalette({
        bg: v("--drawing-bg", FALLBACK_PALETTE.bg),
        line: v("--drawing-line", FALLBACK_PALETTE.line),
        thin: v("--drawing-line-thin", FALLBACK_PALETTE.thin),
        accent: v("--drawing-accent", FALLBACK_PALETTE.accent),
        success: v("--drawing-success", FALLBACK_PALETTE.success),
        // Для линий сетки используем тонкий тон бумаги/линии.
        grid: v("--drawing-line-thin", FALLBACK_PALETTE.grid),
        paper: v("--drawing-paper", FALLBACK_PALETTE.paper),
      });
    };
    read();
    // Реагируем на переключение темы (класс html.dark).
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return palette;
}

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
}

type Vec3 = [number, number, number];

/** Именованные ракурсы быстрых видов. */
type ViewName = "iso" | "front" | "back" | "left" | "right" | "top" | "bottom";

/** Единичные направления камеры (откуда смотрим) для каждого вида.
 *  Ось Y — вертикаль (вверх). */
const VIEW_DIRS: Record<ViewName, Vec3> = {
  iso: [1, 0.8, 1],
  front: [0, 0, 1], // смотрим вдоль −Z (плоскость XY, как 2D)
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
};

const vec = (c: [number, number, number]): Vec3 => [c[0], c[1], c[2]];

/**
 * Камера: автоподгонка под габариты и установка именованных ракурсов.
 * Реагирует на fitRequestId (изометрия + фит) и на viewRequest (конкретный вид).
 */
function CameraFit({
  center,
  radius,
  fitRequestId,
  viewRequest,
}: {
  center: Vec3;
  radius: number;
  fitRequestId?: number;
  viewRequest?: { view: ViewName; id: number };
}) {
  const { camera } = useThree();

  const place = (dir: Vec3) => {
    const d = Math.max(radius * 2.2, 2);
    const n = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
    camera.position.set(
      center[0] + n.x * d,
      center[1] + n.y * d,
      center[2] + n.z * d,
    );
    camera.near = d / 100;
    camera.far = d * 50;
    // Для вида «сверху/снизу» подменяем up, иначе камера вырождается.
    if (dir[0] === 0 && dir[2] === 0) {
      camera.up.set(0, 0, dir[1] > 0 ? -1 : 1);
    } else {
      camera.up.set(0, 1, 0);
    }
    camera.updateProjectionMatrix();
    camera.lookAt(center[0], center[1], center[2]);
  };

  useEffect(() => {
    place(VIEW_DIRS.iso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequestId]);

  useEffect(() => {
    if (viewRequest) place(VIEW_DIRS[viewRequest.view]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRequest?.id]);

  return (
    <OrbitControls target={center} enableDamping dampingFactor={0.1} makeDefault />
  );
}

/** Узел-сфера с обработкой клика. */
function NodeMesh({
  id,
  pos,
  selected,
  scale,
  palette,
  onSelect,
}: {
  id: string;
  pos: Vec3;
  selected: boolean;
  scale: number;
  palette: ScenePalette;
  onSelect: (id: string, additive: boolean) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <mesh
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      <sphereGeometry args={[scale * (selected ? 1.5 : 1), 16, 16]} />
      <meshStandardMaterial
        color={selected || hover ? palette.accent : palette.line}
      />
    </mesh>
  );
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
      onSelectNodes([id]);
    }
  };

  const handleSelectElement = (id: string) => {
    onSelectNodes([]);
    onSelectElements([id]);
  };

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
        >
          <planeGeometry args={[Math.max(radius * 6, 20), Math.max(radius * 6, 20)]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
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
    </div>
  );
}

/** Стрелка узловой силы (направленный конус + древко). */
function ForceArrow({
  dir,
  origin,
  length,
  headScale,
  color,
}: {
  dir: THREE.Vector3;
  origin: THREE.Vector3;
  length: number;
  headScale: number;
  color: string;
}) {
  // Стрелка направлена ОТ узла навстречу силе (тянет/толкает узел).
  const end = origin.clone().add(dir.clone().multiplyScalar(length));
  const points: Vec3[] = [
    [origin.x, origin.y, origin.z],
    [end.x, end.y, end.z],
  ];
  // Ориентация конуса: по умолчанию конус смотрит вдоль +Y.
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir,
  );
  return (
    <group>
      <Line points={points} color={color} lineWidth={2} />
      <mesh position={[end.x, end.y, end.z]} quaternion={quat}>
        <coneGeometry args={[headScale, headScale * 2.2, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}