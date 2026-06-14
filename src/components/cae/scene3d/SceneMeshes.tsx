/**
 * Мелкие переиспользуемые меши 3D-сцены.
 *
 * Вынесено из FrameScene3D.tsx без изменения логики:
 *  - NodeMesh   — узел-сфера с обработкой клика и подсветкой выбора/ховера;
 *  - ForceArrow — стрелка узловой силы (древко + направленный конус).
 */
import { useState } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { type Vec3, type ScenePalette } from "./palette";

/** Узел-сфера с обработкой клика. */
export function NodeMesh({
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

/** Стрелка узловой силы (направленный конус + древко). */
export function ForceArrow({
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
