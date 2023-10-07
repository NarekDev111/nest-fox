import { Injectable, Logger } from '@nestjs/common';
import { WoocommerceService } from '@foxtrail-backend/woocommerce';

@Injectable()
export class ImporterMediaService {
    private readonly logger = new Logger(ImporterMediaService.name);

    constructor(private readonly woocommerceService: WoocommerceService) {}

    public async updateWooCommerceObjectImage(
        objName: string,
        wcObj: object,
        wcObjField: string,
        directusObj: object,
        directusObjField: string,
        existingWcObj: object | null,
        wcObjFieldArrayIndex: number | null = null,
        directusObjFieldArrayIndex: number | null = null,
        useObjectIds = false,
    ): Promise<void> {
        if (!(directusObjFieldArrayIndex == null ? directusObj[directusObjField] : directusObj[directusObjField])) {
            this.logger.debug(`${objName} has no ${directusObjField}, removing it on the wc object...`);
            if (wcObjFieldArrayIndex !== null) {
                wcObj[wcObjField][wcObjFieldArrayIndex] = [];
            } else {
                wcObj[wcObjField] = null;
            }
        } else {
            let directusImage;
            let directusImageName;
            let directusImageType;
            if (directusObjFieldArrayIndex == null) {
                directusImage = directusObj[directusObjField]['data'];
                directusImageName = directusObj[directusObjField]['filename_download'];
                directusImageType = directusObj[directusObjField]['type'];
            } else {
                directusImage = directusObj[directusObjField][directusObjFieldArrayIndex]['directus_files_id']['data'];
                directusImageName = directusObj[directusObjField][directusObjFieldArrayIndex]['directus_files_id']['filename_download'];
                directusImageType = directusObj[directusObjField][directusObjFieldArrayIndex]['directus_files_id']['type'];
            }

            if (!directusImage) {
                this.logger.warn(`Directus object is missing image data for ${directusImageName} at ${directusObjField}`);
            }

            directusImageName = directusImageName.replace(/[\u{0080}-\u{FFFF}]/gu, '');

            if (existingWcObj && existingWcObj[wcObjField]) {
                let existingSource;
                if (wcObjFieldArrayIndex == null) {
                    if (existingWcObj[wcObjField].src) {
                        existingSource = existingWcObj[wcObjField].src;
                    } else {
                        const image_meta = await this.woocommerceService.getImageInfo(existingWcObj[wcObjField]);
                        if (image_meta) {
                            existingSource = image_meta[0];
                        }
                    }
                } else {
                    if (existingWcObj[wcObjField][wcObjFieldArrayIndex]) {
                        existingSource = existingWcObj[wcObjField][wcObjFieldArrayIndex].src;
                    } else {
                        // TODO a new image was added to the array in directus but it doesnt exists on the wc object, so we need to upload it
                        this.logger.debug(`New image was appended to array ${wcObjField}[${wcObjFieldArrayIndex}] '${directusImageName}' (${directusImage.byteLength} bytes)`);
                        this.logger.debug(`Uploading ${wcObjField} '${directusImageName}' (${directusImage.byteLength} bytes)`);
                        const wp_media = await this.woocommerceService.uploadMediaFile(directusImage, directusImageName, directusImageType);
                        wcObj[wcObjField][wcObjFieldArrayIndex] = { id: wp_media.id, src: wp_media.source_url };
                    }
                }
                this.logger.debug(`${objName} already has an ${wcObjField}, downloading it from '${existingSource}'...`);
                const existingImage = await this.woocommerceService.downloadImage(existingSource);
                this.logger.debug(`Comparing '${existingSource}' (${existingImage.byteLength} bytes) with '${directusImageName}' (${directusImage.byteLength} bytes)`);
                if (directusImage.equals(existingImage)) {
                    this.logger.debug(`Current ${wcObjField} '${existingSource}' and directus image '${directusImageName}' are equal, skipping upload.`);
                    if (wcObjFieldArrayIndex == null) {
                        wcObj[wcObjField] = undefined;
                    } else {
                        wcObj[wcObjField][wcObjFieldArrayIndex] = existingWcObj[wcObjField][wcObjFieldArrayIndex];
                    }
                } else {
                    this.logger.debug(`Uploading ${wcObjField} '${directusImageName}' (${directusImage.byteLength} bytes)`);
                    // either no existing region or the images weren't the same, upload the image
                    const wp_media = await this.woocommerceService.uploadMediaFile(directusImage, directusImageName, directusImageType);
                    if (wcObjFieldArrayIndex == null) {
                        if (useObjectIds) {
                            wcObj[wcObjField] = { id: wp_media.id };
                        } else {
                            wcObj[wcObjField] = wp_media.id;
                        }
                    } else {
                        wcObj[wcObjField][wcObjFieldArrayIndex] = { id: wp_media.id };
                    }
                }
            } else {
                this.logger.debug(`${objName} has no ${wcObjField}, uploading '${directusImageName}' (${directusImage.byteLength} bytes)...`);
                const wp_media = await this.woocommerceService.uploadMediaFile(directusImage, directusImageName, directusImageType);
                if (wcObjFieldArrayIndex == null) {
                    if (useObjectIds) {
                        wcObj[wcObjField] = { id: wp_media.id };
                    } else {
                        wcObj[wcObjField] = wp_media.id;
                    }
                } else {
                    wcObj[wcObjField][wcObjFieldArrayIndex] = { id: wp_media.id };
                }
            }
        }
    }

