import { TrailValidatorType } from '../exp-validator';
import { AppValidationError, AppValidationWarning, WebsiteValidationError, WebsiteValidationWarning } from '../exp-validator.helper';
import { ExpComponents } from '@foxtrail-backend/directus';

export const TrailValidator: TrailValidatorType = {
    start_location_image: async (trail, value, langsToImport, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationWarning('Start location image is missing'));
            res.push(new AppValidationError('Start location image is missing'));
        }
    },
    route_length: async (trail, value, langsToImport, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationWarning('Route length is missing'));
            res.push(new AppValidationError('Route length is missing'));
        }
    },
    languages: async (trail, value, langsToImport, trailLangs, res) => {
        // check if there is at least one translation
        if (!value || value.length == 0) {
            res.push(new WebsiteValidationError('Must have at least one language'));
            res.push(new AppValidationError('Must have at least one language'));
        }
    },
    translations_3: async (trail, value, langsToImport, trailLangs, res) => {
        if (
            !allOrNone(
                value
                    .filter((transl: ExpComponents['schemas']['ItemsTrailsTranslations3']) => trailLangs.includes(transl.languages_code as string))
                    .map((transl: ExpComponents['schemas']['ItemsTrailsTranslations3']) => transl.city_description),
                STRING_EXISTS_PREDICATE,
            )
        ) {
            res.push(new WebsiteValidationError('City description is missing in some translations'));
            res.push(new AppValidationError('City description is missing in some translations'));
        }
        if (
            !allOrNone(
                value
                    .filter((transl: ExpComponents['schemas']['ItemsTrailsTranslations3']) => trailLangs.includes(transl.languages_code as string))
                    .map((transl: ExpComponents['schemas']['ItemsTrailsTranslations3']) => transl.short_description),
                STRING_EXISTS_PREDICATE,
            )
        ) {
            res.push(new WebsiteValidationError('Short description is missing in some translations'));
            res.push(new AppValidationError('Short description is missing in some translations'));
        }
        if (
            !allOrNone(
                value
                    .filter((transl: ExpComponents['schemas']['ItemsTrailsTranslations3']) => trailLangs.includes(transl.languages_code as string))
                    .map((transl: ExpComponents['schemas']['ItemsTrailsTranslations3']) => transl.city_name_suffix),
                STRING_EXISTS_PREDICATE,
            )
        ) {
            res.push(new WebsiteValidationError('City name suffix is missing in some translations'));
            res.push(new AppValidationError('City name suffix is missing in some translations'));
        }
        if (
            !allOrNone(
                value
                    .filter((transl: ExpComponents['schemas']['ItemsTrailsTranslations3']) => trailLangs.includes(transl.languages_code as string))
                    .map((transl: ExpComponents['schemas']['ItemsTrailsTranslations3']) => transl.notes),
                STRING_EXISTS_PREDICATE,
            )
        ) {
            res.push(new WebsiteValidationError('Notes are missing in some translations'));
            res.push(new AppValidationError('Notes are missing in some translations'));
        }
    },
    translations_5: async (trail, value, langsToImport, trailLangs, res) => {
        const fallbackLang = (
            ((trail.city as ExpComponents['schemas']['ItemsCity']).region as ExpComponents['schemas']['ItemsRegion']).main_language as ExpComponents['schemas']['ItemsLanguages']
        ).code;
        const fallbackTransl = value.find(
            (transl: ExpComponents['schemas']['ItemsTrailsTranslations']) => transl.languages_code == fallbackLang,
        ) as ExpComponents['schemas']['ItemsTrailsTranslations'];
        if (!fallbackTransl) {
            res.push(new WebsiteValidationError(`Translation group 5 is missing the fallback translation (region language ${fallbackLang})`));
            res.push(new AppValidationError(`Translation group 5 is missing the fallback translation (region language ${fallbackLang})`));
        } else {
            if (!fallbackTransl.startlocation_name) {
                res.push(new WebsiteValidationError(`Start location name is missing the fallback translation (region language ${fallbackLang})`));
                res.push(new AppValidationError(`Start location name is missing the fallback translation (region language ${fallbackLang})`));
            }
            if (!fallbackTransl.startlocation_address) {
                res.push(new WebsiteValidationError(`Start location address is missing the fallback translation (region language ${fallbackLang})`));
                res.push(new AppValidationError(`Start location address is missing the fallback translation (region language ${fallbackLang})`));
            }
        }
    },
    highlight_locations: async (trail, value, langsToImport, trailLangs, res) => {
        if (!value || value.length < 2) {
            res.push(new AppValidationError(`Requires at least two highlight locations`));
            res.push(new WebsiteValidationError(`Requires at least two highlight locations`));
        }
        const fallbackLang = (
            ((trail.city as ExpComponents['schemas']['ItemsCity']).region as ExpComponents['schemas']['ItemsRegion']).main_language as ExpComponents['schemas']['ItemsLanguages']
        ).code;
        value.forEach((location: ExpComponents['schemas']['ItemsTrailsLocationHighlight']) => {
            const locationTranslations = (location.event_location_uuid as ExpComponents['schemas']['ItemsEventLocation'])
                .translations_2 as ExpComponents['schemas']['ItemsEventLocationTranslations2'][];
            const fallbackTranslation = locationTranslations.find((translation) => translation.languages_code == fallbackLang);
            if (!fallbackTranslation) {
                res.push(new AppValidationError(`Highlight location ${location.id} is missing translations for the region language (${fallbackLang})`));
                res.push(new WebsiteValidationError(`Highlight location ${location.id} is missing translations for the region language (${fallbackLang})`));
            } else {
                if (!fallbackTranslation.name) {
                    res.push(new AppValidationError(`Highlight location ${location.id} is missing a name translation for the region language (${fallbackLang})`));
                    res.push(new WebsiteValidationError(`Highlight location ${location.id} is missing name translation for the region language (${fallbackLang})`));
                }
            }
        });
    },
};

const STRING_EXISTS_PREDICATE = (s: string) => !!s;

function allOrNone<T>(arr: T[], predicate: (item: T) => boolean): boolean {
    return arr.every(predicate) || arr.every((item) => !predicate(item));
}
