import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, FoxCollection, FoxGetRegionResult } from '@foxtrail-backend/directus';
import { TypeOf } from '@directus/sdk';
import { moveDefaultLangToFirst } from '../fox-importer.helpers';
import { DEFAULT_LANGUAGE_CODE, WPMLanguageCodeMap } from '../fox-importer.wpml';
import { transformRegion } from './fox-importer.region.mapper';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';
import { Category, WoocommerceService } from '@foxtrail-backend/woocommerce';

@Injectable()
export class FoxRegionImporterService {
    private readonly logger = new Logger(FoxRegionImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    async importRegion(id: number, langsToImport: (keyof typeof WPMLanguageCodeMap)[]): Promise<Category[]> {
        const results: Category[] = [];
        const region = (await this.directusService.getRegion(id)) as FoxGetRegionResult;
        if (!region || !region.id) throw new Error(`Region or id is undefined.`);
        await this.directusService.resolveFiles([region]);
        langsToImport = moveDefaultLangToFirst(langsToImport);
        let existingDefaultCategory = await this.woocommerceService.getTermByDirectusID(region.id.toString(), 'products/categories', DEFAULT_LANGUAGE_CODE);
        for (const lang of langsToImport) {
            const existingCategoryTranslation = await this.woocommerceService.getTermByDirectusID(region.id.toString(), 'products/categories', lang);
            let tid: number | undefined = undefined;
            if (existingDefaultCategory) {
                if (existingCategoryTranslation) {
                    if (existingCategoryTranslation[0].id !== existingDefaultCategory[0].id) {
                        tid = existingDefaultCategory[0].id;
                    }
                } else {
                    tid = existingDefaultCategory[0].id;
                }
            }
            const category = transformRegion(region, lang, tid);
            const importedCategory = await this.runImport(region, category, lang, existingCategoryTranslation);

            if (!existingDefaultCategory) existingDefaultCategory = [importedCategory];
            results.push(importedCategory);
        }

        return results;
    }

    private async runImport(region: TypeOf<FoxCollection, 'sales_region'>, category: Category, language: keyof typeof WPMLanguageCodeMap, existingCategory: Category[] | null) {
        if (Array.isArray(existingCategory)) {
            if (existingCategory.length > 1) this.logger.error(`Found multiple terms with directus_id ${region.id} and language ${category.lang}!`);
            this.logger.log(`Updating existing region as product category "${existingCategory[0].name}" [${existingCategory[0].lang}]`);
            category.id = existingCategory[0].id;
            await this.importRegionImages(region, category, existingCategory[0]);
            const updatedCategory = await this.woocommerceService.updateTerm(category, 'product_cat', 'products/categories');
            updatedCategory.lang = category.lang; // wpml is not injecting meta into crud responses
            return updatedCategory;
        } else {
            this.logger.log(`Creating new region as product category "${region.id}" [${category.lang}]`);
            /*if (language == DEFAULT_LANGUAGE_CODE) {
                await this.importRegionImages(region, category);
            } else {
                delete category.image;
            }*/
            await this.importRegionImages(region, category);
            const createdCategory = await this.woocommerceService.createTerm(category, 'product_cat', 'products/categories');
            createdCategory.lang = category.lang; // wpml is not injecting meta into crud responses
            return createdCategory;
        }
    }

    private async importRegionImages(region: TypeOf<FoxCollection, 'sales_region'>, category: Category, existingCategory: Category | null = null) {
        await this.wcImporterMediaService.updateWooCommerceObjectImage(
            region.name || 'unnamed region',
            category,
            'image',
            region,
            'image_file',
            existingCategory,
            null,
            null,
            true,
        );
        await this.wcImporterMediaService.updateACFImage(region.name || 'unnamed region', category, 'image_header', region, 'image_header_file', existingCategory);
    }
}
