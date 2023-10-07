import { Post } from '@foxtrail-backend/woocommerce';
import { ExpCollection } from '@foxtrail-backend/directus';

export function transformPartner(partner: ExpCollection['partner']): Post {
    const post: Post = {
        type: 'partner',
        title: partner.name.trim(),
        featured_media: null, // will be filled by partner importer service
        status: 'publish',
        acf: {
            directus_id: partner.id,
            partner_link: partner.link,
        },
    };
    return post;
}
