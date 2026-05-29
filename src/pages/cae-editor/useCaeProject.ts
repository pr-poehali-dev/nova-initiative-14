import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  emptyModel,
  getProjectModel,
  saveProjectModel,
  type FrameModel,
} from "@/lib/cae-model";
import { setUnsavedChanges } from "@/lib/reloadGuard";
import { useCaeHistory } from "./useCaeHistory";

export function useCaeProject(projectId: number) {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const history = useCaeHistory(emptyModel("2d"));
  const { model, pushModel, setModelDirect, resetHistory, undo, redo, canUndo, canRedo } = history;

  const [projectName, setProjectName] = useState("");
  const [versionId, setVersionId] = useState<number | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav("/login", { replace: true, state: { from: `/cae/projects/${projectId}` } });
      return;
    }
    if (!projectId) return;
    setLoadingModel(true);
    getProjectModel(projectId)
      .then((r) => {
        if (!r.ok || !r.data) {
          setLoadError(r.message || "Не удалось загрузить проект");
          return;
        }
        setProjectName(r.data.project.name);
        setVersionId(r.data.version_id);
        const m = r.data.model as FrameModel | Record<string, never>;
        if (m && (m as FrameModel).meta) {
          resetHistory(m as FrameModel);
        } else {
          const dim = r.data.project.project_type === "frame_3d" ? "3d" : "2d";
          resetHistory(emptyModel(dim as "2d" | "3d"));
        }
      })
      .finally(() => setLoadingModel(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user, authLoading]);

  // Синхронизируем флаг несохранённых изменений с глобальным сторожем и
  // предупреждаем при попытке закрыть/обновить вкладку с правками.
  useEffect(() => {
    setUnsavedChanges(dirty);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      setUnsavedChanges(false);
    };
  }, [dirty]);

  /** Главная точка мутации модели — пишется в историю */
  const updateModel = useCallback((next: FrameModel) => {
    pushModel(next);
    setDirty(true);
  }, [pushModel]);

  /** Изменить модель без записи в историю (для технических операций) */
  const setModel = useCallback((next: FrameModel) => {
    setModelDirect(next);
  }, [setModelDirect]);

  const onSave = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    const r = await saveProjectModel(projectId, model, "Manual save");
    setSaving(false);
    if (r.ok && r.data) {
      setVersionId(r.data.version_id);
      setLastSaved(new Date().toLocaleTimeString("ru-RU"));
      setDirty(false);
    } else {
      setLoadError(r.message || "Ошибка сохранения");
    }
  }, [projectId, model]);

  return {
    model,
    setModel,
    updateModel,
    projectName,
    versionId,
    loadingModel,
    saving,
    lastSaved,
    dirty,
    loadError,
    setLoadError,
    authLoading,
    user,
    onSave,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}