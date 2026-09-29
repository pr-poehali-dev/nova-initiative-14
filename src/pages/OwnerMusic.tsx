/**
 * Сервис «Живой звук устройства» владельца (/owner/music).
 *
 * Генеративный синтезатор реального времени: музыка рождается из показаний
 * устройства — времени на часах, окружающего звука с микрофона, освещённости,
 * нажатий клавиш, кликов и движения мыши, прокрутки, заряда батареи, наклона
 * устройства и параметров сети. Каждый источник включается отдельно, у каждого
 * своя интенсивность влияния.
 *
 * Синтез идёт в браузере на Web Audio API, аудиофайлы не загружаются, показания
 * сенсоров никуда не отправляются, микрофонный поток только анализируется.
 * Доступ только владельцу (is_owner), страница закрыта от индексации.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import OwnerGuard from "@/components/owner/OwnerGuard";
import Seo from "@/components/Seo";
import MusicVisualizer from "@/components/owner/music/MusicVisualizer";
import SourceCard from "@/components/owner/music/SourceCard";
import {
  DEFAULT_SETTINGS,
  PRESETS,
  SCALES,
  SOURCES,
  TIMBRES,
  loadSettings,
  midiToName,
  saveSettings,
  type MusicSettings,
  type SourceId,
} from "@/lib/ambient-music/config";
import { MusicEngine, type EngineTelemetry } from "@/lib/ambient-music/engine";
import type { SensorState, SourceStatus } from "@/lib/ambient-music/sensors";

const SOURCE_TITLES: Record<SourceId, string> = SOURCES.reduce(
  (acc, s) => ({ ...acc, [s.id]: s.title }),
  {} as Record<SourceId, string>,
);

/** Живое показание сенсора для полосы в карточке источника. */
function readingFor(id: SourceId, s: SensorState): { label: string; value: number } {
  switch (id) {
    case "clock": {
      const h = Math.floor(s.hourFloat);
      const m = String(s.minute).padStart(2, "0");
      return { label: `${String(h).padStart(2, "0")}:${m}`, value: s.hourFloat / 24 };
    }
    case "mic":
      return { label: `${Math.round(s.micSmooth * 100)}% громк.`, value: s.micSmooth };
    case "light":
      return {
        label: s.lux !== null ? `${Math.round(s.lux)} лк` : `${Math.round(s.lightNorm * 100)}% (оценка)`,
        value: s.lightNorm,
      };
    case "keyboard":
      return { label: `${(s.typingRate * 5).toFixed(1)} нажат./с`, value: s.typingRate };
    case "mouseClick":
      return { label: "по событию", value: s.idleSeconds < 0.4 ? 1 : 0 };
    case "mouseMove":
      return {
        label: `X ${Math.round(s.mouseX * 100)} · Y ${Math.round(s.mouseY * 100)}`,
        value: s.mouseSpeed,
      };
    case "scroll":
      return { label: `${Math.round(s.scrollEnergy * 100)}%`, value: s.scrollEnergy };
    case "battery":
      return {
        label: s.battery !== null ? `${Math.round(s.battery * 100)}%${s.charging ? " ⚡" : ""}` : "недоступно",
        value: s.battery ?? 0,
      };
    case "motion":
      return { label: `накл. ${s.tiltX.toFixed(2)}`, value: Math.abs(s.tiltX) };
    case "network":
      return {
        label: s.downlink !== null ? `${s.downlink} Мбит · ${s.rtt ?? "?"} мс` : "недоступно",
        value: s.downlink !== null ? Math.min(1, s.downlink / 20) : 0,
      };
    default:
      return { label: "—", value: 0 };
  }
}

