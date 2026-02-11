import { Badge } from "lucide-react";

export type LeadStatus = "new" | "in_work" | "done" | "spam";

const colors: Record<LeadStatus, string> = {
    new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    in_work: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    spam: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
    const colorClass = colors[status] || colors.new;
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
            {status.replace("_", " ")}
        </span>
    );
}
