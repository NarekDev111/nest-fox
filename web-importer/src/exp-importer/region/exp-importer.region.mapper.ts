import { DEFAULT_LANGUAGE_CODE, DirectusLanguageCode, WPMLanguageCodeMap } from '../exp-importer.wpml';
import { ExpCollection, ExpComponents } from '@foxtrail-backend/directus';
import { Category } from '@foxtrail-backend/woocommerce';
import { createTermSlug } from '../exp-importer.helpers';

export function transformRegion(region: ExpCollection['region'], parent: number, lang: keyof typeof WPMLanguageCodeMap, translation_of = null): Category {
    const defaultTranslation = (region.translations as ExpComponents['schemas']['ItemsRegionTranslations'][]).find(
        (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[DEFAULT_LANGUAGE_CODE],
    );
    const translation = (region.translations as ExpComponents['schemas']['ItemsRegionTranslations'][]).find(
        (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[lang],
    );
    const category: Category = {
        name: translation.name.trim(),
        slug: createTermSlug(defaultTranslation.name, lang),
        description: translation.description,
        lang: lang,
        image: null,
        parent: parent,
        acf: {
            directus_id: region.id.toString(),
        },
    };
    if (translation_of) {
        category.translation_of = translation_of;
    }
    return category;
}