function MusicInner() {
  const [settings, setSettings] = useState<MusicSettings>(() => loadSettings());
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [statuses, setStatuses] = useState<Record<SourceId, SourceStatus>>(() =>
    SOURCES.reduce((acc, s) => ({ ...acc, [s.id]: "off" }), {} as Record<SourceId, SourceStatus>),
  );
  /** Числовая сводка — обновляется 4 раза в секунду, чтобы не мешать анимации. */
  const [summary, setSummary] = useState<{
    root: string;
    bpm: number;
    voices: number;
    notes: number;
    level: number;
    lastNotes: EngineTelemetry["lastNotes"];
  } | null>(null);

  const engineRef = useRef<MusicEngine | null>(null);
  const telemetryRef = useRef<EngineTelemetry | null>(null);
  const sensorRef = useRef<SensorState | null>(null);
  const [sensorTick, setSensorTick] = useState(0);

  const onStatus = useCallback((id: SourceId, st: SourceStatus) => {
    setStatuses((prev) => (prev[id] === st ? prev : { ...prev, [id]: st }));
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Опрос сенсоров и сводки для интерфейса: 4 кадра в секунду достаточно.
  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      sensorRef.current = { ...e.sensorState };
      const t = telemetryRef.current;
      if (t) {
        setSummary({
          root: midiToName(t.rootMidi),
          bpm: Math.round(t.bpm),
          voices: t.voices,
          notes: t.notesPlayed,
          level: t.outLevel,
          lastNotes: t.lastNotes,
        });
      }
      setSensorTick((v) => v + 1);
    }, 250);
    return () => window.clearInterval(iv);
  }, [running]);

  // Остановка звука при уходе со страницы — иначе синтез продолжится в фоне.
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  const start = async () => {
    if (engineRef.current || starting) return;
    setStarting(true);
    const engine = new MusicEngine(settings, onStatus);
    engine.setTelemetryListener((t) => {
      telemetryRef.current = t;
    });
    engineRef.current = engine;
    try {
      await engine.start();
      setRunning(true);
    } catch {
      engineRef.current = null;
    }
    setStarting(false);
  };

  const stop = async () => {
    const e = engineRef.current;
    engineRef.current = null;
    setRunning(false);
    telemetryRef.current = null;
    setSummary(null);
    await e?.stop();
    setStatuses(SOURCES.reduce((acc, s) => ({ ...acc, [s.id]: "off" }), {} as Record<SourceId, SourceStatus>));
  };

  const patch = useCallback((next: Partial<MusicSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      engineRef.current?.updateSettings(merged);
      return merged;
    });
  }, []);

  const patchSource = useCallback((id: SourceId, next: Partial<{ enabled: boolean; intensity: number }>) => {
    setSettings((prev) => {
      const merged: MusicSettings = {
        ...prev,
        sources: { ...prev.sources, [id]: { ...prev.sources[id], ...next } },
      };
      engineRef.current?.updateSettings(merged);
      return merged;
    });
  }, []);

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setSettings((prev) => {
      const merged: MusicSettings = {
        ...prev,
        ...p.patch,
        sources: { ...prev.sources, ...(p.patch.sources || {}) } as MusicSettings["sources"],
      };
      engineRef.current?.updateSettings(merged);
      return merged;
    });
  };

  const sensors = sensorRef.current;
  const activeCount = useMemo(
    () => SOURCES.filter((s) => settings.sources[s.id].enabled).length,
    [settings.sources],
  );

  const idleSensor: SensorState | null = sensors;
  // sensorTick заставляет пересчитать показания без хранения объекта в состоянии.
  void sensorTick;

  return (
    <div className="max-w-[1000px] mx-auto px-4 pt-20 md:pt-24 pb-16">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="font-gost text-[11px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)]">
          Владелец · Генеративный звук
        </p>
        <Link
          to="/account"
          className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
        >
          <Icon name="ArrowLeft" size={12} />В кабинет
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <Icon name="AudioWaveform" size={28} fallback="Music" className="text-[var(--drawing-accent)]" />
        <h1 className="font-gost-upright text-2xl md:text-3xl font-black uppercase tracking-wide">
          Живой звук устройства
        </h1>
        <span className="inline-flex items-center gap-1 bg-[var(--drawing-line)] text-[var(--drawing-bg)] px-1.5 py-0.5 font-gost text-[9px] uppercase tracking-wider">
          <Icon name="Crown" size={9} /> Только владелец
        </span>
      </div>

      <p className="text-sm text-[var(--drawing-line-thin)] leading-relaxed mb-5 max-w-[760px]">
        Синтезатор строит музыку из того, что происходит с устройством прямо сейчас: часы задают
        тональность и темп, микрофон и датчик освещённости — плотность и яркость тембра, нажатия
        клавиш и клики мыши превращаются в ноты выбранного лада. Звук считается в браузере на
        Web&nbsp;Audio&nbsp;API: аудиофайлы не загружаются, показания сенсоров остаются на устройстве
        и никуда не отправляются, микрофонный поток анализируется без записи.
      </p>

      {/* Транспорт и сводка */}
      <div className="drawing-frame p-4 bg-[var(--drawing-bg)] mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            onClick={running ? stop : start}
            disabled={starting}
            className={`btn-drawing ${running ? "" : "btn-drawing-accent"} text-sm inline-flex items-center gap-2 ${
              starting ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Icon name={running ? "Square" : "Play"} size={16} />
            {starting ? "Запускаем звук…" : running ? "Остановить" : "Запустить синтез"}
          </button>

          <label className="flex items-center gap-2 min-w-[190px] flex-1 max-w-[280px]">
            <Icon name="Volume2" size={16} className="text-[var(--drawing-line-thin)] shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={settings.volume}
              onChange={(e) => patch({ volume: Number(e.target.value) })}
              className="w-full accent-[var(--drawing-accent)]"
              aria-label="Громкость"
            />
            <span className="font-mono text-[11px] w-9 text-right shrink-0">
              {Math.round(settings.volume * 100)}
            </span>
          </label>

          <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] ml-auto">
            Источников включено: <span className="font-mono text-[var(--drawing-line)]">{activeCount}</span> из{" "}
            {SOURCES.length}
          </span>
        </div>

        <MusicVisualizer telemetryRef={telemetryRef} running={running} />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
          {[
            { label: "Тоника", value: summary ? summary.root : "—", icon: "Music2" },
            { label: "Темп, BPM", value: summary ? summary.bpm : "—", icon: "Activity" },
            { label: "Голосов", value: summary ? summary.voices : "—", icon: "Layers" },
            { label: "Нот сыграно", value: summary ? summary.notes : "—", icon: "ListMusic" },
            {
              label: "Пик выхода",
              value: summary ? `${Math.round(summary.level * 100)}%` : "—",
              icon: "Gauge",
            },
          ].map((m) => (
            <div key={m.label} className="border border-[var(--drawing-line)]/40 bg-[var(--drawing-paper)] p-2">
              <Icon name={m.icon} size={13} fallback="Activity" className="text-[var(--drawing-accent)] mb-0.5" />
              <p className="font-gost-upright text-base font-black leading-tight">{m.value}</p>
              <p className="font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)]">
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* Лента последних нот: видно, какой источник что сыграл */}
        <div className="mt-3">
          <p className="font-gost text-[10px] uppercase tracking-[0.2em] text-[var(--drawing-line-thin)] mb-1.5">
            Последние ноты
          </p>
          <div className="flex flex-wrap gap-1 min-h-[24px]">
            {summary && summary.lastNotes.length > 0 ? (
              summary.lastNotes
                .slice()
                .reverse()
                .map((n, i) => (
                  <span
                    key={`${n.at}-${i}`}
                    className="font-mono text-[10px] border border-[var(--drawing-line)]/40 px-1.5 py-0.5 text-[var(--drawing-line)]"
                    title={n.source === "auto" ? "Автоматический слой" : SOURCE_TITLES[n.source]}
                  >
                    {n.name}
                    <span className="text-[var(--drawing-line-thin)]">
                      {" · "}
                      {n.source === "auto" ? "фон" : SOURCE_TITLES[n.source]}
                    </span>
                  </span>
                ))
            ) : (
              <span className="font-gost text-[11px] text-[var(--drawing-line-thin)]">
                {running ? "Нажмите клавишу или подвигайте мышью — нота появится здесь." : "Синтез остановлен."}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Пресеты */}
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1 mb-2">
        Сценарии
      </p>
      <div className="grid sm:grid-cols-2 gap-2 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className="text-left border-[1.5px] border-[var(--drawing-line)]/50 hover:border-[var(--drawing-accent)] p-3 transition-colors group"
          >
            <p className="font-gost-upright font-bold text-sm group-hover:text-[var(--drawing-accent)] transition-colors">
              {p.title}
            </p>
            <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-0.5">
              {p.description}
            </p>
          </button>
        ))}
      </div>

      {/* Музыкальные параметры */}
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1 mb-2">
        Музыкальная основа
      </p>
      <div className="border-2 border-[var(--drawing-line)] bg-[var(--drawing-bg)] p-4 mb-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
              Лад
            </span>
            <select
              value={settings.scaleId}
              onChange={(e) => patch({ scaleId: e.target.value })}
              className="drawing-input w-full"
            >
              {SCALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.mood}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] block mb-1">
              Тембр
            </span>
            <select
              value={settings.timbreId}
              onChange={(e) => patch({ timbreId: e.target.value })}
              className="drawing-input w-full"
            >
              {TIMBRES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-2 mb-3">
          {TIMBRES.find((t) => t.id === settings.timbreId)?.description}
        </p>

        <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3">
          <label className="block">
            <span className="flex items-center justify-between font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Тоника
              <span className="font-mono text-[10px] text-[var(--drawing-line)]">
                {midiToName(settings.rootMidi)}
              </span>
            </span>
            <input
              type="range"
              min={28}
              max={64}
              step={1}
              value={settings.rootMidi}
              onChange={(e) => patch({ rootMidi: Number(e.target.value) })}
              className="w-full accent-[var(--drawing-accent)]"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Базовый темп
              <span className="font-mono text-[10px] text-[var(--drawing-line)]">{settings.bpm} BPM</span>
            </span>
            <input
              type="range"
              min={30}
              max={140}
              step={1}
              value={settings.bpm}
              onChange={(e) => patch({ bpm: Number(e.target.value) })}
              className="w-full accent-[var(--drawing-accent)]"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Власть часов над строем
              <span className="font-mono text-[10px] text-[var(--drawing-line)]">
                {Math.round(settings.clockAuthority * 100)}%
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.clockAuthority}
              onChange={(e) => patch({ clockAuthority: Number(e.target.value) })}
              className="w-full accent-[var(--drawing-accent)]"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Плотность нот
              <span className="font-mono text-[10px] text-[var(--drawing-line)]">
                {Math.round(settings.density * 100)}%
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.density}
              onChange={(e) => patch({ density: Number(e.target.value) })}
              className="w-full accent-[var(--drawing-accent)]"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] mb-1">
              Простор (эхо)
              <span className="font-mono text-[10px] text-[var(--drawing-line)]">
                {Math.round(settings.space * 100)}%
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.space}
              onChange={(e) => patch({ space: Number(e.target.value) })}
              className="w-full accent-[var(--drawing-accent)]"
            />
          </label>

          <div className="flex flex-col gap-2 justify-center">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.droneEnabled}
                onChange={(e) => patch({ droneEnabled: e.target.checked })}
              />
              <span className="font-gost text-[11px] text-[var(--drawing-line)]">
                Непрерывный дрон (звучит и без взаимодействия)
              </span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.limiter}
                onChange={(e) => patch({ limiter: e.target.checked })}
              />
              <span className="font-gost text-[11px] text-[var(--drawing-line)]">
                Лимитер: держит пик и не даёт всплескам оглушить
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={() => {
              setSettings({ ...DEFAULT_SETTINGS });
              engineRef.current?.updateSettings({ ...DEFAULT_SETTINGS });
            }}
            className="font-gost text-[10px] uppercase tracking-wider text-[var(--drawing-line-thin)] hover:text-[var(--drawing-accent)] inline-flex items-center gap-1"
          >
            <Icon name="RotateCcw" size={12} />Сбросить настройки
          </button>
        </div>
      </div>

      {/* Источники сигнала */}
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1 mb-2">
        Источники сигнала
      </p>
      <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug mb-3">
        Микрофон, освещённость и движение устройства требуют разрешения браузера — оно запрашивается
        при включении источника. Освещённость читается через AmbientLightSensor: он есть в Chrome на
        Android и в Chrome на десктопе с включённым флагом; если датчика нет, сервис берёт грубую
        оценку по системной теме и честно помечает это.
      </p>
      <div className="grid gap-2 lg:grid-cols-2 mb-6">
        {SOURCES.map((meta) => (
          <SourceCard
            key={meta.id}
            meta={meta}
            setting={settings.sources[meta.id]}
            status={statuses[meta.id]}
            reading={idleSensor ? readingFor(meta.id, idleSensor) : { label: running ? "…" : "—", value: 0 }}
            onToggle={(enabled) => patchSource(meta.id, { enabled })}
            onIntensity={(intensity) => patchSource(meta.id, { intensity })}
          />
        ))}
      </div>

      {/* Как это работает */}
      <p className="font-gost text-[11px] uppercase tracking-[0.2em] text-[var(--drawing-accent)] border-b border-[var(--drawing-line)]/30 pb-1 mb-2">
        Как устроен синтез
      </p>
      <div className="border border-[var(--drawing-line)]/40 p-4 space-y-2">
        {[
          "Дрон: три расстроенных осциллятора на тонике — основа, которая держит тональность. Тоника считается из часа и минуты, если включён источник «Время устройства».",
          "Ноты: каждое событие (клавиша, клик, всплеск звука, импульс сети) берёт ступень выбранного лада, поэтому фальшивых нот не появляется независимо от того, что вы нажимаете.",
          "Фильтр: один низкочастотный фильтр на всю сумму голосов. Его срез ведут освещённость, громкость комнаты и координата X курсора — это главный источник «движения» в звуке.",
          "Эхо: линия задержки с обратной связью, время привязано к темпу, глубина — к ползунку «Простор». Тембр задаёт свою базовую обратную связь.",
          "Лимитер: компрессор на выходе с порогом −12 дБ. Гарантирует, что резкий хлопок в микрофон не даст скачка громкости в наушниках.",
        ].map((text, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="font-mono text-[10px] text-[var(--drawing-accent)] shrink-0 mt-[3px]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="font-gost text-[12px] text-[var(--drawing-line-thin)] leading-snug">{text}</p>
          </div>
        ))}
      </div>

      <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] leading-snug mt-4">
        Настройки хранятся в браузере этого устройства (localStorage) и не покидают его. При уходе со
        страницы синтез останавливается, микрофон освобождается.
      </p>
    </div>
  );
}

const OwnerMusic = () => (
  <OwnerGuard from="/owner/music">
    <Seo
      noIndex
      title="Живой звук устройства · панель владельца · Диплом-Инж.рф"
      description="Генеративный синтезатор реального времени: музыка из времени на часах, окружающего звука, освещённости и действий на устройстве. Доступ только владельцу."
    />
    <MusicInner />
  </OwnerGuard>
);

export default OwnerMusic;
