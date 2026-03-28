"use client";
import PropertyForm from "@/components/units/PropertyForm";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditCommercialPage() {
  const params = useParams();
  const id = params.id;
  const [unit, setUnit] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/units?id=${id}`)
        .then(res => res.json())
        .then(json => {
           if (json.units?.[0]) setUnit(json.units[0]);
        });
    }
  }, [id]);

  if (!unit) return <div className="p-10 text-center text-neutral-500 text-sm">Загрузка...</div>;

  return <PropertyForm category="commercial" initialData={unit} />;
}
