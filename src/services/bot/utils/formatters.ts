import { Lang } from "../types";

export function detectLang(code?: string | null): Lang {
    if (!code) return "ru";
    const c = code.toLowerCase();
    if (c.startsWith("ru") || c.startsWith("uk") || c.startsWith("be")) return "ru";
    if (c.startsWith("tr")) return "tr";
    if (c.startsWith("ar")) return "ar";
    return "en";
}

export function formatPrice(price: number | null | undefined): string {
    if (price == null) return "цена по запросу";
    const usd = price.toLocaleString("ru-RU");
    const tryValue = Math.round(price * 34).toLocaleString("ru-RU"); // Mock rate
    return `$${usd} (≈${tryValue} ₺)\n*Точную цену в лирах узнаете у менеджера*`;
}

export function buildPropertyDescription(unit: any, lang: Lang): string {
    const city = unit.city || "—";

    // Rooms - translate to user language
    let rooms = "";
    if (unit.rooms != null) {
        if (unit.rooms === 0) {
            rooms = lang === "ru" ? "студия" : lang === "tr" ? "stüdyo" : lang === "ar" ? "استوديو" : "studio";
        } else {
            rooms = lang === "ru"
                ? `${unit.rooms}-комнатная`
                : lang === "tr"
                    ? `${unit.rooms}+1 daire`
                    : lang === "ar"
                        ? `${unit.rooms}+1 شقة`
                        : `${unit.rooms}-room`;
        }
    }

    // Area
    const area = unit.area_m2 ? `${unit.area_m2} m²` : "";

    // Floor - translate to user language
    let floor = "";
    if (unit.floor) {
        if (unit.floors_total) {
            floor = lang === "ru"
                ? `${unit.floor}/${unit.floors_total} этаж`
                : lang === "tr"
                    ? `${unit.floor}/${unit.floors_total} Kat`
                    : lang === "ar"
                        ? `الطابق ${unit.floor}/${unit.floors_total}`
                        : `${unit.floor}/${unit.floors_total} floor`;
        } else {
            floor = lang === "ru"
                ? `${unit.floor} этаж`
                : lang === "tr"
                    ? `${unit.floor} Kat`
                    : lang === "ar"
                        ? `الطابق ${unit.floor}`
                        : `${unit.floor} floor`;
        }
    }

    const price = formatPrice(unit.price);
    const parts = [rooms, area, floor].filter(Boolean).join(", ");

    return `${city}. ${parts}. ${price}`;
}
