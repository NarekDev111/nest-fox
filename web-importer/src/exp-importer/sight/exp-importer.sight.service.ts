import { Injectable, Logger } from '@nestjs/common';
import slugify from 'slugify';
import { DirectusService, ExpCollection } from '@foxtrail-backend/directus';
import { Post, WoocommerceService } from '@foxtrail-backend/woocommerce';
import { createTrailSlug } from '../exp-importer.helpers';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';

@Injectable()
export class ExpSightImporterService {
    private readonly logger = new Logger(ExpSightImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    async importSight(seoDescriptionId: string): Promise<Post[]> {
        const results: Post[] = [];
        const seoDescription = await this.directusService.getSeoDescription(seoDescriptionId);
        const eventLocationId = (seoDescription.event_location as ExpCollection['event_location']).uuid;
        const eventLocation = await this.directusService.getEventLocation(eventLocationId);
        await this.directusService.resolveFiles([eventLocation]);
        const trail: ExpCollection['trails'] = (await this.directusService.getTrailByEventLocation(eventLocationId)).data[0];
        await this.directusService.resolveFiles([trail]);
        const existingPost = await this.woocommerceService.getPostsByDirectusID(eventLocationId, 'sights');
        const eventLocationName = (eventLocation.translations_2 as ExpCollection['event_location_translations2'][]).find((t) => t.languages_code == 'en-US')?.name;
        const cityName = ((trail.city as ExpCollection['city']).translations as ExpCollection['city_translations'][]).find((t) => t.languages_code == 'en-US')?.name;
        const post: Post = {
            type: 'sights',
            title: eventLocationName,
            slug: `${slugify(cityName, { lower: true, trim: true })}-${slugify(eventLocationName, {
                lower: true,
                trim: true,
            })}`, // TODO add language code at the end if not default language
            featured_media: undefined,
            status: 'publish',
            content: seoDescription.seo_description,
            acf: {
                directus_id: eventLocationId,
                maps_location: `${cityName}, ${eventLocationName}`,
                coordinates: eventLocation.location,
                trail_slug: '/' + createTrailSlug(cityName, trail.identifier, 'en'),
                sights_city: cityName,
                trail_wallpaper: undefined,
            },
        };
        results.push(await this.runImport(eventLocation, trail, post, existingPost));
        return results;
    }

    private async runImport(eventLocation: ExpCollection['event_location'], trail: ExpCollection['trails'], post: Post, existingPost: Post[]) {
        if (Array.isArray(existingPost)) {
            if (existingPost.length > 1) this.logger.error(`Found multiple posts with directus_id ${post.id}!`);
            this.logger.log(`Updating existing sight post ${existingPost[0].title['rendered']}`);
            post.id = existingPost[0].id;
            await this.importSightImages(eventLocation, trail, post, existingPost[0]);
            const updatedPost = await this.woocommerceService.updatePost(post, 'sights');
            return updatedPost;
        } else {
            this.logger.log(`Creating new sight ${eventLocation.uuid} [${post.lang}]`);
            await this.importSightImages(eventLocation, trail, post);
            const createdPost = await this.woocommerceService.createPost(post, 'sights');
            return createdPost;
        }
    }

    private async importSightImages(eventLocation: ExpCollection['event_location'], trail: ExpCollection['trails'], post: Post, existingPost: Post = null) {
        await this.wcImporterMediaService.updateWooCommerceObjectImage('sight', post, 'featured_media', eventLocation, 'search_image', existingPost);
        await this.wcImporterMediaService.updateACFImage('sight', post, 'trail_wallpaper', trail, 'header_image', existingPost);
        //await this.wcImporterMediaService.updateACFImage('sight', post, 'additional_image', eventLocation, 'header_image', existingPost);
    }
}
