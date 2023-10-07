import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, FoxCollection, FoxComponents, FoxGetCityResult } from '@foxtrail-backend/directus';
import { TypeOf } from '@directus/sdk';
import { moveDefaultLangToFirst } from '../fox-importer.helpers';
import { DEFAULT_LANGUAGE_CODE, DirectusLanguageCode, WPMLanguageCodeMap } from '../fox-importer.wpml';
import { transformCity } from './fox-importer.city.mapper';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';
import { Term, WoocommerceService } from '@foxtrail-backend/woocommerce';

@Injectable()
export class FoxCityImporterService {
    private readonly logger = new Logger(FoxCityImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly foxImporterMediaService: ImporterMediaService,
    ) {}

    async importCity(id: number, langsToImport: (keyof typeof WPMLanguageCodeMap)[]): Promise<Term[]> {
        const results: Term[] = [];
        const city = (await this.directusService.getCity(id)) as FoxGetCityResult;
        await this.directusService.resolveFiles([city]);
        if (!city || !city.id) throw new Error(`City is undefined or has no id!`);
        let existingDefaultTerm = await this.woocommerceService.getTermByDirectusID(city.id.toString(), 'products/tags', DEFAULT_LANGUAGE_CODE);
        langsToImport = moveDefaultLangToFirst(langsToImport);
        for (const lang of langsToImport) {
            const existingTermTranslation = await this.woocommerceService.getTermByDirectusID(city.id.toString(), 'products/tags', lang);
            let tid: number | undefined;
            if (existingDefaultTerm) {
                if (existingTermTranslation) {
                    if (existingTermTranslation[0].id !== existingDefaultTerm[0].id) {
                        tid = existingDefaultTerm[0].id;
                    }
                } else {
                    tid = existingDefaultTerm[0].id;
                }
            }
            const term = transformCity(city, lang, tid);
            const importedTerm = await this.runImport(city, term, lang, existingTermTranslation);

            if (!existingDefaultTerm) existingDefaultTerm = [importedTerm];
            results.push(importedTerm);
        }
        return results;
    }

    private async runImport(city: TypeOf<FoxCollection, 'sales_city'>, term: Term, language: keyof typeof WPMLanguageCodeMap, existingTerm: Term[] | null) {
        if (Array.isArray(existingTerm)) {
            if (existingTerm.length > 1) this.logger.error(`Found multiple terms with directus_id ${city.id} and language ${term.lang}!`);
            this.logger.log(`Updating existing city as product tag "${existingTerm[0].name}" [${existingTerm[0].lang}]`);
            term.id = existingTerm[0].id;
            await this.importCityImages(city, term, existingTerm[0]);
            const updatedTerm = await this.woocommerceService.updateTerm(term, 'product_tag', 'products/tags');
            updatedTerm.lang = term.lang; // wpml is not injecting meta into crud responses
            return updatedTerm;
        } else {
            const cityName = (city.translations as FoxComponents['schemas']['ItemsSalesCityTranslations'][]).find(
                (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[term.lang],
            )?.title;
            this.logger.log(`Creating new city as product tag "${cityName}" [${term.lang}]`);
            /*            if (language == DEFAULT_LANGUAGE_CODE) {
                await this.importCityImages(city, term);
            } else {
                delete term.image;
            }*/
            await this.importCityImages(city, term);
            const createdTerm = await this.woocommerceService.createTerm(term, 'product_tag', 'products/tags');
            createdTerm.lang = term.lang; // wpml is not injecting meta into crud responses
            return createdTerm;
        }
    }

    private async importCityImages(city, term: Term, existingTerm: Term | null = null) {
        return;
    }
}
