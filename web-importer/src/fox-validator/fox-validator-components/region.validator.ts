import { RegionValidatorType } from '../fox-validator';
import { WebsiteValidationError } from '../fox-validator.helper';

export const RegionValidator: RegionValidatorType = {
    image_file: async (region, value, langsToImport, regionLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationError('Region has no image'));
        }
    },
    image_header_file: async (region, value, langsToImport, regionLangs, res) => {
        if (!value) {
            res.push(new WebsiteValidationError('Region has no header image'));
        }
    },
};
