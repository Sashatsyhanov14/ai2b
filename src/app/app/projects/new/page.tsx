"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createProject } from '@/lib/devProjectsMock';

export default function NewProjectWizard(){
  const r = useRouter();
  const [step, setStep] = useState<1|2|3>(1);

  // step 1
  const [name, setName] = useState('');
  const [developer, setDeveloper] = useState('');
  const [city, setCity] = useState('');
  const [stage, setStage] = useState<'котлован'|'каркас'|'отделка'|'ввод'|''>('');
  const [quarter, setQuarter] = useState<1|2|3|4|''>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [sections, setSections] = useState('A,B');

  // step 2 (one type quick add)
  const [typeTitle, setTypeTitle] = useState('Студия');
  const [areaFrom, setAreaFrom] = useState(25);
  const [areaTo, setAreaTo] = useState(35);
  const [typeFinish, setTypeFinish] = useState<'whitebox'|'черновая'|'с отделкой'>('whitebox');
  const [priceFrom, setPriceFrom] = useState(5000000);
  const [priceM2, setPriceM2] = useState<number|''>('');
  const [markup, setMarkup] = useState<number|''>('');

  // step 3 (generation)
  const [floorFrom, setFloorFrom] = useState(1);
  const [floorTo, setFloorTo] = useState(9);
  const [perFloor, setPerFloor] = useState(4);

  function next(){ setStep((step===3?3:(step+1)) as 1|2|3); }
  function prev(){ setStep((step===1?1:(step-1)) as 1|2|3); }

  function finish(){
    const project = createProject({
      name, developer, city,
      stage: stage || undefined,
      quarter: (quarter || undefined) as any,
      year,
      sections: sections.split(',').map(s=>s.trim()).filter(Boolean),
    });
    // For brevity, redirect to project page; types/lots можно добавить там
    r.push(`/app/projects/${project.id}`);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Новый проект — шаг {step} из 3</h1>
        <div className="flex items-center gap-2">
          {step>1 && <button onClick={prev} className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900">Назад</button>}
          {step<3 && <button onClick={next} className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900">Далее</button>}
          {step===3 && <button onClick={finish} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500">Создать проект</button>}
        </div>
      </header>

      {step===1 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Название ЖК*</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Застройщик*</label>
            <input value={developer} onChange={e=>setDeveloper(e.target.value)} className="w-full rounded border border-zinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Город*</label>
            <input value={city} onChange={e=>setCity(e.target.value)} className="w-full rounded border border-zinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Стадия</label>
            <select value={stage} onChange={e=>setStage(e.target.value as any)} className="w-full rounded border border-zinc-700 bg-зinc-900 px-3 py-2 text-sm">
              <option value="">—</option>
              <option value="котлован">котлован</option>
              <option value="каркас">каркас</option>
              <option value="отделка">отделка</option>
              <option value="ввод">ввод</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Срок сдачи*</label>
            <div className="flex gap-2">
              <select value={quarter as any} onChange={e=>setQuarter(Number(e.target.value) as any)} className="rounded border border-zinc-700 bg-зinc-900 px-3 py-2 text-sm">
                <option value="1">1 кв</option>
                <option value="2">2 кв</option>
                <option value="3">3 кв</option>
                <option value="4">4 кв</option>
              </select>
              <input type="number" min={2024} value={year} onChange={e=>setYear(Number(e.target.value))} className="w-24 rounded border border-zinc-700 bg-зinc-900 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Секции (через запятую)</label>
            <input value={sections} onChange={e=>setSections(e.target.value)} className="w-full rounded border border-zinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      {step===2 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Название типа*</label>
            <input value={typeTitle} onChange={e=>setTypeTitle(e.target.value)} className="w-full rounded border border-zinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Площадь от*</label>
              <input type="number" min={10} value={areaFrom} onChange={e=>setAreaFrom(Number(e.target.value))} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">до*</label>
              <input type="number" min={areaFrom} value={areaTo} onChange={e=>setAreaTo(Number(e.target.value))} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Отделка</label>
            <select value={typeFinish} onChange={e=>setTypeFinish(e.target.value as any)} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm">
              <option value="whitebox">whitebox</option>
              <option value="черновая">черновая</option>
              <option value="с отделкой">с отделкой</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-зinc-400 mb-1">Цена от, ₽*</label>
            <input type="number" min={100000} value={priceFrom} onChange={e=>setPriceFrom(Number(e.target.value))} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-зinc-400 mb-1">Цена за м², ₽</label>
            <input type="number" value={priceM2 as any} onChange={e=>setPriceM2(e.target.value ? Number(e.target.value) : '')} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-зinc-400 mb-1">Надбавка за этаж, ₽</label>
            <input type="number" value={markup as any} onChange={e=>setMarkup(e.target.value ? Number(e.target.value) : '')} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      {step===3 && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-зinc-400 mb-1">Этажи от*</label>
            <input type="number" min={1} value={floorFrom} onChange={e=>setFloorFrom(Number(e.target.value))} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-зinc-400 mb-1">до*</label>
            <input type="number" min={floorFrom} value={floorTo} onChange={e=>setFloorTo(Number(e.target.value))} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-зinc-400 mb-1">Лотов на этаже*</label>
            <input type="number" min={1} value={perFloor} onChange={e=>setPerFloor(Number(e.target.value))} className="w-full rounded border border-зinc-700 bg-зinc-900 px-3 py-2 text-sm" />
          </div>
          <div className="col-span-3 text-sm text-зinc-400">Подсказка: price = price_from + (floor-1)*floor_markup</div>
        </div>
      )}
    </div>
  );
}


