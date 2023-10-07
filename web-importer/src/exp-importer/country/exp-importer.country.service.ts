import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, ExpCollection } from '@foxtrail-backend/directus';
import { Category, WoocommerceService } from '@foxtrail-backend/woocommerce';
import { DEFAULT_LANGUAGE_CODE, WPMLanguageCodeMap } from '../exp-importer.wpml';
import { transformCountry } from './exp-importer.country.mapper';
import { moveDefaultLangToFirst } from '../exp-importer.helpers';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';

@Injectable()
export class ExpCountryImporterService {
    private readonly logger = new Logger(ExpCountryImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    async importCountry(identifier: string, langsToImport: (keyof typeof WPMLanguageCodeMap)[]): Promise<Category[]> {
        const results: Category[] = [];
        const country = await this.directusService.getCountry(identifier);
        await this.directusService.resolveFiles([country]);

        // move default language to front of array, so it will be imported first
        langsToImport = moveDefaultLangToFirst(langsToImport);

        let existingDefaultCategory = await this.woocommerceService.getTermByDirectusID(country.identifier, 'products/categories', DEFAULT_LANGUAGE_CODE);
        for (const lang of langsToImport) {
            const existingCategoryTranslation = await this.woocommerceService.getTermByDirectusID(country.identifier, 'products/categories', lang);
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
            const category = transformCountry(
                country,
                lang,
                tid, // if we're updating, don't set the translationOf
            );
            const importedCategory = await this.runImport(country, category, lang, existingCategoryTranslation);

            if (!existingDefaultCategory) existingDefaultCategory = [importedCategory];
            results.push(importedCategory);
        }

        return results;
    }

    private async runImport(country: ExpCollection['country'], category: Category, language: keyof typeof WPMLanguageCodeMap, existingCategory: Category[]) {
        if (Array.isArray(existingCategory)) {
            if (existingCategory.length > 1) this.logger.error(`Found multiple countries with directus_id ${country.identifier} and language ${category.lang}!`);
            this.logger.log(`Updating existing country as product category "${existingCategory[0].name}" [${existingCategory[0].lang}]`);
            category.id = existingCategory[0].id;
            await this.importCountryImages(country, category, existingCategory[0]);
            const updatedCategory = await this.woocommerceService.updateTerm(category, 'product_cat', 'products/categories');
            updatedCategory.lang = category.lang; // wpml is not injecting meta into crud responses
            return updatedCategory;
        } else {
            this.logger.log(`Creating new country as product category "${country.identifier}" [${category.lang}]`);
            await this.importCountryImages(country, category);
            const createdCategory = await this.woocommerceService.createTerm(category, 'product_cat', 'products/categories');
            createdCategory.lang = category.lang; // wpml is not injecting meta into crud responses
            return createdCategory;
        }
    }

    private async importCountryImages(country: ExpCollection['country'], category: Category, existingCategory: Category = null) {
        await this.wcImporterMediaService.updateWooCommerceObjectImage(
            country.identifier || 'unnamed country',
            category,
            'image',
            country,
            'header_image',
            existingCategory,
            null,
            null,
            true,
        );
    }
}
