import { CountryValidatorType } from '../exp-validator';
import { AppValidationError, WebsiteValidationError } from '../exp-validator.helper';

export const CountryValidator: CountryValidatorType = {
    header_image: async (city, value, reqLanguages, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationError('Has no header image'));
            res.push(new AppValidationError('Has no header image'));
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
    },
};
