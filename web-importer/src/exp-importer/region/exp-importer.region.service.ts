import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, ExpCollection } from '@foxtrail-backend/directus';
import { Category, WoocommerceService } from '@foxtrail-backend/woocommerce';
import { DEFAULT_LANGUAGE_CODE, WPMLanguageCodeMap } from '../exp-importer.wpml';
import { transformRegion } from './exp-importer.region.mapper';
import { ExpCountryImporterService } from '../country/exp-importer.country.service';
import { moveDefaultLangToFirst } from '../exp-importer.helpers';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';

@Injectable()
export class ExpRegionImporterService {
    private readonly logger = new Logger(ExpRegionImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly countryImporterService: ExpCountryImporterService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    async importRegion(id: number, langsToImport: (keyof typeof WPMLanguageCodeMap)[]): Promise<Category[]> {
        const results: Category[] = [];
        const region = await this.directusService.getRegion(id);
        await this.directusService.resolveFiles([region]);

        // move default language to front of array, so it will be imported first
        langsToImport = moveDefaultLangToFirst(langsToImport);

        const parentCategories = await this.countryImporterService.importCountry((region.country as ExpCollection['country']).identifier, langsToImport);

        let existingDefaultCategory = await this.woocommerceService.getTermByDirectusID(region.id.toString(), 'products/categories', DEFAULT_LANGUAGE_CODE);
        for (const lang of langsToImport) {
            const existingCategoryTranslation = await this.woocommerceService.getTermByDirectusID(region.id.toString(), 'products/categories', lang);
            let tid = null;
            if (existingDefaultCategory) {
                if (existingCategoryTranslation) {
                    if (existingCategoryTranslation[0].id !== existingDefaultCategory[0].id) {
                        tid = existingDefaultCategory[0].id;
                    }
                } else {
                    tid = existingDefaultCategory[0].id;
                }
            }
            const category = transformRegion(
                region,
                parentCategories.find((cat) => cat.lang == lang).id,
                lang,
                tid, // if we're updating, don't set the translationOf
            );
            const importedCategory = await this.runImport(region, category, lang, existingCategoryTranslation);

            if (!existingDefaultCategory) existingDefaultCategory = [importedCategory];
            results.push(importedCategory);
        }
        return results;
    }

    private async runImport(region: ExpCollection['region'], category: Category, language: keyof typeof WPMLanguageCodeMap, existingCategory: Category[]) {
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
            await this.importRegionImages(region, category);
            const createdCategory = await this.woocommerceService.createTerm(category, 'product_cat', 'products/categories');
            createdCategory.lang = category.lang; // wpml is not injecting meta into crud responses
            return createdCategory;
        }
    }

    private async importRegionImages(region: ExpCollection['region'], category: Category, existingCategory: Category = null) {
        await this.wcImporterMediaService.updateWooCommerceObjectImage(
            region.id.toString() || 'unnamed region',
            category,
            'image',
            region,
            'header_image',
            existingCategory,
            null,
            null,
            true,
        );
    }
}
