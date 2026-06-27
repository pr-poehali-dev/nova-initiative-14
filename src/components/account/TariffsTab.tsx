import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  getTariffsOverview,
  saveSettings,
  saveWidgetTariff,
  saveCaeTariff,
  saveEduTariff,
  type TariffsOverview,
  type PricingSettings,
} from "@/lib/tariffs-admin";

const rub = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";

const rubSmall = (v: number) =>
  v < 0.01
    ? v.toLocaleString("ru-RU", { maximumSignificantDigits: 3 }) + " ₽"
    : v.toLocaleString("ru-RU", { maximumFractionDigits: 4 }) + " ₽";

/**
 * Вкладка «Тарифы» админ-панели.
 * Управляет тарифами CAE, обучения и виджета, показывает себестоимость
 * одной единицы расчёта (на основе compute-секунд и фикс. инфраструктуры)
 * и рекомендованную цену каждого тарифа.
 */
export default function TariffsTab() {
  const [data, setData] = useState<TariffsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getTariffsOverview()
      .then((res) => {
        if (res.ok && res.data) setData(res.data);
        else setErr(res.message || "Не удалось загрузить тарифы");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading)
    return <p className="font-gost text-[11px] text-[var(--drawing-line-thin)] py-6">Загружаем экономику…</p>;
  if (err || !data)
    return (
      <div className="py-6 text-center">
        <p className="font-gost text-[11px] text-[var(--drawing-accent)]">{err}</p>
        <button onClick={load} className="btn-drawing text-xs mt-2">
          Повторить
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      <EconomicsBlock data={data} onSaved={setData} />
      <CaePrime econ={data} />
      <WidgetTariffs data={data} reload={load} />
      <CaeTariffs data={data} reload={load} />
      <EduTariffs data={data} reload={load} />
    </div>
  );
}

/* ───────── Экономика и себестоимость единицы ───────── */

function EconomicsBlock({
  data,
  onSaved,
}: {
  data: TariffsOverview;
  onSaved: (d: TariffsOverview) => void;
}) {
  const [s, setS] = useState<PricingSettings>(data.settings);
  const [saving, setSaving] = useState(false);
  const e = data.economics;

  const num = (k: keyof PricingSettings) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: Number(ev.target.value) });

  const save = async () => {
    setSaving(true);
    const res = await saveSettings(s);
    setSaving(false);
    if (res.ok && res.data)
      onSaved({ ...data, settings: res.data.settings, economics: res.data.economics });
  };

  return (
    <section className="border-[1.5px] border-[var(--drawing-line)] p-4">
      <h3 className="font-gost-upright font-bold mb-3 flex items-center gap-2">
        <Icon name="Calculator" size={16} className="text-[var(--drawing-accent)]" />
        Экономика и себестоимость расчёта
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Field label="Инфраструктура, ₽/мес" value={s.monthly_infra_rub} onChange={num("monthly_infra_rub")} />
        <Field label="Расчётов в мес (объём)" value={s.monthly_calc_volume} onChange={num("monthly_calc_volume")} />
        <Field label="Ставка GB-сек, ₽" step="0.00000001" value={s.gb_second_rub} onChange={num("gb_second_rub")} />
        <Field label="Маржа (×)" step="0.5" value={s.margin_multiplier} onChange={num("margin_multiplier")} />
        <Field label="CAE таймаут, с" step="0.5" value={s.cae_timeout_sec} onChange={num("cae_timeout_sec")} />
        <Field label="CAE память, МБ" value={s.cae_memory_mb} onChange={num("cae_memory_mb")} />
        <Field label="Виджет таймаут, с" step="0.5" value={s.widget_timeout_sec} onChange={num("widget_timeout_sec")} />
        <Field label="Виджет память, МБ" value={s.widget_memory_mb} onChange={num("widget_memory_mb")} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <UnitCard title="Единица расчёта CAE" u={e.cae} />
        <UnitCard title="Единица расчёта виджета" u={e.widget} />
      </div>
      <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] mb-3 leading-snug">
        Себестоимость = compute (таймаут × память × ставка GB-сек) + доля фикс.
        инфраструктуры на 1 расчёт ({rubSmall(e.infra_per_calc_rub)}). Рекомендованная
        цена = себестоимость × маржа {e.margin_multiplier}.
      </p>

      <button onClick={save} disabled={saving} className="btn-drawing btn-drawing-accent text-xs">
        {saving ? "Сохраняем…" : "Сохранить параметры"}
      </button>
    </section>
  );
}

