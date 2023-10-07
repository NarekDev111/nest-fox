import { ExpCollection, ExpComponents } from '@foxtrail-backend/directus';
import { Term } from '@foxtrail-backend/woocommerce';
import { DEFAULT_LANGUAGE_CODE, DirectusLanguageCode, WPMLanguageCodeMap } from '../exp-importer.wpml';
import { createTermSlug } from '../exp-importer.helpers';

export function transformCity(city: ExpCollection['city'], lang: keyof typeof WPMLanguageCodeMap, translation_of = null): Term {
    const defaultTranslation = (city.translations as ExpComponents['schemas']['ItemsCityTranslations'][]).find(
        (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[DEFAULT_LANGUAGE_CODE],
    );
    const translation = (city.translations as ExpComponents['schemas']['ItemsCityTranslations'][]).find(
        (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[lang],
    );
    const term: Term = {
        name: translation.name.trim(),
        slug: createTermSlug(defaultTranslation.name, lang),
        description: null,
        lang: lang,
        acf: {
            directus_id: city.id.toString(),
        },
    };
    if (translation_of) {
        term.translation_of = translation_of;
    }
    return term;
}
