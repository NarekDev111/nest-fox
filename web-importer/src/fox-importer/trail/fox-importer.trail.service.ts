import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, FoxCollection, FoxGetTrailResult } from '@foxtrail-backend/directus';
import { TypeOf } from '@directus/sdk';
import { moveDefaultLangToFirst, promiseAllInBatches } from '../fox-importer.helpers';
import { FoxCityImporterService } from '../city/fox-importer.city.service';
import { FoxRegionImporterService } from '../region/fox-importer.region.service';
import { FoxPartnerImporterService } from '../partner/fox-importer.partner.service';
import { DEFAULT_LANGUAGE_CODE, WPMLanguageCodeMap } from '../fox-importer.wpml';
import { transformTrail } from './fox-importer.trail.mapper';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';
import { Category, Post, Product, Term, WoocommerceService } from '@foxtrail-backend/woocommerce';

@Injectable()
export class FoxTrailImporterService {
    private readonly logger = new Logger(FoxTrailImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly cityImporterService: FoxCityImporterService,
        private readonly regionImporterService: FoxRegionImporterService,
        private readonly partnerImporterService: FoxPartnerImporterService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    /**
     * Imports a single trail
     * @param identifier the directus trail id
     * @param langsToImport the languages to import (if empty, all languages defined in the WPMLanguageCodeMap will be imported)
     * @param metaOnly if true, only the trail products meta_data including partners will be updated
     */
    async importTrail(
        identifier: number,
        langsToImport: (keyof typeof WPMLanguageCodeMap)[] = Object.keys(WPMLanguageCodeMap) as (keyof typeof WPMLanguageCodeMap)[],
        metaOnly = false,
    ) {
        const results: Product[] = [];
        const trail = (await this.directusService.getTrail(identifier)) as FoxGetTrailResult;
        if (!trail || !trail.id) throw new Error(`Trail is undefined or has no id!`);
        if (!trail.booking_channels?.includes('website_ch') || trail.archived) {
            this.logger.log(
                `Import on trail "${trail.id}" skipped because booking channel "website_ch" is not enabled or it has been archived. Attempting to move existing products to trash...`,
            );
            const products = await this.woocommerceService.getProductBySKU(trail.id.toString());
            if (Array.isArray(products)) {
                await this.woocommerceService.deleteProduct(products.map((p) => p.id));
            }
            return products;
        }

        if (!metaOnly) await this.directusService.resolveFiles([trail]);
        if (langsToImport.length === 0) langsToImport = Object.keys(WPMLanguageCodeMap) as (keyof typeof WPMLanguageCodeMap)[];
        langsToImport = moveDefaultLangToFirst(langsToImport);

        const availableAttributes = await this.woocommerceService.getAllProductAttributes();
        const availableLanguageAttributes = await this.woocommerceService.getAllProductAttributeTerms(availableAttributes.find((a) => a.slug === 'pa_languages')?.id);
        const availablePlayingTimeAttributes = await this.woocommerceService.getAllProductAttributeTerms(availableAttributes.find((a) => a.slug === 'pa_playing-time')?.id);
        const availableTaxClasses = await this.woocommerceService.getAllTaxClasses();

        const importedCities: { id: number; tags: Term[] }[] = [];
        const importedRegions: { id: number; categories: Category[] }[] = [];

        if (!metaOnly) {
            // import all references
            for (const cityRef of trail.sales_city) {
                const cityRefId = cityRef.sales_city_id.id;
                if (!cityRefId) throw new Error(`Referenced city is undefined or has no id`);
                const tags = await this.cityImporterService.importCity(cityRefId, langsToImport);
                importedCities.push({ id: cityRefId, tags: tags });
                for (const regionReg of cityRef.sales_city_id.sales_region) {
                    const categories = await this.regionImporterService.importRegion(regionReg.sales_region_id as number, langsToImport);
                    importedRegions.push({ id: regionReg.sales_region_id as number, categories: categories });
                }
            }
        }

        let existingDefaultProduct = await this.woocommerceService.getProductBySKU(trail.id.toString(), DEFAULT_LANGUAGE_CODE);
        for (const language of langsToImport) {
            const existingProductTranslation = await this.woocommerceService.getProductBySKU(trail.id.toString(), language);
            let tid: number | null = null;
            if (existingDefaultProduct) {
                if (existingProductTranslation) {
                    if (existingProductTranslation[0].id !== existingDefaultProduct[0].id) {
                        tid = existingDefaultProduct[0].id as number;
                    }
                } else {
                    tid = existingDefaultProduct[0].id as number;
                }
            }

            try {
                let product = transformTrail(trail, language, availableAttributes, availableTaxClasses, availableLanguageAttributes, availablePlayingTimeAttributes, tid);

                if (!metaOnly) {
                    importedCities.forEach((city) => product.tags?.push({ id: city.tags.find((t) => t.lang == language)?.id }));
                    importedRegions.forEach((region) => product.categories?.push({ id: region.categories.find((t) => t.lang == language)?.id }));
                }

                const partnerMeta = [];
                const importedPartners = await this.importTrailPartners(trail, product, availableAttributes.find((a) => a.slug == 'pa_booking-roles')?.id);
                importedPartners.forEach((partner) => {
                    if (partner.trailRoles.includes('Trail-Sponsor') || partner.trailRoles.includes('Trail-Partner')) partnerMeta.push(partner.post.id?.toString());
                });
                product.meta_data = product.meta_data?.filter((m) => m.key !== 'partner_object');
                product.meta_data?.push({ key: 'partner_object', value: partnerMeta });

                if (metaOnly) product = { meta_data: product.meta_data };

                const importedProduct = await this.runImport(trail, product, language, existingProductTranslation ? existingProductTranslation[0] : null, metaOnly);

                if (!existingDefaultProduct) existingDefaultProduct = [importedProduct];
                results.push(importedProduct);
            } catch (e) {
                this.logger.error(e);
            }
        }

        return results;
    }

    async importAllTrailPartners(langsToImport: (keyof typeof WPMLanguageCodeMap)[] = Object.keys(WPMLanguageCodeMap) as (keyof typeof WPMLanguageCodeMap)[]) {
        const trails = await this.directusService.getAllTrails();
        if (!trails) throw new Error(`No trails found!`);
        return promiseAllInBatches(
            async (t) => {
                const trail = (await this.directusService.getTrail(t.id)) as FoxGetTrailResult;
                if (!trail || !trail.id) throw new Error(`Trail is undefined or has no id!`);
                const importedPartners = await this.importTrailPartners(trail);
                for (const language of langsToImport) {
                    const existingProductTranslation = await this.woocommerceService.getProductBySKU(trail.id.toString(), language);
                    if (!existingProductTranslation) {
                        this.logger.warn(`No product found for trail ${trail.id} in language ${language} - unable to import associated partners!`);
                        continue;
                    }
                    try {
                        let partnerMeta = existingProductTranslation[0].meta_data?.find((m) => m.key === 'partner_object')?.value as string[] | string;
                        if (!Array.isArray(partnerMeta)) partnerMeta = [partnerMeta];
                        importedPartners.forEach((partner) => (partnerMeta as string[]).push(partner.post.id?.toString() || ''));
                        delete existingProductTranslation[0].regular_price;
                        const importedProduct = await this.runImport(trail, existingProductTranslation[0], language, existingProductTranslation[0], true);
                        return importedProduct;
                    } catch (e) {
                        this.logger.error(e);
                    }
                }
            },
            trails,
            3,
        );
    }

    private async importTrailPartners(trail: FoxCollection['trails'], product?: Product, bookingRolesAttributeId?: number) {
        const importedPartners: { id: number; post: Post; trailRoles: string[] }[] = [];
        const partnersToImport = new Map<number, string[]>();
        const trailPartnerRoles = trail.partner_roles?.map((partnerRole) => partnerRole['partner_roles_id']);
        for (const partnerRole of trailPartnerRoles) {
            if (
                (!partnerRole.valid_until && !partnerRole.valid_from) ||
                (partnerRole.valid_from && !partnerRole.valid_until && new Date(partnerRole.valid_from) <= new Date()) ||
                (!partnerRole.valid_from && partnerRole.valid_until && new Date(partnerRole.valid_until) > new Date()) ||
                (partnerRole.valid_from && partnerRole.valid_until && new Date(partnerRole.valid_from) <= new Date() && new Date(partnerRole.valid_until) >= new Date())
            ) {
                const partnerType = partnerRole.partner_type_id.name;
                if (!partnerType) throw new Error(`Partner type is undefined!`);
                if (partnersToImport.has(partnerRole.partner_id as number)) {
                    const p = partnersToImport.get(partnerRole.partner_id as number);
                    if (!p) throw new Error(`Partner references contains partners with undefined id!`);
                    partnersToImport.set(partnerRole.partner_id as number, [...p, partnerType]);
                } else {
                    partnersToImport.set(partnerRole.partner_id as number, [partnerType]);
                }
            }
        }
        for (const [partnerId, partnerRoles] of partnersToImport) {
            const post = await this.partnerImporterService.importPartner(partnerId);
            if (partnerRoles.includes('Ticket-Reseller') && product) {
                const rolesRef = product.attributes?.find((a) => a.id == bookingRolesAttributeId);
                const partner = await this.directusService.getPartner(partnerId);
                if (!partner) throw new Error(`Partner with id ${partnerId} not found!`);
                if (!partner.name) throw new Error(`Partner with id ${partnerId} has no name!`);
                const resellerAccountName = FoxPartnerImporterService.getResellerAccountName(partner.name);
                (rolesRef?.options as string[]).push(resellerAccountName);
            }
            importedPartners.push({ id: partnerId, post: post, trailRoles: partnerRoles });
        }
        return importedPartners;
    }

    private async runImport(
        trail: TypeOf<FoxCollection, 'trails'>,
        newProduct: Product,
        language: keyof typeof WPMLanguageCodeMap,
        existingProduct: Product | null = null,
        skipImages = false,
    ): Promise<Product> {
        if (existingProduct) {
            this.logger.log(`Updating existing trail product "${existingProduct.name}" [${existingProduct.lang}]`);
            newProduct.id = existingProduct.id;
            if (!skipImages) await this.importTrailImages(trail, newProduct, existingProduct);
            const updatedProduct = await this.woocommerceService.updateProduct(newProduct);
            updatedProduct.lang = newProduct.lang; // wpml is not injecting meta into crud responses
            return updatedProduct;
        } else {
            this.logger.log(`Creating new trail product "${trail.id}" [${newProduct.lang}]`);
            /*if (language == DEFAULT_LANGUAGE_CODE) {
                if (!skipImages) await this.importTrailImages(trail, newProduct);
            } else {
                delete newProduct.images; // wpml will copy the images for every translation we create
            }*/
            if (!skipImages) await this.importTrailImages(trail, newProduct);
            const createdProduct = await this.woocommerceService.createProduct(newProduct);
            createdProduct.lang = newProduct.lang; // wpml is not injecting meta into crud responses
            return createdProduct;
        }
    }

    private async importTrailImages(trail: TypeOf<FoxCollection, 'trails'>, product: Product, existingProduct: Product | null = null) {
        await this.wcImporterMediaService.updateWooCommerceObjectImage(trail.name || 'unnamed trail', product, 'images', trail, 'tile_image_file', existingProduct, 0);
        if (trail.image_gallery_files) {
            for (let i = 1; i < trail.image_gallery_files.length + 1; i++) {
                await this.wcImporterMediaService.updateWooCommerceObjectImage(
                    trail.name || 'unnamed trail',
                    product,
                    'images',
                    trail,
                    'image_gallery_files',
                    existingProduct,
                    i,
                    i - 1,
                );
            }
        }
    }
}
