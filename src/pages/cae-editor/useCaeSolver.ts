import { useMemo, useState } from "react";
import { runSolver, type FrameModel, type SolverResponse } from "@/lib/cae-model";
import { runDemoSolver } from "@/lib/cae/api";
import type { DiagramKind } from "@/components/cae/FrameCanvas";
import { validateModel, hasBlockingErrors } from "@/lib/cae-validate";

export function useCaeSolver(
  model: FrameModel,
  projectId: number,
  versionId: number | null,
  options?: { demo?: boolean },
) {
  const isDemo = options?.demo === true;
  const [result, setResult] = useState<SolverResponse | null>(null);
  const [solverError, setSolverError] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);
  const [showDiagram, setShowDiagram] = useState<DiagramKind>("none");
  const [diagramScale, setDiagramScale] = useState(1);

  // Реактивный список проблем — пересчитывается при изменении модели
  const issues = useMemo(() => validateModel(model), [model]);
  const blocked = useMemo(() => hasBlockingErrors(issues), [issues]);

  const onSolve = async () => {
    setSolverError(null);
    setResult(null);

    if (blocked) {
      const firstError = issues.find((i) => i.level === "error");
      setSolverError(
        firstError
          ? `Нельзя запустить расчёт: ${firstError.message}. Проверьте список проблем.`
          : "Нельзя запустить расчёт — модель содержит ошибки",
      );
      return;
    }

    setSolving(true);
    const r = isDemo
      ? await runDemoSolver(model)
      : await runSolver(model, projectId, versionId ?? undefined);
    setSolving(false);
    if (r.ok && r.data && r.data.status === "ok") {
      setResult(r.data);
      setShowDiagram("Mz");
    } else {
      // Собираем максимально информативное сообщение из всех доступных полей.
      // Если backend вернул только status='error' без message — даём подсказку
      // о вероятных причинах (особенно частая — ферма с шарнирными стержнями).
      const detail =
        r.message ||
        r.error ||
        (r.data as { message?: string; error?: string } | null)?.message ||
        (r.data as { message?: string; error?: string } | null)?.error;
      if (detail) {
        setSolverError(`Ошибка решателя: ${detail}`);
      } else {
        setSolverError(
          "Ошибка решателя. Частые причины: " +
          "1) ферма с шарнирами на обоих концах всех стержней без жёсткого узла; " +
          "2) конструкция геометрически изменяема (не хватает связей); " +
          "3) нагрузка действует на свободный стержень. " +
          "Проверьте опоры и шарниры.",
        );
      }
    }
  };

  return {
    result,
    solverError,
    setSolverError,
    solving,
    showDiagram,
    setShowDiagram,
    diagramScale,
    setDiagramScale,
    onSolve,
    issues,
    blocked,
  };
}