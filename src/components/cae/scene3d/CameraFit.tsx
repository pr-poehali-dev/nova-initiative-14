/**
 * Камера 3D-сцены: автоподгонка под габариты и установка именованных ракурсов.
 *
 * Вынесено из FrameScene3D.tsx без изменения логики. Реагирует на fitRequestId
 * (изометрия + фит) и на viewRequest (конкретный вид). Возвращает OrbitControls
 * как default-камеру управления.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { type Vec3, type ViewName, VIEW_DIRS } from "./palette";

export default function CameraFit({
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
