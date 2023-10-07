import slugify from 'slugify';
import { DEFAULT_LANGUAGE_CODE, WPMLanguageCodeMap, WPMLSlugPostfixMap } from './exp-importer.wpml';

export function moveDefaultLangToFirst(langsToImport: (keyof typeof WPMLanguageCodeMap)[]) {
    langsToImport = langsToImport.filter((item) => item !== DEFAULT_LANGUAGE_CODE);
    langsToImport.unshift(DEFAULT_LANGUAGE_CODE);
    return langsToImport;
}

export function createTrailSlug(cityName, trailId, lang: keyof typeof WPMLanguageCodeMap) {
    const t = trailId.split('_');
    const trailNo = t[t.length - 1];
    switch (lang) {
        case 'en':
            return slugify(`city-tour-${cityName}-${trailNo}`, { lower: true, trim: true });
        case 'de':
            return slugify(`staedtetour-${cityName}-${trailNo}`, { lower: true, trim: true });
        case 'de-ch':
            return slugify(`stadttour-${cityName}-${trailNo}`, { lower: true, trim: true });
        case 'pt-pt':
            return slugify(`visita-a-cidade-${cityName}-${trailNo}`, { lower: true, trim: true });
        case 'es':
            return slugify(`visita-de-la-ciudad-${cityName}-${trailNo}`, { lower: true, trim: true });
        case 'fr':
            return slugify(`tour-de-ville-${cityName}-${trailNo}`, { lower: true, trim: true });
    }
}

export function createTermSlug(name, lang: keyof typeof WPMLanguageCodeMap) {
    return slugify(name + (lang == DEFAULT_LANGUAGE_CODE ? '' : `-${WPMLSlugPostfixMap[lang]}`), {
        lower: true,
        trim: true,
    });
}

export function roundHalf(num) {
    return Math.round(num * 2) / 2;
}

/**
 * Same as Promise.all(items.map(item => task(item))), but it waits for
 * the first {batchSize} promises to finish before starting the next batch.
 *
 * @template A
 * @template B
 * @param {function(A): B} task The task to run for each item.
 * @param {A[]} items Arguments to pass to the task for each call.
 * @param {int} batchSize
 * @returns {Promise<B[]>}
 */
export async function promiseAllInBatches(task, items, batchSize) {
    let position = 0;
    let results: any[] = [];
    while (position < items.length) {
        const itemsForBatch = items.slice(position, position + batchSize);
        results = [...results, ...(await Promise.all(itemsForBatch.map((item) => task(item))))];
        position += batchSize;
    }
    return results;
}

export function isValidLangQuery(query: string): boolean {
    if (!query) return true;
    const langs = query.split(',');
    return langs.every((l) => WPMLanguageCodeMap[l]);
}
