import { WPMLanguageCodeMap } from '../exp-importer/exp-importer.wpml';

export class ValidationResult {
    msg: string;

    constructor(msg: string) {
        this.msg = msg;
    }
}

export class AppValidationError extends ValidationResult {
    constructor(msg: string) {
        super(msg);
    }
}

export class AppValidationWarning extends ValidationResult {
    constructor(msg: string) {
        super(msg);
    }
}

export class WebsiteValidationWarning extends ValidationResult {
    constructor(msg: string) {
        super(msg);
    }
}

export class WebsiteValidationError extends ValidationResult {
    constructor(msg: string) {
        super(msg);
    }
}

export function isValidLangQuery(query: string): boolean {
    if (!query) return true;
    const langs = query.split(',');
    return langs.every((l) => WPMLanguageCodeMap[l]);
}
