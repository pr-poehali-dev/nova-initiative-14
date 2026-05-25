import { useMemo, useState } from "react";
import { runSolver, type FrameModel, type SolverResponse } from "@/lib/cae-model";
import type { DiagramKind } from "@/components/cae/FrameCanvas";
import { validateModel, hasBlockingErrors } from "@/lib/cae-validate";

export function useCaeSolver(
  model: FrameModel,
  projectId: number,
  versionId: number | null,
) {
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
    const r = await runSolver(model, projectId, versionId ?? undefined);
    setSolving(false);
    if (r.ok && r.data && r.data.status === "ok") {
      setResult(r.data);
      setShowDiagram("Mz");
    } else {
      setSolverError(r.message || r.error || "Ошибка решателя");
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