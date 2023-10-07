import { WPMLanguageCodeMap } from '../fox-importer.wpml';
import { FoxCollection } from '@foxtrail-backend/directus';
import { Category } from '@foxtrail-backend/woocommerce';

export function transformRegion(region: FoxCollection['sales_region'], lang: keyof typeof WPMLanguageCodeMap, translation_of: number | undefined = undefined): Category {
    const translation = (region.translations as FoxCollection['sales_region_translations'][]).find((t) => t.languages_code === WPMLanguageCodeMap[lang]);
    const category: Category = {
        name: translation?.title ?? '',
        image: undefined,
        lang: lang,
        acf: {
            directus_id: region.id,
            image_header: '',
            start_page: region?.published_channels?.includes('start_page'),
        },
    };
    if (translation_of) {
        category.translation_of = translation_of;
    }
    return category;
}
