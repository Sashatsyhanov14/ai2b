"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useDevStore } from '@/stores/developer';

export default function DevProjectWizard({ projectId }: { projectId: string }) {
  const addType = useDevStore((s) => s.addType);
  const generateUnits = useDevStore((s) => s.generateUnits);
  const [step, setStep] = useState<1 | 2>(1);

  const [typeForm, setTypeForm] = useState({
    label: '',
    area_min: 30,
    area_max: 60,
    finish: '',
    price_from: 0,
    price_per_m2: 0,
    floor_markup: 0,
    images: [] as string[],
  });

  const [genForm, setGenForm] = useState({
    typeId: '',
    floorFrom: 1,
    floorTo: 10,
    sections: '' as string,
    perFloorCount: 4,
    numberTemplate: '${floor}${index2}',
  });

  function readFiles(files: FileList | null, cb: (urls: string[]) => void) {
    if (!files || files.length === 0) return;
    const readers: Promise<string>[] = [];
    for (const file of Array.from(files)) {
      readers.push(
        new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.readAsDataURL(file);
        }),
      );
    }
    Promise.all(readers).then(cb);
  }

  function saveType(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      projectId,
      label: typeForm.label.trim(),
      area_min: Number(typeForm.area_min),
      area_max: Number(typeForm.area_max),
      finish: (typeForm.finish || undefined) as any,
      price_from: Number(typeForm.price_from),
      price_per_m2: typeForm.price_per_m2 || undefined,
      floor_markup: typeForm.floor_markup || undefined,
      images: typeForm.images,
    };
    const id = addType(payload as any);
    setGenForm((g) => ({ ...g, typeId: id }));
    setStep(2);
  }

  function saveUnits(e: React.FormEvent) {
    e.preventDefault();
    if (!genForm.typeId) {
      alert('Сначала создайте тип планировки');
      return;
    }
    const sections = genForm.sections
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    generateUnits({
      projectId,
      typeId: genForm.typeId,
      floorFrom: Number(genForm.floorFrom),
      floorTo: Number(genForm.floorTo),
      sections,
      perFloorCount: Number(genForm.perFloorCount),
      numberTemplate: genForm.numberTemplate,
    });
    alert('Лоты сгенерированы');
  }

  return (
    <div className="space-y-6 rounded border border-white/15 p-4">
      <h2 className="text-lg font-semibold">Мастер проекта</h2>
      <p className="text-sm text-white/70">
        Шаг за шагом создайте тип квартиры и автоматически сгенерируйте лоты по секциям и этажам.
      </p>

      <div className="flex gap-2 text-xs">
        <span className={step === 1 ? 'font-semibold' : 'text-white/60'}>1. Тип планировки</span>
        <span className="text-white/40">→</span>
        <span className={step === 2 ? 'font-semibold' : 'text-white/60'}>2. Генерация лотов</span>
      </div>

      {step === 1 && (
        <form onSubmit={saveType} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Название типа*">
              <input
                value={typeForm.label}
                onChange={(e) => setTypeForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="1-комн., 2-комн., студия"
              />
            </Field>
            <Field label="Площадь от, м²*">
              <input
                type="number"
                value={typeForm.area_min}
                onChange={(e) => setTypeForm((f) => ({ ...f, area_min: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Площадь до, м²*">
              <input
                type="number"
                value={typeForm.area_max}
                onChange={(e) => setTypeForm((f) => ({ ...f, area_max: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Отделка">
              <select
                value={typeForm.finish}
                onChange={(e) => setTypeForm((f) => ({ ...f, finish: e.target.value }))}
              >
                <option value="">Не указано</option>
                <option value="whitebox">Whitebox</option>
                <option value="shell">Черновая</option>
                <option value="turnkey">С ремонтом</option>
              </select>
            </Field>
            <Field label="Цена от, €*">
              <input
                type="number"
                value={typeForm.price_from}
                onChange={(e) => setTypeForm((f) => ({ ...f, price_from: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Цена за м², €">
              <input
                type="number"
                value={typeForm.price_per_m2}
                onChange={(e) => setTypeForm((f) => ({ ...f, price_per_m2: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Надбавка за этаж, €">
              <input
                type="number"
                value={typeForm.floor_markup}
                onChange={(e) => setTypeForm((f) => ({ ...f, floor_markup: Number(e.target.value) }))}
              />
            </Field>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm text-white/80">Изображения типа</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) =>
                  readFiles(e.target.files, (urls) =>
                    setTypeForm((f) => ({ ...f, images: [...f.images, ...urls] })),
                  )
                }
              />
              {typeForm.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {typeForm.images.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="h-16 w-24 rounded object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setTypeForm((f) => ({
                            ...f,
                            images: f.images.filter((_, j) => j !== i),
                          }))
                        }
                        className="absolute right-1 top-1 rounded bg-red-600/80 px-1 py-0.5 text-[10px] text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button type="submit">Сохранить тип и перейти к лотам</Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={saveUnits} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="ID типа">
              <input
                value={genForm.typeId}
                onChange={(e) => setGenForm((g) => ({ ...g, typeId: e.target.value }))}
                placeholder="ID созданного типа"
              />
            </Field>
            <Field label="Этаж от">
              <input
                type="number"
                value={genForm.floorFrom}
                onChange={(e) => setGenForm((g) => ({ ...g, floorFrom: Number(e.target.value) }))}
              />
            </Field>
            <Field label="до">
              <input
                type="number"
                value={genForm.floorTo}
                onChange={(e) => setGenForm((g) => ({ ...g, floorTo: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Секции (через запятую)">
              <input
                value={genForm.sections}
                onChange={(e) => setGenForm((g) => ({ ...g, sections: e.target.value }))}
                placeholder="A,B,C или 1,2"
              />
            </Field>
            <Field label="Квартир на этаже">
              <input
                type="number"
                value={genForm.perFloorCount}
                onChange={(e) => setGenForm((g) => ({ ...g, perFloorCount: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Шаблон номера">
              <input
                value={genForm.numberTemplate}
                onChange={(e) => setGenForm((g) => ({ ...g, numberTemplate: e.target.value }))}
                placeholder="${floor}${index2}"
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Сгенерировать лоты</Button>
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Назад к типу
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

