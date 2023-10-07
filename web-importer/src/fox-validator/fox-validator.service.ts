import { Injectable } from '@nestjs/common';
import { DirectusService, FoxCollection, FoxGetCityResult, FoxGetPartnerResult, FoxGetRegionResult, FoxGetTrailResult } from '@foxtrail-backend/directus';
import { TrailValidator } from './fox-validator-components/trail.validator';
import { ComponentFieldValidatorResult } from './fox-validator';
import { CityValidator } from './fox-validator-components/city.validator';
import { RegionValidator } from './fox-validator-components/region.validator';
import { PartnerValidator } from './fox-validator-components/partner.validator';
import { AppValidationError, AppValidationWarning, ValidationResult, WebsiteValidationError, WebsiteValidationWarning } from './fox-validator.helper';
import { DirectusLanguageCode, TrailLanguageCodeMap } from '../fox-importer/fox-importer.wpml';

@Injectable()
export class FoxValidatorService {
    constructor(private readonly directusService: DirectusService) {}

    /**
     * Validates the trail and all its referenced items using the corresponding validators.
     * @param id
     * @param langsToImport
     * @param platform
     */
    public async validateTrail(id: number, langsToImport: DirectusLanguageCode[] = [], platform: 'app' | 'web') {
        const trail = (await this.directusService.getTrail(id)) as FoxGetTrailResult;
        const trailLangs =
            trail.trail_languages?.map((lang: FoxCollection['trails_trail_languages']) => TrailLanguageCodeMap[lang.trail_languages_id as DirectusLanguageCode]) ?? [];
        // default to trail languages if no languages are specified
        if (langsToImport.length === 0) langsToImport = trailLangs as DirectusLanguageCode[];
        const trailValidationResults = await this.runValidation(trail, TrailValidator, langsToImport, trailLangs);
        const trailResult = [{ id: trail.id, ...this.aggregateComponentValidationResult(trailValidationResults) }];

        // Validate trail referenced components
        const cityResults: { id: number | undefined; name: string | undefined | null }[] = [];
        const regionResults: { id: number | undefined; name: string | undefined | null }[] = [];
        for (const cityRef of trail.sales_city as FoxCollection['trails_sales_city'][]) {
            const cityRefId = (cityRef.sales_city_id as FoxCollection['sales_city']).id;
            const city = (await this.directusService.getCity(cityRefId as number)) as FoxGetCityResult;
            const cityValidationResult = await this.runValidation(city, CityValidator, langsToImport, trailLangs);
            cityResults.push({ id: city.id, name: city.name, ...this.aggregateComponentValidationResult(cityValidationResult) });
            for (const regionRef of (cityRef.sales_city_id as FoxCollection['sales_city']).sales_region as FoxCollection['sales_region_sales_city'][]) {
                const region = (await this.directusService.getRegion(regionRef['sales_region_id'] as number)) as FoxGetRegionResult;
                const regionValidationResult = await this.runValidation(region, RegionValidator, langsToImport, trailLangs);
                regionResults.push({
                    id: region.id,
                    name: region.name,
                    ...this.aggregateComponentValidationResult(regionValidationResult),
                });
            }
        }
        const partnerResults: { id: number | undefined; name: string | undefined | null }[] = [];
        const uniquePartners: any[] = [...new Set(trail.partner_roles?.map((partnerRole) => partnerRole['partner_roles_id']['partner_id'] as number))];
        for (const partnerId of uniquePartners) {
            const partner = (await this.directusService.getPartner(partnerId)) as FoxGetPartnerResult;
            const partnerValidationResult = await this.runValidation(partner, PartnerValidator, langsToImport, trailLangs);
            partnerResults.push({
                id: partner.id,
                name: partner.name,
                ...this.aggregateComponentValidationResult(partnerValidationResult),
            });
        }

        const result = this.aggregateValidationResults(trailResult, cityResults, regionResults, partnerResults);
        const report = await this.generateValidationReport(result, platform);
        if (report) await this.directusService.addComment({ collection: 'trails', item: id.toString(), comment: report });

        return result;
    }

