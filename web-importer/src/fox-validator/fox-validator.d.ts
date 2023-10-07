import { TypeOf } from '@directus/sdk';
import { FoxCollection } from '@foxtrail-backend/directus';
import { ValidationResult } from './fox-validator.helper';

interface ComponentFieldValidatorResult {
    field: string;
    issues: ValidationResult[];
}

type TrailValidatorType = {
    [P in keyof TypeOf<FoxCollection, 'trails'>]: (
        trail: TypeOf<FoxCollection, 'trails'>,
        value: TypeOf<TypeOf<FoxCollection, 'trails'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};

type CityValidatorType = {
    [P in keyof TypeOf<FoxCollection, 'sales_city'>]: (
        trail: TypeOf<FoxCollection, 'sales_city'>,
        value: TypeOf<TypeOf<FoxCollection, 'sales_city'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};

type RegionValidatorType = {
    [P in keyof TypeOf<FoxCollection, 'sales_region'>]: (
        trail: TypeOf<FoxCollection, 'sales_region'>,
        value: TypeOf<TypeOf<FoxCollection, 'sales_region'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};

type PartnerValidatorType = {
    [P in keyof TypeOf<FoxCollection, 'partner'>]: (
        trail: TypeOf<FoxCollection, 'partner'>,
        value: TypeOf<TypeOf<FoxCollection, 'partner'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};