function UnitCard({ title, u }: { title: string; u: TariffsOverview["economics"]["cae"] }) {
  return (
    <div className="border-[1.5px] border-[var(--drawing-line)] bg-[var(--drawing-paper)] p-3">
      <p className="font-gost-upright font-bold text-xs mb-1.5">{title}</p>
      <Row k="compute / вызов" v={rubSmall(u.compute_rub)} />
      <Row k="инфра / расчёт" v={rubSmall(u.infra_per_calc_rub)} />
      <Row k="себестоимость" v={rubSmall(u.unit_cost_rub)} bold />
      <Row k="рекоменд. цена" v={rubSmall(u.recommended_unit_price_rub)} accent />
    </div>
  );
}

function Row({ k, v, bold, accent }: { k: string; v: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between font-gost text-[11px] leading-relaxed">
      <span className="text-[var(--drawing-line-thin)]">{k}</span>
      <span className={accent ? "text-[var(--drawing-accent)] font-bold" : bold ? "font-bold" : ""}>{v}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="font-gost text-[10px] text-[var(--drawing-line-thin)] uppercase tracking-wider">{label}</span>
      <input
        type="number"
        step={step || "1"}
        value={value}
        onChange={onChange}
        className="w-full mt-0.5 border-[1.5px] border-[var(--drawing-line)] bg-transparent px-2 py-1 font-gost text-xs"
      />
    </label>
  );
}

/* ───────── Подсказка по CAE ───────── */

function CaePrime({ econ }: { econ: TariffsOverview }) {
  return (
    <div className="border-l-[3px] border-[var(--drawing-accent)] bg-[var(--drawing-paper)] px-3 py-2 font-gost text-[11px] leading-snug">
      Расчёт у нас очень дешёвый: средняя длительность ~{econ.settings.cae_avg_duration_ms} мс,
      но облако тарифицирует по таймауту. Главный драйвер себестоимости — фикс. инфраструктура,
      разнесённая на объём расчётов. Увеличивайте «объём расчётов в мес» по мере роста — себестоимость единицы падает.
    </div>
  );
}

/* ───────── Тарифы виджета ───────── */

function WidgetTariffs({ data, reload }: { data: TariffsOverview; reload: () => void }) {
  return (
    <TariffGroup icon="Boxes" title="Тарифы виджета">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-gost text-[11px]">
          <thead>
            <Th cols={["Тариф", "Цена/мес", "Лимит расч.", "Сайтов", "Себест.", "Рекоменд.", ""]} />
          </thead>
          <tbody>
            {data.widget_tariffs.map((t) => (
              <WidgetRow key={t.id} t={t} reload={reload} />
            ))}
          </tbody>
        </table>
      </div>
    </TariffGroup>
  );
}

function WidgetRow({
  t,
  reload,
}: {
  t: TariffsOverview["widget_tariffs"][number];
  reload: () => void;
}) {
  const [price, setPrice] = useState(t.price_monthly);
  const [saving, setSaving] = useState(false);
  const dirty = price !== t.price_monthly;
  const save = async () => {
    setSaving(true);
    await saveWidgetTariff({
      id: t.id,
      name: t.name,
      price_monthly: price,
      calc_limit: t.calc_limit,
      max_sites: t.max_sites,
      is_popular: t.is_popular,
      is_active: t.is_active,
      sort_order: t.sort_order,
    });
    setSaving(false);
    reload();
  };
  return (
    <tr className="border-b border-[var(--drawing-line)]/15">
      <Td>
        {t.name}
        {t.is_popular && <span className="ml-1 text-[8px] text-[var(--drawing-accent)] uppercase">хит</span>}
      </Td>
      <Td>
        <PriceInput value={price} onChange={setPrice} />
      </Td>
      <Td>{t.calc_limit.toLocaleString("ru-RU")}</Td>
      <Td>{t.max_sites < 0 ? "∞" : t.max_sites}</Td>
      <Td>{rub(t.cost_rub)}</Td>
      <Td accent>{rub(t.recommended_price_rub)}</Td>
      <Td>
        <SaveBtn dirty={dirty} saving={saving} onClick={save} />
      </Td>
    </tr>
  );
}

/* ───────── Тарифы CAE ───────── */

function CaeTariffs({ data, reload }: { data: TariffsOverview; reload: () => void }) {
  return (
    <TariffGroup icon="Cpu" title="Тарифы CAE">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-gost text-[11px]">
          <thead>
            <Th cols={["Тариф", "Цена/мес", "Разово", "Расч./мес", "Себест.", "Рекоменд.", ""]} />
          </thead>
          <tbody>
            {data.cae_tariffs.map((t) => (
              <CaeRow key={t.id} t={t} reload={reload} />
            ))}
          </tbody>
        </table>
      </div>
    </TariffGroup>
  );
}

