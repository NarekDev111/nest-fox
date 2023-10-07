import { PartnerValidatorType } from '../exp-validator';
import { AppValidationError, AppValidationWarning, WebsiteValidationError, WebsiteValidationWarning } from '../exp-validator.helper';

export const PartnerValidator: PartnerValidatorType = {
    name: async (trail, value, langsToImport, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationError('A name must be set'));
            res.push(new AppValidationError('A name must be set'));
        }
    },
    logo: async (trail, value, langsToImport, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationError('Has no logo'));
            res.push(new AppValidationWarning('Has no logo'));
        }
    },
    link: async (trail, value, langsToImport, trailLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationWarning('Has no link'));
            res.push(new AppValidationWarning('Has no link'));
        }
    },
};