    private async generateValidationReport(val, platform: 'app' | 'web') {
        let report = '';
        const issueCollection: { itemId: number; itemName: string; itemUrl: string; appWarnings?: any[]; websiteWarnings?: any[]; appErrors?: any[]; websiteErrors?: any[] }[] = [];
        [
            { collection: 'trails', name: 'Trail' },
            { collection: 'sales_city', name: 'City' },
            { collection: 'sales_region', name: 'Region' },
            { collection: 'partners', name: 'Partner' },
        ].forEach((component) => {
            const compItems = val.results[component.collection];
            compItems.forEach((compItem) => {
                issueCollection.push({
                    itemId: compItem.id,
                    itemName: compItem.name,
                    itemUrl: `[${component.name} '${compItem.id}](content/${component.collection}/${compItem.id})`,
                    ...this.groupIssues(compItem, platform),
                });
            });
        });

        if (
            (platform == 'app' && !issueCollection.every((item) => item.appErrors && item.appErrors.length === 0)) ||
            (platform == 'web' && !issueCollection.every((item) => item.websiteErrors && item.websiteErrors.length === 0))
        ) {
            report += `## ⛔ Validation during ${platform} import failed!\n`;
            issueCollection.forEach((item) => {
                if ((platform == 'app' && item.appErrors && item.appErrors.length > 0) || (platform == 'web' && item.websiteErrors && item.websiteErrors.length > 0)) {
                    report += this.generateItemErrorReport(item, platform);
                }
            });
        }
        if (
            (platform == 'app' && !issueCollection.every((item) => item.appWarnings && item.appWarnings.length === 0)) ||
            (platform == 'web' && !issueCollection.every((item) => item.websiteWarnings && item.websiteWarnings.length === 0))
        ) {
            report += `## ⚠️ Warnings during ${platform} import\n`;
            issueCollection.forEach((item) => {
                if ((platform == 'app' && item.appWarnings && item.appWarnings.length > 0) || (platform == 'web' && item.websiteWarnings && item.websiteWarnings.length > 0)) {
                    report += this.generateItemWarningReport(item, platform);
                }
            });
        }
        return report;
    }

    private generateItemErrorReport(item, platform: 'app' | 'web') {
        let report = `### ${item.itemUrl}\n`;
        if (platform == 'app') {
            item.appErrors.forEach((error) => {
                report += `- [App] ${error.issue.msg}\n`;
            });
        } else if (platform == 'web') {
            item.websiteErrors.forEach((error) => {
                report += `- [Web] ${error.issue.msg}\n`;
            });
        }
        return report;
    }

    private generateItemWarningReport(item, platform: 'app' | 'web') {
        let report = `### ${item.itemUrl}\n`;
        if (platform == 'app') {
            item.appWarnings.forEach((warning) => {
                report += `- [App] ${warning.issue.msg}\n`;
            });
        } else if (platform == 'web') {
            item.websiteWarnings.forEach((warning) => {
                report += `- [Web] ${warning.issue.msg}\n`;
            });
        }
        return report;
    }

    private groupIssues(compItem, platform: 'app' | 'web'): { appWarnings?: any[]; websiteWarnings?: any[]; appErrors?: any[]; websiteErrors?: any[] } {
        const appWarnings: { field: string; issue: ValidationResult }[] = [];
        const appErrors: { field: string; issue: ValidationResult }[] = [];
        const websiteWarnings: { field: string; issue: ValidationResult }[] = [];
        const websiteErrors: { field: string; issue: ValidationResult }[] = [];
        compItem.field_results.forEach((field) => {
            field.issues.forEach((issue) => {
                if (issue instanceof WebsiteValidationWarning) {
                    websiteWarnings.push({ field: field.field, issue: issue });
                } else if (issue instanceof WebsiteValidationError) {
                    websiteErrors.push({ field: field.field, issue: issue });
                } else if (issue instanceof AppValidationError) {
                    appErrors.push({ field: field.field, issue: issue });
                } else if (issue instanceof AppValidationWarning) {
                    appWarnings.push({ field: field.field, issue: issue });
                }
            });
        });
        if (platform === 'app') {
            return { appWarnings, appErrors };
        } else {
            return { websiteWarnings, websiteErrors };
        }
    }

    private aggregateComponentValidationResult(validationResults: ComponentFieldValidatorResult[]) {
        return {
            valid_for_app: validationResults.every((result) => result.issues.every((issue) => !(issue instanceof AppValidationError))),
            valid_for_website: validationResults.every((result) => result.issues.every((issue) => !(issue instanceof WebsiteValidationError))),
            field_results: validationResults,
        };
    }

    private aggregateValidationResults(trailResults: any[], cityResults: any[], regionResults: any[], partnerResults: any[]) {
        return {
            valid_for_app:
                trailResults.every((trailResult) => trailResult.valid_for_app) &&
                cityResults.every((cityResult) => cityResult.valid_for_app) &&
                regionResults.every((regionResult) => regionResult.valid_for_app) &&
                partnerResults.every((partnerResult) => partnerResult.valid_for_app),
            valid_for_website:
                trailResults.every((trailResult) => trailResult.valid_for_website) &&
                cityResults.every((cityResult) => cityResult.valid_for_website) &&
                regionResults.every((regionResult) => regionResult.valid_for_website) &&
                partnerResults.every((partnerResult) => partnerResult.valid_for_website),
            results: {
                trails: trailResults,
                sales_city: cityResults,
                sales_region: regionResults,
                partners: partnerResults,
            },
        };
    }

    private async runValidation(object, validator, langsToImport: DirectusLanguageCode[], trailLangs: DirectusLanguageCode[]) {
        const validationResults: ComponentFieldValidatorResult[] = [];
        for (const key of Object.keys(object)) {
            if (key in validator) {
                const fieldResults = [];
                await validator[key](object, object[key], langsToImport, trailLangs, fieldResults);
                validationResults.push({ field: key, issues: fieldResults });
            }
        }

        return validationResults;
    }
}
