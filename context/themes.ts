
export interface Theme {
    name: string;
    bgColor: string | null;
    isOriginal?: boolean;
    textColor: string;
    font: string;
    palette: string[];
    barBg?: string;
    barBorder?: string;
}

export const presetThemes: { [key: string]: Theme } = {
    daylight: { name: "افتراضي", bgColor: "#F3F4F6", textColor: "#111827", font: "'Cairo', sans-serif", palette: ["#3b82f6", "#10b981", "#9333ea"] },
    royal_indigo: { name: "ملكي", bgColor: "#191D3A", textColor: "#EAEAEA", font: "'Cairo', sans-serif", palette: ["#46C3B8", "#F4B860", "#a78bfa"], barBg: "#2A3045", barBorder: "1px solid #4A5568" },
    pure_black: { name: "أسود فاحم", bgColor: "#000000", palette: ["#444444", "#666666", "#888888"], textColor: "#ffffff", font: "'Cairo', sans-serif", barBg: "#111111", barBorder: "1px solid #444" },
    kaaba: { name: "الكعبة", bgColor: "#000000", palette: ["#1a1a1a", "#d4af37", "#2d2d2d"], textColor: "#f5e6d3", font: "'Amiri', serif", barBg: "#1a1a1a", barBorder: "1px solid #d4af37" },
    masjid: { name: "النبوي", bgColor: "#064e3b", palette: ["#047857", "#059669", "#10b981"], textColor: "#ecfdf5", font: "'Scheherazade New', serif", barBg: "#047857", barBorder: "1px solid #10b981" },
    quran_classic: { name: "المصحف", bgColor: "#fffbeb", palette: ["#92400e", "#b45309", "#d97706"], textColor: "#451a03", font: "'Amiri', serif", barBg: "#f5f0e7", barBorder: "1px solid #d97706" },
    ramadan: { name: "رمضان", bgColor: "#4c1d95", palette: ["#6d28d9", "#7c3aed", "#d97706"], textColor: "#faf5ff", font: "'Amiri', serif", barBg: "#6d28d9", barBorder: "1px solid #d97706" },
    fajr: { name: "الفجر", bgColor: "#bae6fd", palette: ["#7dd3fc", "#38bdf8", "#0ea5e9"], textColor: "#0c4a6e", font: "'Cairo', sans-serif", barBg: "#e0f2fe", barBorder: "1px solid #38bdf8" },
    dhuhr: { name: "الظهر", bgColor: "#fef3c7", palette: ["#fbbf24", "#f59e0b", "#d97706"], textColor: "#78350f", font: "'Amiri', serif", barBg: "#fef3c7", barBorder: "1px solid #f59e0b" },
    asr: { name: "العصر", bgColor: "#fed7aa", palette: ["#fb923c", "#f97316", "#ea580c"], textColor: "#7c2d12", font: "'Scheherazade New', serif", barBg: "#fed7aa", barBorder: "1px solid #f97316" },
    maghrib: { name: "المغرب", bgColor: "#7c2d12", palette: ["#ea580c", "#dc2626", "#9333ea"], textColor: "#fef2f2", font: "'Scheherazade New', serif", barBg: "#ea580c", barBorder: "1px solid #9333ea" },
    isha: { name: "العشاء", bgColor: "#1e40af", palette: ["#1e40af", "#2563eb", "#3b82f6"], textColor: "#dbeafe", font: "'Amiri', serif", barBg: "#1e40af", barBorder: "1px solid #3b82f6" },
    night_prayer: { name: "القيام", bgColor: "#1e1b4b", palette: ["#312e81", "#4c1d95", "#5b21b6"], textColor: "#e9d5ff", font: "'Amiri', serif", barBg: "#312e81", barBorder: "1px solid #5b21b6" },
    medina: { name: "المدينة", bgColor: "#0f766e", palette: ["#14b8a6", "#2dd4bf", "#5eead4"], textColor: "#f0fdfa", font: "'Cairo', sans-serif", barBg: "#14b8a6", barBorder: "1px solid #5eead4" },
    mecca: { name: "مكة", bgColor: "#1c1917", palette: ["#78350f", "#92400e", "#b45309"], textColor: "#fef3c7", font: "'Amiri', serif", barBg: "#78350f", barBorder: "1px solid #b45309" },
    alaqsa: { name: "الأقصى", bgColor: "#155e75", palette: ["#0891b2", "#06b6d4", "#22d3ee"], textColor: "#ecfeff", font: "'Scheherazade New', serif", barBg: "#0891b2", barBorder: "1px solid #22d3ee" },
    islamic_gold: { name: "ذهبي", bgColor: "#d97706", palette: ["#f59e0b", "#fbbf24", "#fcd34d"], textColor: "#451a03", font: "'Amiri', serif", barBg: "#fbbf24", barBorder: "1px solid #fcd34d" },
    islamic_green: { name: "أخضر", bgColor: "#047857", palette: ["#059669", "#10b981", "#34d399"], textColor: "#f0fdf4", font: "'Amiri', serif", barBg: "#10b981", barBorder: "1px solid #34d399" },
    tasbih: { name: "تسبيح", bgColor: "#581c87", palette: ["#7c3aed", "#8b5cf6", "#a78bfa"], textColor: "#f3e8ff", font: "'Amiri', serif", barBg: "#7c3aed", barBorder: "1px solid #a78bfa" },
    dua: { name: "دعاء", bgColor: "#1e40af", palette: ["#1e40af", "#2563eb", "#3b82f6"], textColor: "#dbeafe", font: "'Scheherazade New', serif", barBg: "#2563eb", barBorder: "1px solid #3b82f6" },
    midnight: { name: "ليل", bgColor: "#0b0f19", palette: ["#6366f1", "#8b5cf6", "#d946ef"], textColor: "#c7d2fe", font: "'Cairo', sans-serif", barBg: "#312e81", barBorder: "1px solid #8b5cf6" },
    wood: { name: "خشب", bgColor: "#3e2723", palette: ["#5d4037", "#4e342e", "#795548"], textColor: "#d7ccc8", font: "'Amiri', serif", barBg: "#5d4037", barBorder: "1px solid #795548" },
    sunset: { name: "غروب", bgColor: "#450a0a", palette: ["#dc2626", "#ea580c", "#c026d3"], textColor: "#fef2f2", font: "'Amiri', serif", barBg: "#dc2626", barBorder: "1px solid #c026d3" },
};
