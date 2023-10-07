import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, ExpCollection, ExpComponents } from '@foxtrail-backend/directus';
import { Term, WoocommerceService } from '@foxtrail-backend/woocommerce';
import { DEFAULT_LANGUAGE_CODE, DirectusLanguageCode, WPMLanguageCodeMap } from '../exp-importer.wpml';
import { transformCity } from './exp-importer.city.mapper';
import { moveDefaultLangToFirst } from '../exp-importer.helpers';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';

@Injectable()
export class ExpCityImporterService {
    private readonly logger = new Logger(ExpCityImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    async importCity(id: number, langsToImport: (keyof typeof WPMLanguageCodeMap)[]): Promise<Term[]> {
        const results: Term[] = [];
        const city = await this.directusService.getCity(id);
        await this.directusService.resolveFiles([city]);

        // move default language to front of array, so it will be imported first
        langsToImport = moveDefaultLangToFirst(langsToImport);

        let existingDefaultTerm = await this.woocommerceService.getTermByDirectusID(city.id.toString(), 'products/tags', DEFAULT_LANGUAGE_CODE);
        for (const lang of langsToImport) {
            const existingTermTranslation = await this.woocommerceService.getTermByDirectusID(city.id.toString(), 'products/tags', lang);
            let tid = null;
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

    private async runImport(city: ExpCollection['city'], term: Term, language: keyof typeof WPMLanguageCodeMap, existingTerm: Term[]) {
        if (Array.isArray(existingTerm)) {
            if (existingTerm.length > 1) this.logger.error(`Found multiple terms with directus_id ${city.id} and language ${term.lang}!`);
            this.logger.log(`Updating existing city as product tag "${existingTerm[0].name}" [${existingTerm[0].lang}]`);
            term.id = existingTerm[0].id;
            await this.importCityImages(city, term, existingTerm[0]);
            const updatedTerm = await this.woocommerceService.updateTerm(term, 'product_tag', 'products/tags');
            updatedTerm.lang = term.lang; // wpml is not injecting meta into crud responses
            return updatedTerm;
        } else {
            const cityName = (city.translations as ExpComponents['schemas']['ItemsCityTranslations'][]).find(
                (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[term.lang],
            )?.name;
            this.logger.log(`Creating new city as product tag "${cityName}" [${term.lang}]`);
            await this.importCityImages(city, term);
            const createdTerm = await this.woocommerceService.createTerm(term, 'product_tag', 'products/tags');
            createdTerm.lang = term.lang; // wpml is not injecting meta into crud responses
            return createdTerm;
        }
    }

    private async importCityImages(city: ExpCollection['city'], term: Term, existingTerm: Term = null) {
        return;
    }
}
