import { WPMLanguageCodeMap } from '../fox-importer.wpml';
import { Post } from '@foxtrail-backend/woocommerce';

export function transformPartner(partner, lang: keyof typeof WPMLanguageCodeMap, roles: string[]): Post {
    return {
        type: 'partner',
        title: partner?.name?.trim() ?? '',
        status: 'publish',
        partner_category: [],
        acf: {
            directus_id: partner.id,
            partner_link: partner.backlink_url,
            // partner_logo: undefined,
            start_page: partner.published_channels?.includes('start_page'),
            partner_page: partner.published_channels?.includes('website'),
        },
    };
}
