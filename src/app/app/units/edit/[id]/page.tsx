"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PropertyForm from "@/components/units/PropertyForm";
import type { Unit } from "@/types/units";

export default function EditUnitPage() {
  const params = useParams();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/units/${params.id}`);
        const json = await res.json();
        if (json.ok) setUnit(json.data);
      } catch (err) {
        console.error("Failed to load unit", err);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id]);

  if (loading) return <div className="p-10 text-center text-white">Загрузка...</div>;
  if (!unit) return <div className="p-10 text-center text-white">Объект не найден</div>;

  return (
    <div className="min-h-screen bg-neutral-950">
      <PropertyForm initialData={unit} />
    </div>
  );
}
