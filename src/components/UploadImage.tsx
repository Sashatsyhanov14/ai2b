"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UploadEntity = "units" | "developer_projects" | "rent_units" | "company";

type UploadImageProps = {
  ownerUid: string;
  entity: UploadEntity;
  entityId: string;
  onUploaded: (url: string) => void;
  multiple?: boolean;
  label?: string;
};

export default function UploadImage({
  ownerUid,
  entity,
  entityId,
  onUploaded,
  multiple = true,
  label = "Загрузить фото",
}: UploadImageProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPreviews(files.map((f) => URL.createObjectURL(f)));
    setLoading(true);
    try {
      for (const file of files) {
        const ts = Date.now();
        const safeName = file.name.replaceAll(" ", "_");
        const key = `${ownerUid}/${entity}/${entityId}/${ts}-${safeName}`;
        const { error } = await supabase.storage
          .from("property-images")
          .upload(key, file, { upsert: true });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("property-images").getPublicUrl(key);
        if (pub?.publicUrl) onUploaded(pub.publicUrl);
      }
    } catch (e: any) {
      alert(e.message || "Не удалось загрузить файл");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900">
        {label}
        <input type="file" accept="image/*" className="hidden" onChange={onFile} multiple={multiple} />
      </label>
      {loading && <span className="text-xs text-neutral-400">Загрузка…</span>}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.slice(0, 4).map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt="preview"
              className="h-14 w-14 rounded-lg object-cover ring-1 ring-neutral-800"
            />
          ))}
          {previews.length > 4 && (
            <span className="text-xs text-neutral-400">+{previews.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}
