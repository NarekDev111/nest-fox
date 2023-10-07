import { TrailValidatorType } from '../fox-validator';
import { WebsiteValidationError, WebsiteValidationWarning } from '../fox-validator.helper';
import { FoxCollection } from '@foxtrail-backend/directus';

export const TrailValidator: TrailValidatorType = {
    name: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value) {
                res.push(new WebsiteValidationError('Trail has no name'));
            }
        }
    },
    sales_city: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value || !value.length) {
                res.push(new WebsiteValidationError('Trail has no sales city'));
            }
        }
    },
    price_category: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value) {
                res.push(new WebsiteValidationError('Trail has no price category'));
            }
        }
    },
    playtime_dec: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value) {
                res.push(new WebsiteValidationError('Trail has no playtime'));
            }
        }
    },
    trail_languages: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value || !value.length) {
                res.push(new WebsiteValidationError('Trail has no trail languages'));
            }
        }
    },
    translations: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value || !value.length) {
                res.push(new WebsiteValidationError('Trail has no translations'));
            } else {
                const translationsIds = value.map((t: FoxCollection['trails_translations']) => t.languages_id);
                const missingTranslations = langsToImport.filter((l) => !translationsIds.includes(l));
                if (missingTranslations.length) {
                    res.push(new WebsiteValidationError(`Import was requested for ${langsToImport} but trail is missing translations for ${missingTranslations.join(', ')}`));
                } else {
                    const translationsToImport = value.filter((t: FoxCollection['trails_translations']) =>
                        langsToImport.includes(t.languages_id as string),
                    ) as FoxCollection['trails_translations'][];
                    if (translationsToImport.some((t) => !t.name)) {
                        res.push(new WebsiteValidationError('Trail has a translation with no name'));
                    }
                    if (translationsToImport.some((t) => !t.description)) {
                        res.push(new WebsiteValidationError('Trail has a translation with no description'));
                    }
                    if (translationsToImport.some((t) => !t.arrival_instructions)) {
                        res.push(new WebsiteValidationError('Trail has a translation with no arrival instructions'));
                    }
                    if (translationsToImport.some((t) => !t.start_location)) {
                        res.push(new WebsiteValidationError('Trail has a translation with no start location'));
                    }
                    if (translationsToImport.some((t) => !t.finish_location)) {
                        res.push(new WebsiteValidationError('Trail has a translation with no finish location'));
                    }
                    if (translationsToImport.some((t) => !t.route)) {
                        res.push(new WebsiteValidationError('Trail has a translation with no route'));
                    }
                }
            }
        }
    },
    tile_image_file: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value) {
                res.push(new WebsiteValidationError('Trail has no tile image'));
            }
        }
    },
    image_gallery_files: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value || !value.length) {
                res.push(new WebsiteValidationError('Trail needs at least one image in the image gallery'));
            }
        }
    },
    start_rule: async (trail, value, langsToImport, trailLangs, res) => {
        if (hasWebUserRole(trail)) {
            if (!value || !value.length) {
                res.push(new WebsiteValidationWarning('Trail has no start rules'));
            }
        }
    },
};

function hasWebUserRole(trail: FoxCollection['trails']): boolean {
    return trail.booking_roles?.some((role) => role === '2');
}
