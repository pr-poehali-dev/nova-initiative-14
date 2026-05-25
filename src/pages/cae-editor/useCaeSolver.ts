import { useState } from "react";
import { runSolver, type FrameModel, type SolverResponse } from "@/lib/cae-model";
import type { DiagramKind } from "@/components/cae/FrameCanvas";

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

  const onSolve = async () => {
    setSolverError(null);
    setSolving(true);
    setResult(null);

    if (model.nodes.length < 2) {
      setSolverError("Минимум 2 узла для расчёта");
      setSolving(false);
      return;
    }
    if (model.elements.length === 0) {
      setSolverError("Нет ни одного элемента");
      setSolving(false);
      return;
    }
    if (model.boundary_conditions.length === 0) {
      setSolverError("Не заданы граничные условия (опоры)");
      setSolving(false);
      return;
    }

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
  };
}
