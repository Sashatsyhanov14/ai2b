import { redirect } from "next/navigation";

export default function LegacySalePage() {
  redirect("/app/sales/secondary");
}

