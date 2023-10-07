import { DEFAULT_LANGUAGE_CODE, DirectusLanguageCode, WPMLanguageCodeMap } from '../exp-importer.wpml';
import { ExpCollection, ExpComponents } from '@foxtrail-backend/directus';
import { Category } from '@foxtrail-backend/woocommerce';
import { createTermSlug } from '../exp-importer.helpers';

export function transformCountry(country: ExpCollection['country'], lang: keyof typeof WPMLanguageCodeMap, translation_of = null): Category {
    const defaultTranslation = (country.translations as ExpComponents['schemas']['ItemsCountryTranslations'][]).find(
        (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[DEFAULT_LANGUAGE_CODE],
    );
    const translation = (country.translations as ExpComponents['schemas']['ItemsCountryTranslations'][]).find(
        (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[lang],
    );
    const category: Category = {
        name: translation.name.trim(),
        slug: createTermSlug(defaultTranslation.name, lang),
        image: null,
        lang: lang,
        acf: {
            directus_id: country.identifier,
        },
    };
    if (translation_of) {
        category.translation_of = translation_of;
    }
    return category;
}
