import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, ExpComponents, ExpGetTrailResult } from '@foxtrail-backend/directus';
import { DirectusLanguageCode } from '../exp-importer/exp-importer.wpml';
import { AppValidationError, AppValidationWarning, WebsiteValidationError, WebsiteValidationWarning } from './exp-validator.helper';
import { TrailValidator } from './exp-validator-components/trail.validator';
import { CityValidator } from './exp-validator-components/city.validator';
import { RegionValidator } from './exp-validator-components/region.validator';
import { PartnerValidator } from './exp-validator-components/partner.validator';
import { ComponentFieldValidatorResult } from './exp-validator';
import { CountryValidator } from './exp-validator-components/country.validator';

@Injectable()
export class ExpValidatorService {
    private readonly logger = new Logger(ExpValidatorService.name);

    constructor(private readonly directusService: DirectusService) {}

    /**
     * Validates the trail and all its referenced items using the corresponding validators.
     * @param id
     * @param langsToImport
     * @param platform
     */
    public async validateTrail(id: string, langsToImport: DirectusLanguageCode[] = [], platform: 'app' | 'web') {
        const trail: ExpGetTrailResult = await this.directusService.getTrail(id);
        const trailLangs: DirectusLanguageCode[] = trail.languages.map(
            (lang: ExpComponents['schemas']['ItemsTrailsLanguagesAvailable']) =>
                (lang.languages_available_id as ExpComponents['schemas']['ItemsLanguagesAvailable']).code as DirectusLanguageCode,
        );
        // default to trail languages if no languages are specified
        if (langsToImport.length === 0) langsToImport = trail.languages.map((lang) => lang['languages_available_id']['code']) as DirectusLanguageCode[];
        const trailValidationResults = await this.runValidation(trail, TrailValidator, langsToImport, trailLangs);
        const trailResult = [{ id: trail.identifier, ...this.aggregateComponentValidationResult(trailValidationResults) }];

        // Validate trail referenced ExpComponents
        const city = await this.directusService.getCity((trail.city as ExpComponents['schemas']['ItemsCity'])?.id);
        let cityResult = {
            id: null,
            valid_for_app: false,
            valid_for_website: false,
            field_results: [
                {
                    field: null,
                    issues: [new AppValidationWarning('Trail is not assigned to a city'), new WebsiteValidationWarning('Trail is not assigned to a city')],
                },
            ],
        };
        if (city) {
            const cityValidationResult = await this.runValidation(city, CityValidator, langsToImport, trailLangs);
            cityResult = { id: city.id, ...this.aggregateComponentValidationResult(cityValidationResult) };
        }

        const region = await this.directusService.getRegion((city.region as ExpComponents['schemas']['ItemsRegion'])?.id);
        let regionResult = {
            id: null,
            valid_for_app: false,
            valid_for_website: false,
            field_results: [
                {
                    field: null,
                    issues: [new AppValidationWarning('Trail is not assigned to a region'), new WebsiteValidationWarning('Trail is not assigned to a region')],
                },
            ],
        };
        if (region) {
            const regionValidationResult = await this.runValidation(region, RegionValidator, langsToImport, trailLangs);
            regionResult = { id: region.id, ...this.aggregateComponentValidationResult(regionValidationResult) };
        }

        const country = await this.directusService.getCountry((city.region as ExpComponents['schemas']['ItemsRegion'])?.country as string);
        let countryResult = {
            id: null,
            valid_for_app: false,
            valid_for_website: false,
            field_results: [
                {
                    field: null,
                    issues: [new AppValidationWarning('Trail is not assigned to a country'), new WebsiteValidationWarning('Trail is not assigned to a country')],
                },
            ],
        };
        if (country) {
            const countryValidationResult = await this.runValidation(country, CountryValidator, langsToImport, trailLangs);
            countryResult = { id: country.identifier, ...this.aggregateComponentValidationResult(countryValidationResult) };
        }

        const partner = await this.directusService.getPartner((trail.partner as ExpComponents['schemas']['ItemsPartner'])?.id);
        let partnerResult = {
            id: null,
            valid_for_app: true,
            valid_for_website: true,
            field_results: [
                {
                    field: null,
                    issues: [new AppValidationWarning('Trail has no partner'), new WebsiteValidationWarning('Trail has no partner')],
                },
            ],
        };
        if (partner) {
            const partnerValidationResult = await this.runValidation(partner, PartnerValidator, langsToImport, trailLangs);
            partnerResult = { id: partner.id, ...this.aggregateComponentValidationResult(partnerValidationResult) };
        }

        const result = this.aggregateValidationResults(trailResult, [cityResult], [regionResult], [countryResult], [partnerResult]);
        const report = await this.generateValidationReport(result, platform);
        if (report)
            await this.directusService.addComment({
                collection: 'trails',
                item: id.toString(),
                comment: report,
            });

        return result;
    }

    private async generateValidationReport(val, platform: 'app' | 'web') {
        let report = '';
        const issueCollection = [];
        [
            { collection: 'trails', name: 'Trail' },
            { collection: 'City', name: 'City' },
            { collection: 'region', name: 'Region' },
            { collection: 'Country', name: 'Country' },
            { collection: 'partner', name: 'Partner' },
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
            (platform == 'app' && !issueCollection.every((item) => item.appErrors.length === 0)) ||
            (platform == 'web' && !issueCollection.every((item) => item.websiteErrors.length === 0))
        ) {
            report += `## ⛔ Validation during ${platform} import failed!\n`;
            issueCollection.forEach((item) => {
                if ((platform == 'app' && item.appErrors.length > 0) || (platform == 'web' && item.websiteErrors.length > 0)) {
                    report += this.generateItemErrorReport(item, platform);
                }
            });
        }
        if (
            (platform == 'app' && !issueCollection.every((item) => item.appWarnings.length === 0)) ||
            (platform == 'web' && !issueCollection.every((item) => item.websiteWarnings.length === 0))
        ) {
            report += `## ⚠️ Warnings during ${platform} import\n`;
            issueCollection.forEach((item) => {
                if ((platform == 'app' && item.appWarnings.length > 0) || (platform == 'web' && item.websiteWarnings.length > 0)) {
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

    private groupIssues(compItem, platform: 'app' | 'web') {
        const appWarnings = [];
        const appErrors = [];
        const websiteWarnings = [];
        const websiteErrors = [];
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

    private aggregateValidationResults(trailResults: any[], cityResults: any[], regionResults: any[], countryResults: any[], partnerResults: any[]) {
        return {
            valid_for_app:
                trailResults.every((trailResult) => trailResult.valid_for_app) &&
                cityResults.every((cityResult) => cityResult.valid_for_app) &&
                regionResults.every((regionResult) => regionResult.valid_for_app) &&
                countryResults.every((countryResult) => countryResult.valid_for_app) &&
                partnerResults.every((partnerResult) => partnerResult.valid_for_app),
            valid_for_website:
                trailResults.every((trailResult) => trailResult.valid_for_website) &&
                cityResults.every((cityResult) => cityResult.valid_for_website) &&
                regionResults.every((regionResult) => regionResult.valid_for_website) &&
                countryResults.every((countryResult) => countryResult.valid_for_website) &&
                partnerResults.every((partnerResult) => partnerResult.valid_for_website),
            results: {
                trails: trailResults,
                City: cityResults,
                region: regionResults,
                Country: countryResults,
                partner: partnerResults,
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
