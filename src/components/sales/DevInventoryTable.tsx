"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { DevUnit, useDevStore } from "@/stores/developer";

function statusBadge(s: DevUnit["status"]) {
  const map: Record<DevUnit["status"], string> = {
    available: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
    reserved: "bg-yellow-600/20 text-yellow-300 border-yellow-600/30",
    sold: "bg-red-600/20 text-red-300 border-red-600/30",
  };
  const label: Record<DevUnit["status"], string> = {
    available: "Свободно",
    reserved: "Бронь",
    sold: "Продано",
  };
  return (
    <span className={`rounded border px-2 py-0.5 text-xs ${map[s]}`}>
      {label[s]}
    </span>
  );
}

function downloadCsv(rows: DevUnit[]) {
  const header = [
    "id",
    "projectId",
    "section",
    "floor",
    "number",
    "typeId",
    "area_m2",
    "price_total",
    "status",
  ];
  const escape = (v: unknown) =>
    '"' + String(v ?? "").replaceAll('"', '""') + '"';
  const lines = [header.join(",")].concat(
    rows.map((u) =>
      [
        u.id,
        u.projectId,
        u.section,
        u.floor,
        u.number,
        u.typeId,
        u.area_m2,
        u.price_total,
        u.status,
      ]
        .map(escape)
        .join(","),
    ),
  );
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function DevInventoryTable({
  projectId,
}: {
  projectId: string;
}) {
  const unitsAll = useDevStore((s) => s.units);
  const updateUnit = useDevStore((s) => s.updateUnit);
  const removeUnit = useDevStore((s) => s.removeUnit);
  const types = useDevStore((s) =>
    s.types.filter((t) => t.projectId === projectId),
  );
  const units = unitsAll.filter((u) => u.projectId === projectId);

  const [section, setSection] = useState("");
  const [typeId, setTypeId] = useState("");
  const [status, setStatus] = useState("");
  const [floorFrom, setFloorFrom] = useState("");
  const [floorTo, setFloorTo] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return units.filter((u) => {
      if (section && u.section !== section) return false;
      if (typeId && u.typeId !== typeId) return false;
      if (status && u.status !== (status as DevUnit["status"])) return false;
      if (floorFrom && u.floor < Number(floorFrom)) return false;
      if (floorTo && u.floor > Number(floorTo)) return false;
      if (priceFrom && u.price_total < Number(priceFrom)) return false;
      if (priceTo && u.price_total > Number(priceTo)) return false;
      return true;
    });
  }, [units, section, typeId, status, floorFrom, floorTo, priceFrom, priceTo]);

  const sections = Array.from(new Set(units.map((u) => u.section))).sort();

  function setAllSelected(on: boolean) {
    setSelected(on ? new Set(filtered.map((u) => u.id)) : new Set());
  }

  function massStatus(newStatus: DevUnit["status"]) {
    if (selected.size === 0) return;
    selected.forEach((id) => updateUnit(id, { status: newStatus }));
    setSelected(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <Field label="Секция">
          <select
            aria-label="Секция"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="min-w-[140px]"
          >
            <option value="">Все</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Этаж от">
          <input
            aria-label="Этаж от"
            type="number"
            value={floorFrom}
            onChange={(e) => setFloorFrom(e.target.value)}
            className="w-28"
          />
        </Field>
        <Field label="Этаж до">
          <input
            aria-label="Этаж до"
            type="number"
            value={floorTo}
            onChange={(e) => setFloorTo(e.target.value)}
            className="w-28"
          />
        </Field>
        <Field label="Тип">
          <select
            aria-label="Тип"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="min-w-[160px]"
          >
            <option value="">Все</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Статус">
          <select
            aria-label="Статус"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-w-[140px]"
          >
            <option value="">Все</option>
            <option value="available">Свободно</option>
            <option value="reserved">Бронь</option>
            <option value="sold">Продано</option>
          </select>
        </Field>
        <Field label="Цена от">
          <input
            aria-label="Цена от"
            type="number"
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            className="w-32"
          />
        </Field>
        <Field label="Цена до">
          <input
            aria-label="Цена до"
            type="number"
            value={priceTo}
            onChange={(e) => setPriceTo(e.target.value)}
            className="w-32"
          />
        </Field>

        <div className="ml-auto flex items-start gap-2 pt-6">
          <Button variant="secondary" onClick={() => downloadCsv(filtered)}>
            Выгрузить CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/60">
          Выбрано: {selected.size}
        </span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setAllSelected(true)}
        >
          Выделить все
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setAllSelected(false)}
        >
          Сбросить выделение
        </Button>
        <Button type="button" onClick={() => massStatus("available")}>
          Пометить как свободные
        </Button>
        <Button type="button" onClick={() => massStatus("reserved")}>
          Пометить как бронь
        </Button>
        <Button type="button" onClick={() => massStatus("sold")}>
          Пометить как проданные
        </Button>
      </div>

      <div className="overflow-auto rounded border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">Секция</th>
              <th className="px-3 py-2 text-left">Этаж</th>
              <th className="px-3 py-2 text-left">Номер</th>
              <th className="px-3 py-2 text-left">Тип</th>
              <th className="px-3 py-2 text-left">Площадь (м²)</th>
              <th className="px-3 py-2 text-left">Цена</th>
              <th className="px-3 py-2 text-left">Статус</th>
              <th className="px-3 py-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(u.id);
                      else next.delete(u.id);
                      setSelected(next);
                    }}
                    className="mr-2"
                  />
                  {u.section}
                </td>
                <td className="px-3 py-2">{u.floor}</td>
                <td className="px-3 py-2">{u.number}</td>
                <td className="px-3 py-2">
                  {types.find((t) => t.id === u.typeId)?.label || "—"}
                </td>
                <td className="px-3 py-2">{u.area_m2}</td>
                <td className="px-3 py-2">
                  {u.price_total.toLocaleString("ru-RU")}
                </td>
                <td className="px-3 py-2">{statusBadge(u.status)}</td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeUnit(u.id)}
                  >
                    Удалить
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-white/60"
                >
                  Нет квартир по выбранным фильтрам.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

