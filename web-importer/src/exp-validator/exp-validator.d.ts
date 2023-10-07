import { TypeOf } from '@directus/sdk';
import { ExpCollection } from '../exp-collection';
import { ValidationResult } from './validator.helper';

interface ComponentFieldValidatorResult {
    field: string;
    issues: ValidationResult[];
}

type TrailValidatorType = {
    [P in keyof TypeOf<ExpCollection, 'trails'>]: (
        trail: TypeOf<ExpCollection, 'trails'>,
        value: TypeOf<TypeOf<ExpCollection, 'trails'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};

type CityValidatorType = {
    [P in keyof TypeOf<ExpCollection, 'city'>]: (
        trail: TypeOf<ExpCollection, 'city'>,
        value: TypeOf<TypeOf<ExpCollection, 'city'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};

type RegionValidatorType = {
    [P in keyof TypeOf<ExpCollection, 'region'>]: (
        trail: TypeOf<ExpCollection, 'region'>,
        value: TypeOf<TypeOf<ExpCollection, 'region'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};

type CountryValidatorType = {
    [P in keyof TypeOf<ExpCollection, 'country'>]: (
        trail: TypeOf<ExpCollection, 'country'>,
        value: TypeOf<TypeOf<ExpCollection, 'country'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};

type PartnerValidatorType = {
    [P in keyof TypeOf<ExpCollection, 'partner'>]: (
        trail: TypeOf<ExpCollection, 'partner'>,
        value: TypeOf<TypeOf<ExpCollection, 'partner'>, P>,
        langsToImport: string[],
        trailLangs: string[],
        result: ValidationResult[],
    ) => Promise<void>;
};
