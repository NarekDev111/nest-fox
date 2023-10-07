import { TypeOf } from '@directus/sdk';
import { createTermSlug } from '../fox-importer.helpers';
import { WPMLanguageCodeMap } from '../fox-importer.wpml';
import { FoxComponents, FoxCollection } from '@foxtrail-backend/directus';
import { Term } from '@foxtrail-backend/woocommerce';

export function transformCity(city: TypeOf<FoxCollection, 'sales_city'>, lang: keyof typeof WPMLanguageCodeMap, translation_of: number | undefined = undefined): Term {
    const translation = (city.translations as FoxComponents['schemas']['ItemsSalesCityTranslations'][]).find((t) => t.languages_code === WPMLanguageCodeMap[lang]);
    const term: Term = {
        name: translation?.title?.trim() ?? '',
        slug: createTermSlug(translation?.title, lang),
        description: undefined,
        lang: lang,
        acf: {
            directus_id: city.id,
        },
    };
    if (translation_of) {
        term.translation_of = translation_of;
    }
    return term;
}