    public async updateACFImage(
        objName: string,
        wcObj: object,
        acfField: string,
        directusObj: object,
        directusObjField: string,
        existingWcObj: object | null,
        noCustomMeta = false,
    ): Promise<void> {
        if (!directusObj[directusObjField]) {
            this.logger.debug(`${objName} has no ${directusObjField}, removing it on the wc object...`);
            wcObj['acf'][acfField] = null;
        } else {
            const directusImage = directusObj[directusObjField]['data'];
            const directusImageName = directusObj[directusObjField]['filename_download'];
            const directusImageType = directusObj[directusObjField]['type'];

            let existingImageId: null;
            if (noCustomMeta) {
                let existingImage = existingWcObj['meta_data'].find((kv) => kv.key == acfField);
                if (!existingImage) {
                    existingImage = {
                        key: acfField,
                        value: null,
                    };
                    existingWcObj['meta_data'].push(existingImage);
                }
                existingImageId = existingImage['value'];
            } else {
                existingImageId = existingWcObj['custom_meta'][acfField][0];
            }
            if (existingWcObj && existingImageId !== '0') {
                const image_meta = await this.woocommerceService.getImageInfo(existingImageId);
                if (!image_meta) {
                    this.logger.warn(`Could not find wordpress meta data for image with id ${existingImageId}`);
                    this.logger.debug(`Reuploading ${acfField} on ${objName} with ${directusImageName}' (${directusImage.byteLength} bytes)...`);
                    const wp_media = await this.woocommerceService.uploadMediaFile(directusImage, directusImageName, directusImageType);
                    wcObj['acf'][acfField] = wp_media.id.toString();
                    return;
                }
                const existingSource = image_meta[0];
                this.logger.debug(`${objName} already has an ${acfField}, downloading it from '${existingSource}'...`);
                const existingImage = await this.woocommerceService.downloadImage(existingSource);
                this.logger.debug(`Comparing '${existingSource}' (${existingImage.byteLength} bytes) with '${directusImageName}' (${directusImage.byteLength} bytes)`);
                if (directusImage.equals(existingImage)) {
                    this.logger.debug(`Current ${acfField} '${existingSource}' and directus image '${directusImageName}' are equal, skipping upload.`);
                    wcObj['acf'][acfField] = existingImageId;
                } else {
                    this.logger.debug(`Uploading ${acfField} '${directusImageName}' (${directusImage.byteLength} bytes)`);
                    // either no existing region or the images weren't the same, upload the image
                    const wp_media = await this.woocommerceService.uploadMediaFile(directusImage, directusImageName, directusImageType);
                    wcObj['acf'][acfField] = wp_media.id.toString();
                }
            } else {
                this.logger.debug(`${objName} has no ${acfField}, uploading '${directusImageName}' (${directusImage.byteLength} bytes)...`);
                const wp_media = await this.woocommerceService.uploadMediaFile(directusImage, directusImageName, directusImageType);
                wcObj['acf'][acfField] = wp_media.id.toString();
            }
        }
    }
}
