"use client";
import { useEffect, useState } from 'react';
import UploadImage from './UploadImage';
import { Images, Trash2 } from 'lucide-react';

type Photo = { id: string; url: string; sort_order: number | null; is_main?: boolean | null };

export default function PhotosModal({
  unitId,
  ownerUid,
  onClose,
}: {
  unitId: string;
  ownerUid: string;
  onClose: () => void;
}) {
  const [list, setList] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/units/${unitId}/photos`);
    const j = await res.json().catch(() => ({}));
    if (j?.ok) setList(j.data || []);
  }

  useEffect(() => {
    load();
  }, [unitId]);

  async function onUploaded(url: string) {
    setLoading(true);
    try {
      const nextPos = (list[list.length - 1]?.sort_order || 0) + 1;
      const res = await fetch(`/api/units/${unitId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, sort_order: nextPos }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j?.ok) {
        alert(j?.error || 'Не удалось добавить фото');
        return;
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function removePhoto(id: string) {
    if (!confirm('Удалить фото?')) return;
    const res = await fetch(`/api/units/${unitId}/photos/${id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!j?.ok) {
      alert(j?.error || 'Не удалось удалить фото');
      return;
    }
    await load();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[820px] rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Images size={18} /> Фотогалерея
          </h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-900"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <UploadImage
            ownerUid={ownerUid}
            entity="units"
            entityId={unitId}
            onUploaded={onUploaded}
          />
          {loading && <div className="mt-2 text-xs text-neutral-500">Загрузка…</div>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {list.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-lg border border-neutral-800"
            >
              <img src={p.url} alt="" className="h-44 w-full object-cover" />
              <button
                onClick={() => removePhoto(p.id)}
                className="absolute right-2 top-2 hidden rounded bg-red-600/80 px-2 py-1 text-xs text-white group-hover:block"
              >
                <Trash2 size={14} />
              </button>
              {p.is_main && (
                <span className="absolute left-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-xs">
                  Обложка
                </span>
              )}
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-3 rounded border border-dashed border-neutral-700 p-8 text-center text-neutral-500">
              Фото пока нет. Загрузите первое.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

