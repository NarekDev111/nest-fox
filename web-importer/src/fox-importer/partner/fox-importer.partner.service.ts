import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, FoxCollection, FoxGetPartnerResult } from '@foxtrail-backend/directus';
import { TypeOf } from '@directus/sdk';
import { transformPartner } from './fox-importer.partner.mapper';
import { DEFAULT_LANGUAGE_CODE } from '../fox-importer.wpml';
import { ImporterMediaService } from '../../importer-commons/importer.media.service';
import { Post, Term, User, WoocommerceService } from '@foxtrail-backend/woocommerce';

@Injectable()
export class FoxPartnerImporterService {
    private readonly logger = new Logger(FoxPartnerImporterService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly wcImporterMediaService: ImporterMediaService,
    ) {}

    /**
     * Imports a single partner
     * Note: this does not create or update references from trail products to the partner. To update references a trail import is required
     * @param id the directus partner id
     */
    async importPartner(id: number): Promise<Post> {
        const partner = (await this.directusService.getPartner(id)) as FoxGetPartnerResult;
        const partnerRoles = new Set<string>();
        await this.directusService.resolveFiles([partner]);

        // gather all unique but currently valid partner roles
        for (const partnerRole of partner.roles) {
            if (
                (!partnerRole.valid_until && !partnerRole.valid_from) ||
                (partnerRole.valid_from && !partnerRole.valid_until && new Date(partnerRole.valid_from) <= new Date()) ||
                (!partnerRole.valid_from && partnerRole.valid_until && new Date(partnerRole.valid_until) > new Date()) ||
                (partnerRole.valid_from && partnerRole.valid_until && new Date(partnerRole.valid_from) <= new Date() && new Date(partnerRole.valid_until) >= new Date())
            ) {
                partnerRoles.add(partnerRole.partner_type_id.name);
            }
        }

        const partnerRolesArray = Array.from(partnerRoles);
        const availablePartnerCategoryAttributes = await this.woocommerceService.getAvailablePartnerCategories();
        if (!partnerRolesArray.every((partnerRole) => availablePartnerCategoryAttributes.map((a) => a.name).includes(partnerRole)))
            throw new Error(`Some partner categories were not found in WooCommerce (${JSON.stringify(partnerRoles)})`);
        const existingPost = await this.woocommerceService.getPostsByDirectusID(partner.id, 'partner');
        const post = transformPartner(partner, DEFAULT_LANGUAGE_CODE, partnerRolesArray);
        post.partner_category = partnerRolesArray.map((partnerRole) => availablePartnerCategoryAttributes.find((a) => a.name === partnerRole)?.id);

        return await this.runImport(partner, post, existingPost);
    }

    async importAllResellerAccounts() {
        const partners = (await this.directusService.getAllPartners()).data;
        if (!partners) return;

        const availableAttributes = await this.woocommerceService.getAllProductAttributes();
        const bookingRoleAttributeId = availableAttributes.find((a) => a.slug === 'pa_booking-roles')?.id;
        const availableBookingRoleAttributes = await this.woocommerceService.getAllProductAttributeTerms(availableAttributes.find((a) => a.slug === 'pa_booking-roles')?.id);

        const resellers = partners.map((partner) => partner.roles.find((role) => role.partner_type_id.name === 'Ticket-Reseller')).filter((reseller) => reseller);
        for (const reseller of resellers) {
            const accountName = FoxPartnerImporterService.getResellerAccountName(reseller.partner_id.name);
            const existingResellerAccount = await this.woocommerceService.findUser(accountName);
            if (!existingResellerAccount || existingResellerAccount.length === 0) {
                this.logger.log(`Creating new reseller account ${accountName}`);
                const resellerAccount: User = {
                    username: accountName,
                    email: 'test@test.ch',
                    password: '1234',
                    roles: ['reseller'],
                };
                await this.woocommerceService.createUser(resellerAccount);
            } else {
                this.logger.log(`Reseller account ${accountName} already exists.`);
            }

            if (!availableBookingRoleAttributes.find((a) => a.slug === accountName)) {
                const resellerBookingRole: Term = {
                    name: accountName,
                    lang: DEFAULT_LANGUAGE_CODE,
                };
                await this.woocommerceService.createTerm(resellerBookingRole, 'pa_booking-roles', `products/attributes/${bookingRoleAttributeId}/terms`);
            } else {
                this.logger.log(`Reseller booking role attribute ${accountName} already exists.`);
            }
        }
    }

    async importAllPartners() {
        const partners = (await this.directusService.getAllPartners()).data;
        if (partners) {
            for (const partner of partners) {
                await this.importPartner(partner.id);
            }
        }
    }

    private async runImport(partner, post: Post, existingPost: Post[] | null) {
        if (Array.isArray(existingPost)) {
            this.logger.log(`Updating existing partner ${existingPost[0].title['rendered']} [${existingPost[0]._links.self[0].href}]`);
            post.id = existingPost[0].id;
            await this.importPartnerImages(partner, post, existingPost[0]);
            return await this.woocommerceService.updatePost(post, 'partner');
        } else {
            this.logger.log(`Creating new partner ${partner.name} [${post.lang}]`);
            await this.importPartnerImages(partner, post);
            return await this.woocommerceService.createPost(post, 'partner');
        }
    }

    private async importPartnerImages(partner: TypeOf<FoxCollection, 'partner'>, post: Post, existingPost: Post | null = null) {
        await this.wcImporterMediaService.updateWooCommerceObjectImage(partner.name || 'unnamed partner', post, 'featured_media', partner, 'logo_file', existingPost);
    }

    public static getResellerAccountName(partnerName: string) {
        return `reseller_${partnerName.toLowerCase().replace(/ /g, '_')}`;
    }
}