function CaeRow({ t, reload }: { t: TariffsOverview["cae_tariffs"][number]; reload: () => void }) {
  const [price, setPrice] = useState(t.price_monthly);
  const [oneOff, setOneOff] = useState(t.price_one_off);
  const [saving, setSaving] = useState(false);
  const dirty = price !== t.price_monthly || oneOff !== t.price_one_off;
  const save = async () => {
    setSaving(true);
    await saveCaeTariff({ id: t.id, price_monthly: price, price_one_off: oneOff });
    setSaving(false);
    reload();
  };
  return (
    <tr className="border-b border-[var(--drawing-line)]/15">
      <Td>{t.name}</Td>
      <Td>
        <PriceInput value={price} onChange={setPrice} />
      </Td>
      <Td>
        <PriceInput value={oneOff} onChange={setOneOff} />
      </Td>
      <Td>{t.is_unlimited ? "∞" : t.max_solves_per_month}</Td>
      <Td>{rub(t.cost_rub)}</Td>
      <Td accent>{t.is_unlimited ? "—" : rub(t.recommended_price_rub)}</Td>
      <Td>
        <SaveBtn dirty={dirty} saving={saving} onClick={save} />
      </Td>
    </tr>
  );
}

/* ───────── Тарифы обучения ───────── */

function EduTariffs({ data, reload }: { data: TariffsOverview; reload: () => void }) {
  return (
    <TariffGroup icon="GraduationCap" title="Тарифы обучения">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-gost text-[11px]">
          <thead>
            <Th cols={["Тариф", "Длительность", "Цена", "Подпись цены", ""]} />
          </thead>
          <tbody>
            {data.edu_tariffs.map((t) => (
              <EduRow key={t.id} t={t} reload={reload} />
            ))}
          </tbody>
        </table>
      </div>
    </TariffGroup>
  );
}

function EduRow({ t, reload }: { t: TariffsOverview["edu_tariffs"][number]; reload: () => void }) {
  const [price, setPrice] = useState(t.price);
  const [label, setLabel] = useState(t.price_label || "");
  const [saving, setSaving] = useState(false);
  const dirty = price !== t.price || label !== (t.price_label || "");
  const save = async () => {
    setSaving(true);
    await saveEduTariff({ id: t.id, price, price_label: label || null });
    setSaving(false);
    reload();
  };
  return (
    <tr className="border-b border-[var(--drawing-line)]/15">
      <Td>{t.title}</Td>
      <Td>{t.duration}</Td>
      <Td>
        <PriceInput value={price} onChange={setPrice} />
      </Td>
      <Td>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="—"
          className="w-28 border-[1.5px] border-[var(--drawing-line)] bg-transparent px-1.5 py-0.5 font-gost text-[11px]"
        />
      </Td>
      <Td>
        <SaveBtn dirty={dirty} saving={saving} onClick={save} />
      </Td>
    </tr>
  );
}

/* ───────── Общие UI-блоки ───────── */

function TariffGroup({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-[1.5px] border-[var(--drawing-line)]">
      <div className="px-3 py-2 border-b border-[var(--drawing-line)]/20 flex items-center gap-2">
        <Icon name={icon} size={15} className="text-[var(--drawing-accent)]" />
        <h3 className="font-gost-upright font-bold text-sm">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Th({ cols }: { cols: string[] }) {
  return (
    <tr>
      {cols.map((c, i) => (
        <th
          key={i}
          className="text-left font-gost text-[9px] uppercase tracking-wider text-[var(--drawing-line-thin)] pb-2 pr-2 whitespace-nowrap"
        >
          {c}
        </th>
      ))}
    </tr>
  );
}

function Td({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <td className={`py-2 pr-2 align-middle whitespace-nowrap ${accent ? "text-[var(--drawing-accent)] font-bold" : ""}`}>
      {children}
    </td>
  );
}

function PriceInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-24 border-[1.5px] border-[var(--drawing-line)] bg-transparent px-1.5 py-0.5 font-gost text-[11px]"
    />
  );
}

function SaveBtn({ dirty, saving, onClick }: { dirty: boolean; saving: boolean; onClick: () => void }) {
  if (!dirty) return <span className="text-[var(--drawing-line-thin)] text-[10px]">—</span>;
  return (
    <button onClick={onClick} disabled={saving} className="btn-drawing btn-drawing-accent text-[10px] px-2 py-1">
      {saving ? "…" : "Сохранить"}
    </button>
  );
}
