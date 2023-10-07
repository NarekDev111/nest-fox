import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, ExpCollection, ExpGetPartnerResult } from '@foxtrail-backend/directus';
import { Post, WoocommerceService } from '@foxtrail-backend/woocommerce';
import { transformPartner } from './exp-importer.partner.mapper';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';

@Injectable()
export class ExpPartnerImporterService {
    private readonly logger = new Logger(ExpPartnerImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    async importPartner(id: string): Promise<Post> {
        const results: Post[] = [];
        const partner = (await this.directusService.getPartner(id)) as ExpGetPartnerResult;
        await this.directusService.resolveFiles([partner]);
        const existingPost = await this.woocommerceService.getPostsByDirectusID(partner.id, 'partner');
        const post = transformPartner(partner);
        results.push(await this.runImport(partner, post, existingPost));
        return results[0];
    }

    async importAllPartners() {
        const partners = (await this.directusService.getAllPartners()).data;
        for (const partner of partners) {
            await this.importPartner(partner.id);
        }
    }

    async removePartner(id: string) {
        const post = await this.woocommerceService.getPostsByDirectusID(id, 'partner');
        if (post) {
            return await this.woocommerceService.deletePost(post[0].id, 'partner');
        } else {
            return 'Category not found';
        }
    }

    async removeAllPartners() {
        const posts = await this.woocommerceService.getAllPosts('partner');
        for (const post of posts) {
            await this.woocommerceService.deletePost(post.id, 'partner');
        }
    }

    private async runImport(partner: ExpCollection['partner'], post: Post, existingPost: Post[]) {
        if (Array.isArray(existingPost)) {
            if (existingPost.length > 1) this.logger.error(`Found multiple posts with directus_id ${post.id}!`);
            this.logger.log(`Updating existing partner post ${existingPost[0].title['rendered']}`);
            post.id = existingPost[0].id;
            await this.importPartnerImages(partner, post, existingPost[0]);
            const updatedPost = await this.woocommerceService.updatePost(post, 'partner');
            return updatedPost;
        } else {
            this.logger.log(`Creating new partner ${partner.name} [${post.lang}]`);
            await this.importPartnerImages(partner, post);
            const createdPost = await this.woocommerceService.createPost(post, 'partner');
            return createdPost;
        }
    }

    private async importPartnerImages(partner, post: Post, existingPost: Post = null) {
        await this.wcImporterMediaService.updateWooCommerceObjectImage(partner.name || 'unnamed partner', post, 'featured_media', partner, 'logo', existingPost);
    }
}
