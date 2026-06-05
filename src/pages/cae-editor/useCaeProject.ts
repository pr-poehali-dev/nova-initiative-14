import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  emptyModel,
  getProjectModel,
  saveProjectModel,
  normalizeModel,
  type FrameModel,
} from "@/lib/cae-model";
import { setUnsavedChanges } from "@/lib/reloadGuard";
import { getDisciplinePreference } from "@/lib/cae/discipline-preference";
import { saveDraft, loadDraft, clearDraft, type CaeDraft } from "@/lib/cae/draft";
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
  // Черновик из localStorage, найденный при загрузке проекта (тикет №49).
  const [draftFound, setDraftFound] = useState<CaeDraft | null>(null);

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
        // Проверяем локальный черновик: если он есть, покажем баннер с
        // предложением восстановить несохранённые изменения (тикет №49).
        const draft = loadDraft(projectId);
        if (draft) setDraftFound(draft);
        const m = r.data.model as FrameModel | Record<string, never>;
        if (m && (m as FrameModel).meta) {
          // Чиним возможные дефекты старых сохранённых моделей (дубли id
          // элементов, «висящие» стержни на удалённых узлах) до показа.
          resetHistory(normalizeModel(m as FrameModel));
        } else {
          const dim = r.data.project.project_type === "frame_3d" ? "3d" : "2d";
          // Новый проект наследует инженерную школу из настройки ЛК (тикет №37).
          const fresh = emptyModel(dim as "2d" | "3d");
          if (fresh.analysis_settings) {
            fresh.analysis_settings.discipline = getDisciplinePreference();
          }
          resetHistory(fresh);
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

  // Автосохранение черновика в localStorage при изменениях (тикет №49).
  // Дебаунс 800 мс, чтобы не писать на каждое микро-движение. Пишем только
  // когда есть несохранённые правки и проект уже загружен.
  useEffect(() => {
    if (!projectId || !dirty || loadingModel) return;
    const t = setTimeout(() => saveDraft(projectId, model), 800);
    return () => clearTimeout(t);
  }, [model, dirty, projectId, loadingModel]);

  /** Восстановить модель из найденного черновика. */
  const restoreDraft = useCallback(() => {
    if (!draftFound) return;
    resetHistory(normalizeModel(draftFound.model));
    setDirty(true);
    setDraftFound(null);
  }, [draftFound, resetHistory]);

  /** Отказаться от черновика и удалить его. */
  const discardDraft = useCallback(() => {
    if (projectId) clearDraft(projectId);
    setDraftFound(null);
  }, [projectId]);

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
      // Успешно сохранили на сервер — локальный черновик больше не нужен.
      clearDraft(projectId);
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
    draftFound,
    restoreDraft,
    discardDraft,
  };
}