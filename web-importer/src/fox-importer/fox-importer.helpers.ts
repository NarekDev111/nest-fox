import moment from 'moment/moment';
import slugify from 'slugify';
import { DEFAULT_LANGUAGE_CODE, WPMLanguageCodeMap, WPMLSlugPostfixMap } from './fox-importer.wpml';
import { FoxCollection, FoxComponents } from '@foxtrail-backend/directus';

export function getActivePriceSegments(ticketProduct: FoxCollection['ticket_product'], priceCategory: string): FoxCollection['ticket_price'][] {
    const currentTime = moment();
    return (ticketProduct.prices as FoxCollection['ticket_price'][]).filter((p) => {
        if (p.price_category != priceCategory) return false;
        if (!p.valid_from && !p.valid_until) return true;
        if (!p.valid_from) return currentTime <= moment(p.valid_until);
        if (!p.valid_until) return moment(p.valid_from) <= currentTime;
        return moment(p.valid_from) <= currentTime && currentTime <= moment(p.valid_until);
    });
}

export function getActiveAndFuturePriceSegments(
    ticketProduct: FoxComponents['schemas']['ItemsTicketProduct'],
    priceCategory: string,
): FoxComponents['schemas']['ItemsTicketPrice'][] {
    const currentTime = moment();
    return (ticketProduct.prices as FoxComponents['schemas']['ItemsTicketPrice'][]).filter((p) => {
        if (p.price_category != priceCategory) return false;
        if (p.valid_until) return moment(p.valid_until) >= currentTime;
        return true;
    });
}

export function moveDefaultLangToFirst(langsToImport: (keyof typeof WPMLanguageCodeMap)[]) {
    langsToImport = langsToImport.filter((item) => item !== DEFAULT_LANGUAGE_CODE);
    langsToImport.unshift(DEFAULT_LANGUAGE_CODE);
    return langsToImport;
}

export function createTermSlug(name, lang: keyof typeof WPMLanguageCodeMap) {
    return slugify(name + (lang == DEFAULT_LANGUAGE_CODE ? '' : `-${WPMLSlugPostfixMap[lang]}`), { lower: true, trim: true });
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
