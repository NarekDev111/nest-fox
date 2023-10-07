import { RegionValidatorType } from '../exp-validator';
import { AppValidationError, WebsiteValidationError } from '../exp-validator.helper';
import { ExpComponents } from '@foxtrail-backend/directus';

export const RegionValidator: RegionValidatorType = {
    header_image: async (region, value, langsToImport, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationError('Has no header image'));
            res.push(new AppValidationError('Has no header image'));
        }
    },
    country: async (region, value, langsToImport, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationError('Has no country'));
            res.push(new AppValidationError('Has no country'));
        }
    },
    translations: async (region, value, langsToImport, trailLangs, res) => {
        // check if there is at least one translation
        if (!value || value.length == 0) {
            res.push(new WebsiteValidationError('Must have at least one translation'));
            res.push(new AppValidationError('Must have at least one translation'));
        }

        langsToImport.forEach((lang) => {
            const transl = value.find(
                (transl: ExpComponents['schemas']['ItemsRegionTranslations']) => transl.languages_code == lang,
            ) as ExpComponents['schemas']['ItemsRegionTranslations'];
            if (!transl || transl.name == null || transl.name == '' || transl.name == undefined) {
                res.push(new WebsiteValidationError(`Translation for ${lang} is missing a name`));
                res.push(new AppValidationError(`Translation for ${lang} is missing a name`));
            }
        });
    },
};
