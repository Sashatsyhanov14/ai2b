import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

/**
 * API for secure deletion of files from Supabase Storage.
 * Accepts full URL or relative path.
 */
export async function POST(req: Request) {
    try {
        const { url, path } = await req.json();
        const property = url || path;

        if (!property) {
            return NextResponse.json({ ok: false, error: "Missing URL or Path" }, { status: 400 });
        }

        let storagePath = "";

        if (url && url.includes("/storage/v1/object/public/")) {
            // Extract path after bucket name: property-images/ownerId/entity/id/name
            const parts = url.split("/storage/v1/object/public/property-images/");
            if (parts.length > 1) {
                storagePath = parts[1];
            } else {
                // If bucket name is different or structure varies, need careful handling.
                // For now assuming property-images bucket as it's used in UploadImage.tsx
                storagePath = url.split("/").pop() || "";
            }
        } else {
            storagePath = path;
        }

        if (!storagePath) {
            return NextResponse.json({ ok: false, error: "Cloud not determine storage path" }, { status: 400 });
        }

        const sb = getServerClient();

        // service_role client required for storage management
        const { error } = await sb.storage
            .from("property-images")
            .remove([storagePath]);

        if (error) {
            console.error("Storage removal error:", error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("Storage API error:", e);
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
