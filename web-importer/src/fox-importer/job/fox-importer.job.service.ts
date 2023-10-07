import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, FoxCollection } from '@foxtrail-backend/directus';
import { transformJob } from './fox-importer.job.mapper';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';
import { Post, WoocommerceService } from '@foxtrail-backend/woocommerce';

@Injectable()
export class FoxJobImporterService {
    private readonly logger = new Logger(FoxJobImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly foxImporterMediaService: ImporterMediaService,
    ) {}

    async importJobs(ids: string[]): Promise<Post[]> {
        const results: Post[] = [];
        for (const id of ids) {
            const job = await this.directusService.getJob(parseInt(id));
            await this.directusService.resolveFiles([job]);
            if (!job || !job.id) throw new Error(`Job is undefined or has no id!`);
            const existingPost = await this.woocommerceService.getPostsByDirectusID(job.id, 'jobs');
            const post = transformJob(job);
            const importedPost = await this.runImport(job, post, existingPost);
            results.push(importedPost);
        }
        return results;
    }

    private async runImport(job: FoxCollection['jobs'], post: Post, existingPost: Post[] | null) {
        if (Array.isArray(existingPost)) {
            if (existingPost.length > 1) this.logger.error(`Found multiple posts with directus_id ${job.id}!`);
            this.logger.log(`Updating existing job as post "${existingPost[0].title}"`);
            post.id = existingPost[0].id;
            await this.importPostImages(job, post, existingPost[0]);
            const updatedPost = await this.woocommerceService.updatePost(post, 'jobs');
            return updatedPost;
        } else {
            this.logger.log(`Creating new job as post "${job.title}"`);
            await this.importPostImages(job, post);
            const createdPost = await this.woocommerceService.createPost(post, 'jobs');
            return createdPost;
        }
    }

    private async importPostImages(job, post: Post, existingPost: Post | null = null) {
        return;
    }
}
