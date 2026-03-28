/**
 * City Name Normalizer
 * Converts any Russian / Turkish / shorthand city name to the canonical English spelling.
 * Applied on unit SAVE and on bot SEARCH keywords so the database is always consistent.
 */

const CITY_MAP: Record<string, string> = {
    // Istanbul
    "стамбул": "Istanbul",
    "istanbul": "Istanbul",
    "истанбул": "Istanbul",
    "константинополь": "Istanbul",

    // Ankara
    "анкара": "Ankara",
    "ankara": "Ankara",

    // Izmir
    "измир": "Izmir",
    "izmir": "Izmir",
    "smyrna": "Izmir",

    // Antalya
    "анталия": "Antalya",
    "анталья": "Antalya",
    "antalya": "Antalya",
    "antalija": "Antalya",

    // Alanya
    "аланья": "Alanya",
    "аланія": "Alanya",
    "alanya": "Alanya",
    "alania": "Alanya",

    // Mersin
    "мерсин": "Mersin",
    "mersin": "Mersin",

    // Mezitli (district of Mersin)
    "мезитли": "Mezitli",
    "mezitli": "Mezitli",

    // Bodrum
    "бодрум": "Bodrum",
    "bodrum": "Bodrum",

    // Marmaris
    "мармарис": "Marmaris",
    "marmaris": "Marmaris",

    // Fethiye
    "фетхие": "Fethiye",
    "fethiye": "Fethiye",

    // Kemer
    "кемер": "Kemer",
    "kemer": "Kemer",

    // Side
    "сиде": "Side",
    "side": "Side",

    // Belek
    "белек": "Belek",
    "belek": "Belek",

    // Mahmutlar (district of Alanya)
    "махмутлар": "Mahmutlar",
    "mahmutlar": "Mahmutlar",

    // Kestel (district of Alanya)
    "кестель": "Kestel",
    "kestel": "Kestel",

    // Oba (district of Alanya)
    "оба": "Oba",
    "oba": "Oba",

    // Bursa
    "бурса": "Bursa",
    "bursa": "Bursa",

    // Kusadasi
    "кушадасы": "Kusadasi",
    "kusadasi": "Kusadasi",

    // Trabzon
    "трабзон": "Trabzon",
    "trabzon": "Trabzon",

    // Gaziantep
    "газиантеп": "Gaziantep",
    "gaziantep": "Gaziantep",

    // Konya
    "конья": "Konya",
    "konya": "Konya",

    // Tece (district of Mersin)
    "тесе": "Tece",
    "тесе-мерсин": "Tece",
    "tece": "Tece",

    // Erdemli (district of Mersin)
    "эрдемли": "Erdemli",
    "erdemli": "Erdemli",

    // Izmit / Kocaeli
    "измит": "Izmit",
    "izmit": "Izmit",
    "коджаэли": "Kocaeli",
    "kocaeli": "Kocaeli",

    // Sakarya
    "сакарья": "Sakarya",
    "sakarya": "Sakarya",

    // Yalova
    "ялова": "Yalova",
    "yalova": "Yalova",

    // Didim
    "дидим": "Didim",
    "didim": "Didim",

    // Alacati
    "алачаты": "Alacati",
    "alacati": "Alacati",

    // Cesme
    "чешме": "Cesme",
    "cesme": "Cesme",
};

/**
 * Normalizes a single city name to its canonical English form.
 * If not found in the map, the original value is returned (with first letter capitalized).
 */
export function normalizeCity(city: string): string {
    if (!city || typeof city !== "string") return city;
    const key = city.trim().toLowerCase();
    return CITY_MAP[key] ?? city.trim();
}

/**
 * Normalizes an array of search keywords:
 * replaces each Russian/Turkish city keyword with its English equivalent.
 * Unknown keywords pass through unchanged.
 */
export function normalizeSearchKeywords(keywords: string[] | undefined): string[] {
    if (!keywords || !Array.isArray(keywords)) return [];
    // For each keyword: if it maps → add English version; always keep original too
    const result: string[] = [];
    for (const kw of keywords) {
        const key = kw.trim().toLowerCase();
        const normalized = CITY_MAP[key];
        if (normalized && normalized.toLowerCase() !== key) {
            result.push(normalized); // add English canonical
        }
        result.push(kw.trim()); // keep original
    }
    // Deduplicate
    return [...new Set(result)];
}
