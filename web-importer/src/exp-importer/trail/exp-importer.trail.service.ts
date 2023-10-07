import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, ExpCollection, ExpGetAllTrailsResult, ExpGetTrailResult } from '@foxtrail-backend/directus';
import { Attribute, Product, Variation, WoocommerceService } from '@foxtrail-backend/woocommerce';
import { ExpRegionImporterService } from '../region/exp-importer.region.service';
import { ExpCityImporterService } from '../city/exp-importer.city.service';
import { ExpPartnerImporterService } from '../partner/exp-importer.partner.service';
import { DEFAULT_LANGUAGE_CODE, WPMLanguageCodeMap } from '../exp-importer.wpml';
import { moveDefaultLangToFirst } from '../exp-importer.helpers';
import { transformTrail } from './exp-importer.trail.mapper';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';

@Injectable()
export class ExpTrailImporterService {
    private readonly logger = new Logger(ExpTrailImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly cityImporterService: ExpCityImporterService,
        private readonly regionImporterService: ExpRegionImporterService,
        private readonly partnerImporterService: ExpPartnerImporterService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    /**
     * Main import function for directus users.
     * This function creates or updates existing trails including associated regions, cities, images and partners.
     * @param identifier
     * @param langsToImport
     */
    async importTrail(identifier: string, langsToImport: (keyof typeof WPMLanguageCodeMap)[] = []) {
        const results: Product[] = [];
        const trail: ExpGetTrailResult = await this.directusService.getTrail(identifier);
        await this.directusService.resolveFiles([trail]);
        if (langsToImport.length === 0) langsToImport = Object.keys(WPMLanguageCodeMap) as (keyof typeof WPMLanguageCodeMap)[];
        const availableAttributes = await this.woocommerceService.getAllProductAttributes();
        const availablePriceCategoryAttributes = await this.woocommerceService.getAllProductAttributeTerms(availableAttributes.find((a) => a.slug === 'pa_number-of-players').id);
        const availableLanguageAttributes = await this.woocommerceService.getAllProductAttributeTerms(availableAttributes.find((a) => a.slug === 'pa_languages').id);
        const availableTaxClasses = await this.woocommerceService.getAllTaxClasses();

        // move default language to front of array, so it will be imported first
        langsToImport = moveDefaultLangToFirst(langsToImport);

        // import all references
        let partner = null;
        if (trail.partner) {
            partner = await this.partnerImporterService.importPartner((trail.partner as ExpCollection['partner']).id);
        }
        const tags = await this.cityImporterService.importCity((trail.city as ExpCollection['city']).id, langsToImport);
        const category = await this.regionImporterService.importRegion(((trail.city as ExpCollection['city']).region as ExpCollection['region']).id, langsToImport);

        let existingDefaultProduct = await this.woocommerceService.getProductBySKU(trail.identifier, DEFAULT_LANGUAGE_CODE);
        for (const language of langsToImport) {
            const existingProductTranslation = await this.woocommerceService.getProductBySKU(trail.identifier, language);
            let tid = null;
            if (existingDefaultProduct) {
                if (existingProductTranslation) {
                    if (existingProductTranslation[0].id !== existingDefaultProduct[0].id) {
                        tid = existingDefaultProduct[0].id;
                    }
                } else {
                    tid = existingDefaultProduct[0].id;
                }
            }
            const product = transformTrail(
                trail,
                language,
                availableAttributes,
                availableTaxClasses,
                availablePriceCategoryAttributes.filter((a) => a.lang == language),
                availableLanguageAttributes,
                tid,
                await this.directusService.getEventLocation((trail.event_location[trail.event_location.length - 1] as ExpCollection['event_location']).uuid),
            );

            product.tags.push({ id: tags.find((t) => t.lang == language).id });
            product.categories.push({ id: category.find((t) => t.lang == language).id });
            product.categories.push({ id: category.find((t) => t.lang == language).parent });
            if (partner) {
                product.meta_data.find((m) => m.key === 'partner_object').value = partner.id;
                product.acf.partner_object = partner.id;
            }

            const importedProduct = await this.runImport(trail, product, language, existingProductTranslation ? existingProductTranslation[0] : null);

            if (!existingDefaultProduct) existingDefaultProduct = [importedProduct];
            results.push(importedProduct);

            if (importedProduct.lang == DEFAULT_LANGUAGE_CODE) {
                // import variations only on the main product, translations should be synced by wpml
                await this.importVariations(
                    importedProduct,
                    availableAttributes,
                    availablePriceCategoryAttributes.filter((c) => (c.lang = langsToImport[0])),
                    trail.city['region']['country'],
                );
            }
        }

        return results;
    }

    async importAllTrails() {
        const trails = (await this.directusService.getAllTrails()) as ExpGetAllTrailsResult;
        for (const trail of trails) {
            await this.importTrail(trail.identifier);
        }
    }

    async removeTrail(id: number) {
        const product = await this.woocommerceService.getProductBySKU(id.toString());
        if (product) {
            return await this.woocommerceService.deleteProduct(product.map((p) => p.id));
        } else {
            return 'Product not found';
        }
    }

    async removeAllTrails() {
        const products = await this.woocommerceService.getAllProducts();
        if (products) {
            return await this.woocommerceService.deleteProduct(products.map((p) => p.id));
        } else {
            return 'Product not found';
        }
    }

    private async importVariations(product: Product, availableAttributes: Attribute[], availablePriceCategories, countryId: string) {
        const allVariations = await this.woocommerceService.getAllProductVariations(product.id);
        const priceMatrix = await this.directusService.getCountryPricing(countryId);
        const attributeId = availableAttributes.find((a) => a.slug === 'pa_number-of-players').id;
        const optionsToCreate = product.attributes.find((a) => a.id == attributeId).options;

        if (priceMatrix) {
            priceMatrix.every((priceCategory) => priceCategory.slug); // todo check if all price categories have an attribute term
        } else {
            throw new Error('Price matrix is empty for country  ' + countryId);
        }

        const variations = optionsToCreate.map((option): Variation => {
            const optionObj = availablePriceCategories.find((c) => c.name === option);
            const priceRule = priceMatrix.find((p) => p.slug === optionObj.slug);
            const variation: Variation = {
                on_sale: false,
                regular_price: priceRule?.regular_price?.toString() || null,
                sale_price: priceRule?.sale_price?.toString() || null,
                purchasable: priceRule?.enabled || false,
                visible: priceRule?.enabled || false,
                status: priceRule?.enabled ? 'publish' : 'private',
                downloadable: true,
                virtual: true,
                lang: product.lang,
                attributes: [
                    {
                        id: attributeId,
                        option: option,
                    },
                ],
            };
            const existingVariation = allVariations ? allVariations.find((v) => v.attributes.find((a) => a.id == attributeId && a.option == option)) : null;
            if (existingVariation) variation.id = existingVariation.id;
            return variation;
        });
        await this.woocommerceService.batchUpdateProductVariations(
            product,
            variations.filter((v) => !v.id),
            variations.filter((v) => v.id),
            [],
        );
    }

    private async runImport(trail: ExpCollection['trails'], newProduct: Product, language: keyof typeof WPMLanguageCodeMap, existingProduct: Product = null): Promise<Product> {
        if (existingProduct) {
            this.logger.log(`Updating existing trail product "${existingProduct.name}" [${existingProduct.lang}]`);
            newProduct.id = existingProduct.id;
            await this.importTrailImages(trail, newProduct, existingProduct);
            const updatedProduct = await this.woocommerceService.updateProduct(newProduct);
            updatedProduct.lang = newProduct.lang; // wpml is not injecting meta into crud responses
            return updatedProduct;
        } else {
            this.logger.log(`Creating new trail product "${trail.identifier}" [${newProduct.lang}]`);
            if (language == DEFAULT_LANGUAGE_CODE) {
                await this.importTrailImages(trail, newProduct);
            } else {
                // wpml will copy the images for every translation we create
                delete newProduct.images;
                newProduct.meta_data = newProduct.meta_data.filter((kv) => kv.key != 'header_image');
            }
            const createdProduct = await this.woocommerceService.createProduct(newProduct);
            createdProduct.lang = newProduct.lang; // wpml is not injecting meta into crud responses
            return createdProduct;
        }
    }

    private async importTrailImages(trail: ExpCollection['trails'], product: Product, existingProduct: Product = null) {
        await this.wcImporterMediaService.updateACFImage(trail.identifier || 'unnamed trail', product, 'header_image', trail, 'header_image', existingProduct, true);
        await this.wcImporterMediaService.updateWooCommerceObjectImage(trail.identifier || 'unnamed trail', product, 'images', trail, 'image', existingProduct, 0);
        if (trail.image_carousel) {
            for (let i = 1; i < trail.image_carousel.length + 1; i++) {
                await this.wcImporterMediaService.updateWooCommerceObjectImage(
                    trail.identifier || 'unnamed trail',
                    product,
                    'images',
                    trail,
                    'image_carousel',
                    existingProduct,
                    i,
                    i - 1,
                );
            }
        }

        /*        if (trail.header_image) {
            let existingHeaderImage: unknown = defaultProduct?.meta_data.find((kv) => kv.key == 'header_image');
            if (existingHeaderImage) {
                const existingHeaderImageId = existingHeaderImage['value'];
                existingHeaderImage = (await this.woocommerceService.getImageInfo(parseInt(existingHeaderImage['value'])))[0];
                const existingHeaderSrc = unWebPify(existingHeaderImage.toString());
                this.logger.debug(`Trail ${trail.identifier} already has a header image, downloading it from '${existingHeaderSrc}'...`);
                const currentImage = await this.woocommerceService.downloadImage(existingHeaderSrc);
                this.logger.debug(
                    `Comparing current header image '${existingHeaderSrc}' (${currentImage.byteLength} bytes) with directus image '${trail.header_image['filename_download']}' (${trail.header_image['data'].byteLength} bytes)`,
                );
                if (!imagesAreEqual(trail.header_image['data'], currentImage)) {
                    this.logger.debug(`Current header image '${existingHeaderSrc}' and directus image '${trail.header_image['filename_download']}' are different`);
                    this.logger.debug(`Uploading header image '${trail.header_image['filename_download']}' (${trail.header_image['data'].byteLength} bytes)`);
                    const wp_media = await this.woocommerceService.uploadMediaFile(trail.header_image['data'], trail.header_image['filename_download'], trail.header_image['type']);
                    newProduct.meta_data.find((kv) => kv.key == 'header_image').value = wp_media.id;
                } else {
                    this.logger.debug(`Current header image '${existingHeaderSrc}' and directus image '${trail.header_image['filename_download']}' are equal`);
                    newProduct.meta_data.find((kv) => kv.key == 'header_image').value = existingHeaderImageId;
                }
            } else {
                this.logger.debug(`There is no current header image for trail ${trail.identifier}`);
                this.logger.debug(`Uploading header image '${trail.header_image['filename_download']}' (${trail.header_image['data'].byteLength} bytes)`);
                const wp_media = await this.woocommerceService.uploadMediaFile(trail.header_image['data'], trail.header_image['filename_download'], trail.header_image['type']);
                newProduct.meta_data.find((kv) => kv.key == 'header_image').value = wp_media.id;
            }
        }

        let existingImages = [];
        if (defaultProduct && defaultProduct.images && defaultProduct.images.length > 0) {
            existingImages = await Promise.all(
                defaultProduct.images.map((img, index) => {
                    return new Promise((resolve, reject) => {
                        try {
                            const existingSrc = unWebPify(img.src);
                            this.logger.debug(`Trail ${trail.identifier} already has a carousel image [${index}], downloading it from '${existingSrc}'...`);
                            this.woocommerceService.downloadImage(existingSrc).then((data) => {
                                img.data = data;
                                resolve(img);
                            });
                        } catch (error) {
                            reject(error);
                        }
                    });
                }),
            );
        }

        if (trail.image) {
            const existingProductImage = existingImages[0];
            if (existingProductImage) {
                const existingProductImageSrc = unWebPify(existingProductImage.src);
                this.logger.debug(
                    `Comparing current product image '${existingProductImageSrc}' (${existingProductImage.data.byteLength} bytes) with directus image '${trail.image['filename_download']}' (${trail.image['data'].byteLength} bytes)`,
                );
                if (!imagesAreEqual(trail.image['data'], existingProductImage.data)) {
                    this.logger.debug(`Current product image '${existingProductImageSrc}' and directus image '${trail.image['filename_download']}' are different`);
                    this.logger.debug(`Uploading product image '${trail.image['filename_download']}' (${trail.image['data'].byteLength} bytes)`);
                    const wp_media = await this.woocommerceService.uploadMediaFile(trail.image['data'], trail.image['filename_download'], trail.image['type']);
                    newProduct.images[0] = { id: wp_media.id };
                } else {
                    this.logger.debug(`Current product image '${existingProductImageSrc}' and directus image '${trail.image['filename_download']}' are equal, skipping upload`);
                    newProduct.images[0] = existingProductImage;
                }
            } else {
                this.logger.debug(`There is no current product image for trail ${trail.identifier}`);
                this.logger.debug(`Uploading product image '${trail.image['filename_download']}' (${trail.image['data'].byteLength} bytes)`);
                const wp_media = await this.woocommerceService.uploadMediaFile(trail.image['data'], trail.image['filename_download'], trail.image['type']);
                newProduct.images[0] = { id: wp_media.id };
            }
        }

        if (trail.image_carousel) {
            for (let i = 1; i < trail.image_carousel.length + 1; i++) {
                const img = existingImages[i];
                const directusImage = trail.image_carousel[i - 1]['directus_files_id'];
                if (img) {
                    const existingImgSrc = unWebPify(img.src);
                    this.logger.debug(`Trail ${trail.identifier} already has a carousel image at position ${i} (${existingImgSrc})`);
                    this.logger.debug(
                        `Comparing current carousel image at position ${i} '${existingImgSrc}' (${img.data.byteLength} bytes) with directus image '${directusImage.filename_download}' (${directusImage.data.byteLength} bytes)`,
                    );
                    if (!imagesAreEqual(img.data, directusImage.data)) {
                        this.logger.debug(`Current carousel image at position ${i} '${existingImgSrc}' and directus image '${directusImage.filename_download}' are different`);
                        this.logger.debug(`Uploading carousel image to position ${i} '${directusImage.filename_download}' (${directusImage.data.byteLength} bytes)`);
                        const wp_media = await this.woocommerceService.uploadMediaFile(directusImage.data, directusImage.filename_download, directusImage.type);
                        newProduct.images[i] = { id: wp_media.id };
                    } else {
                        this.logger.debug(
                            `Current carousel image at position ${i} '${existingImgSrc}' and directus image '${directusImage.filename_download}' are equal, skipping upload`,
                        );
                        delete img.data;
                        newProduct.images[i] = img;
                    }
                } else {
                    this.logger.debug(`No carousel image exists at position ${i}, uploading '${directusImage.filename_download}' (${directusImage.data.byteLength} bytes)...`);
                    const wp_media = await this.woocommerceService.uploadMediaFile(directusImage.data, directusImage.filename_download, directusImage.type);
                    newProduct.images[i] = { id: wp_media.id };
                }
            }
        }*/
    }

    async translateCollections() {
        const targetLang = (await this.directusService.getAllLanguages()).data.find((l) => l.code == 'pt-PT');

        await this.directusService.translateTrail(targetLang, 'TEST');
        // await this.directusService.translateCollections('answer_translations', 'answers_id');
        // await this.directusService.translateCollections('City_translations', 'city_identifier');
        // await this.directusService.translateCollections('Country_translations', 'country_identifier');
        // await this.directusService.translateCollections('crossword_translations', 'crossword_identifier');
        // await this.directusService.translateCollections('crossword_translations_3', 'crossword_identifier');
        // await this.directusService.translateCollections('crossword_translations_4', 'crossword_identifier');
        // await this.directusService.translateCollections('estimation_slider_screen_translations', 'estimation_slider_screen_identifier');
        // await this.directusService.translateCollections('estimation_slider_screen_translations_2', 'estimation_slider_screen_identifier');
        // await this.directusService.translateCollections('event_location_translations_1', 'event_location_identifier');
        // await this.directusService.translateCollections('event_location_translations_2', 'event_location_uuid');
        // await this.directusService.translateCollections('image_choice_quiz_translations', 'image_choice_quiz_identifier');
        // await this.directusService.translateCollections('image_choice_quiz_translations_2', 'image_choice_quiz_identifier');
        // await this.directusService.translateCollections('info_screen_translations', 'info_screen_identifier');
        // await this.directusService.translateCollections('photo_challenge_translations', 'photo_challenge_identifier');
        // await this.directusService.translateCollections('region_translations', 'region_id');
        // await this.directusService.translateCollections('single_choice_quiz_translations', 'single_choice_quiz_identifier');
        // await this.directusService.translateCollections('single_choice_quiz_translations_2', 'single_choice_quiz_identifier');
        // await this.directusService.translateCollections('sort_answer_translations_1', 'sort_answer_id');
        // await this.directusService.translateCollections('sort_quiz_translations', 'sort_quiz_identifier');
        // await this.directusService.translateCollections('sort_quiz_translations_1', 'sort_quiz_identifier');
        // await this.directusService.translateCollections('trails_translations', 'trails_identifier');
        // await this.directusService.translateCollections('trails_translations_1', 'trails_identifier');
        // await this.directusService.translateCollections('trails_translations_3', 'trails_identifier');
    }
}
