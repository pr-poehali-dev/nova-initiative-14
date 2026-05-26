/**
 * Единое форматирование физических величин для всего CAE-редактора.
 *
 * Правило по силе:
 *  - |F| < 1000 Н → выводим в Ньютонах с округлением до целого ("450 Н")
 *  - |F| ≥ 1000 Н → выводим в килоньютонах с одним знаком после запятой ("12.5 кН")
 *  - |F| ≥ 1 000 000 Н → выводим в меганьютонах ("3.20 МН")
 *
 * Аналогично — для момента (Н·м / кН·м) и распределённой нагрузки (Н/м / кН/м).
 *
 * ВАЖНО: эти хелперы должны использоваться ВЕЗДЕ, где сила/момент показывается
 * пользователю — и на канве, и в инспекторе, и в PDF-отчёте. Это нужно, чтобы
 * масштаб единиц не "прыгал" между разными местами одной задачи.
 */

export function formatForce(N: number): string {
  if (!Number.isFinite(N)) return "—";
  const a = Math.abs(N);
  if (a >= 1e6) return `${(N / 1e6).toFixed(2)} МН`;
  if (a >= 1e3) return `${(N / 1e3).toFixed(1)} кН`;
  return `${Math.round(N)} Н`;
}

export function formatMoment(Nm: number): string {
  if (!Number.isFinite(Nm)) return "—";
  const a = Math.abs(Nm);
  if (a >= 1e6) return `${(Nm / 1e6).toFixed(2)} МН·м`;
  if (a >= 1e3) return `${(Nm / 1e3).toFixed(1)} кН·м`;
  return `${Math.round(Nm)} Н·м`;
}

export function formatDistLoad(qNperM: number): string {
  if (!Number.isFinite(qNperM)) return "—";
  const a = Math.abs(qNperM);
  if (a >= 1e6) return `${(qNperM / 1e6).toFixed(2)} МН/м`;
  if (a >= 1e3) return `${(qNperM / 1e3).toFixed(1)} кН/м`;
  return `${Math.round(qNperM)} Н/м`;
}
