import { CityValidatorType } from '../exp-validator';
import { AppValidationError, WebsiteValidationError } from '../exp-validator.helper';
import { ExpComponents } from '@foxtrail-backend/directus';

export const CityValidator: CityValidatorType = {
    region: async (city, value, langsToImport, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationError('Has no region assigned'));
            res.push(new AppValidationError('Has no region assigned'));
        }
    },
    translations: async (city, value, langsToImport, trailLangs, res) => {
        // check if there is at least one translation
        if (!value || value.length == 0) {
            res.push(new WebsiteValidationError('Must have at least one language'));
            res.push(new AppValidationError('Must have at least one language'));
        }

        // check if there is a translation for each trail language
        const translationLangs = city.translations.map((transl) => transl['languages_code']);
        if (!langsToImport.every((lang) => translationLangs.includes(lang))) {
            res.push(new WebsiteValidationError(`Is missing a translation ([${langsToImport}] are required)`));
            res.push(new AppValidationError(`Is missing a translation ([${langsToImport}] are required)`));
        }

        langsToImport.forEach((lang) => {
            const transl = value.find(
                (transl: ExpComponents['schemas']['ItemsCityTranslations']) => transl.languages_code == lang,
            ) as ExpComponents['schemas']['ItemsCityTranslations'];
            if (transl?.name == null || transl?.name == '' || transl?.name == undefined) {
                res.push(new WebsiteValidationError(`Translation for ${transl.languages_code} is missing a name`));
                res.push(new AppValidationError(`Translation for ${transl.languages_code} is missing a name`));
            }
        });
    },
};
