const LOCALES: Record<string, string> = {
    english: 'en-US', dutch: 'nl-NL', german: 'de-DE', french: 'fr-FR', spanish: 'es-ES',
    latam: 'es-419', italian: 'it-IT', portuguese: 'pt-PT', brazilian: 'pt-BR', polish: 'pl-PL',
    russian: 'ru-RU', ukrainian: 'uk-UA', turkish: 'tr-TR', swedish: 'sv-SE', norwegian: 'nb-NO',
    danish: 'da-DK', finnish: 'fi-FI', czech: 'cs-CZ', hungarian: 'hu-HU', romanian: 'ro-RO',
    greek: 'el-GR', japanese: 'ja-JP', koreana: 'ko-KR', schinese: 'zh-CN', tchinese: 'zh-TW',
    thai: 'th-TH', vietnamese: 'vi-VN', indonesian: 'id-ID', bulgarian: 'bg-BG',
};

export function steamLanguageToLocale(lang: string): string {
    return LOCALES[lang.trim().toLowerCase()] ?? 'en-US';
}

export function minutesToHours(minutes: number): number {
    return Number.isFinite(minutes) && minutes > 0 ? minutes / 60 : 0;
}

function formatNumber(value: number, locale: string, decimals: number): string {
    try {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    } catch {
        return value.toFixed(decimals);
    }
}

export function formatHours(hours: number, locale: string): string {
    if (!Number.isFinite(hours) || hours <= 0) return `${formatNumber(0, locale, 0)} h`;
    const rounded = Math.round(hours * 10) / 10;
    if (rounded === 0) return `< ${formatNumber(0.1, locale, 1)} h`;
    const decimals = Number.isInteger(rounded) ? 0 : 1;
    return `${formatNumber(rounded, locale, decimals)} h`;
}

/** A size like Unifideck's own ("3.2 GB", "512 MB": binary units, one decimal under 100); null when unknown (never "0 B"). */
export function formatBytes(bytes: unknown, locale: string): string | null {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return null;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${formatNumber(v, locale, v >= 100 ? 0 : 1)} ${units[i]}`;
}
