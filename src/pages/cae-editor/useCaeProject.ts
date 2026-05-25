import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  emptyModel,
  getProjectModel,
  saveProjectModel,
  type FrameModel,
} from "@/lib/cae-model";

export function useCaeProject(projectId: number) {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [model, setModel] = useState<FrameModel>(emptyModel("2d"));
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
          setModel(m as FrameModel);
        } else {
          const dim = r.data.project.project_type === "frame_3d" ? "3d" : "2d";
          setModel(emptyModel(dim as "2d" | "3d"));
        }
      })
      .finally(() => setLoadingModel(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user, authLoading]);

  const updateModel = (next: FrameModel) => {
    setModel(next);
    setDirty(true);
  };

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
  };
}
