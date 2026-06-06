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
import type { FrameModel, SolverResponse } from "@/lib/cae-model";

const ACCENT = "#c0392b";
const LINE = "#1a1a2e";
const THIN = "#6a6a8e";
const NODE = "#1a1a2e";
const SUPPORT = "#2563eb";
const DEFORMED = "#16a34a";

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
}

type Vec3 = [number, number, number];

const vec = (c: [number, number, number]): Vec3 => [c[0], c[1], c[2]];

/** Камера: подгонка под габариты модели по запросу. */
function CameraFit({
  center,
  radius,
  fitRequestId,
}: {
  center: Vec3;
  radius: number;
  fitRequestId?: number;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const d = Math.max(radius * 2.2, 2);
    camera.position.set(center[0] + d, center[1] + d * 0.8, center[2] + d);
    camera.near = d / 100;
    camera.far = d * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center[0], center[1], center[2]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequestId]);
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
  onSelect,
}: {
  id: string;
  pos: Vec3;
  selected: boolean;
  scale: number;
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
      <meshStandardMaterial color={selected ? ACCENT : hover ? ACCENT : NODE} />
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
}: Props) {
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

  return (
    <Canvas
      camera={{ fov: 45, position: [5, 4, 5] }}
      onPointerMissed={() => {
        onSelectNodes([]);
        onSelectElements([]);
      }}
      style={{ background: "#faf8f0" }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={0.6} />
      <directionalLight position={[-10, 5, -10]} intensity={0.3} />

      {/* Сетка в горизонтальной плоскости XZ (пол) на уровне минимума по Y. */}
      <gridHelper
        args={[Math.max(radius * 3, 6), Math.max(Math.round(radius * 3), 6), THIN, "#d8d4c4"]}
        position={[center[0], 0, center[2]]}
      />

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
              color={selected ? ACCENT : LINE}
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
              color={DEFORMED}
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
          onSelect={handleSelectNode}
        />
      ))}

      {/* Опоры — синие кубики на закреплённых узлах. */}
      {model.boundary_conditions.map((bc) => {
        const n = nodeById.get(bc.node_id);
        if (!n) return null;
        return (
          <mesh key={bc.id} position={vec(n.coords)}>
            <boxGeometry
              args={[markerScale * 3, markerScale * 3, markerScale * 3]}
            />
            <meshStandardMaterial color={SUPPORT} transparent opacity={0.5} />
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

      <CameraFit center={center} radius={radius} fitRequestId={fitRequestId} />

      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewcube
          color="#e8e4d4"
          textColor="#1a1a2e"
          strokeColor="#1a1a2e"
          hoverColor={ACCENT}
        />
      </GizmoHelper>
    </Canvas>
  );
}

/** Стрелка узловой силы (направленный конус + древко). */
function ForceArrow({
  dir,
  origin,
  length,
  headScale,
}: {
  dir: THREE.Vector3;
  origin: THREE.Vector3;
  length: number;
  headScale: number;
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
      <Line points={points} color={ACCENT} lineWidth={2} />
      <mesh position={[end.x, end.y, end.z]} quaternion={quat}>
        <coneGeometry args={[headScale, headScale * 2.2, 12]} />
        <meshStandardMaterial color={ACCENT} />
      </mesh>
    </group>
  );
}