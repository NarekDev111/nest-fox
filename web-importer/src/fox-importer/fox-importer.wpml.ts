export const DEFAULT_LANGUAGE_CODE: keyof typeof WPMLanguageCodeMap = 'de';

/**
 * Maps booking roles to their corresponding attribute slug in WC
 */
export enum WPBookingRoleMap {
    'customer-service' = 1,
    'web-user' = 2,
}

/**
 * Maps directus language codes to WPML language codes
 * ! Important: This map must contain all available website languages. Otherwise, there will be missing default translations on the website.
 */
export enum WPMLanguageCodeMap {
    'en' = 'en-US',
    'de' = 'de-DE',
    'fr' = 'fr-FR',
}

export enum WPMLSlugPostfixMap {
    'en' = 'en',
    'de' = 'de',
    'it' = 'it',
    'fr' = 'fr',
    'de-ch' = 'ch',
}

export type DirectusLanguageCode = `${WPMLanguageCodeMap}`;

/**
 * Maps trail languages to a directus language code
 */
export enum TrailLanguageCodeMap {
    'EN' = 'en-US',
    'DE' = 'de-DE',
    'IT' = 'it-IT',
    'FR' = 'fr-FR',
}

export enum TrailLanguageNameMap {
    'EN' = 'english',
    'DE' = 'german',
    'IT' = 'italian',
    'FR' = 'french',
}

export enum WheelchairTranslations {
    'en' = 'This trail is unfortunately only partially suitable for wheelchairs and strollers due to slopes and stairs. Nevertheless, the trail can be played, but some places may be more difficult to access.',
    'de' = 'Dieser Trail ist aufgrund von Steigungen und Treppen für Rollstühle und Kinderwagen nur bedingt geeignet. Alle Orte sind jedoch erreichbar.',
    'de-ch' = 'Dieser Trail ist aufgrund von Steigungen und Treppen für Rollstühle und Kinderwagen nur bedingt geeignet. Alle Orte sind jedoch erreichbar.',
    'pt-PT' = 'Este percurso infelizmente é parcialmente adequado para cadeiras de rodas e carrinhos de bebé devido a encostas e escadas. No entanto, o trajeto pode ser jogado, mas alguns lugares podem ser de mais difícil acesso.',
    'es' = 'Lamentablemente, este recorrido es sólo parcialmente apto para sillas de ruedas y coches de bebés debido a los desniveles y escaleras. No obstante, el recorrido se puede realizar, pero algunos tramos pueden ser de difícil acceso.',
    'fr' = 'Malheureusement, cette piste n’est que partiellement adaptée aux fauteuils roulants et aux poussettes en raison de ses pentes et de ses escaliers. Cependant, la piste peut être jouée, mais certains endroits peuvent être plus difficiles d’accès.',
}

export function getDurationSlugs(duration) {
    duration = parseFloat(duration);
    const durationSlugs: string[] = [];
    if (1.5 <= duration && duration <= 3) {
        durationSlugs.push('1-5h-3h');
    }
    if (2.5 <= duration && duration <= 4) {
        durationSlugs.push('2-5h-4h');
    }
    if (3.5 <= duration && duration <= 5.5) {
        durationSlugs.push('3-5h-5-5h');
    }
    return durationSlugs;
}

export function getLanguageNameTranslation(languageName: 'german' | 'english' | 'italian' | 'french', targetLanguage: keyof typeof WPMLanguageCodeMap) {
    switch (targetLanguage) {
        case 'en':
            return EnglishLanguageNameTranslations[languageName];
        case 'de':
            return GermanLanguageNameTranslations[languageName];
        case 'fr':
            return FrenchLanguageNameTranslations[languageName];
    }
}

enum GermanLanguageNameTranslations {
    'english' = 'Englisch',
    'german' = 'Deutsch',
    'italian' = 'Italienisch',
    'french' = 'Französisch',
}

enum EnglishLanguageNameTranslations {
    'english' = 'English',
    'german' = 'German',
    'italian' = 'Italian',
    'french' = 'French',
}

enum ItalianLanguageNameTranslations {
    'english' = 'Inglês',
    'german' = 'Alemão',
    'italian' = 'Italiano',
    'french' = 'Francês',
}

enum FrenchLanguageNameTranslations {
    'english' = 'Anglais',
    'german' = 'Allemand',
    'italian' = 'Italien',
    'french' = 'Français',
}

enum DurationShortTranslation {
    'de' = 'etwa 1 - 1.5 Stunden',
    'de-ch' = 'etwa 1 - 1.5 Stunden',
    'en' = 'about 1 - 1.5 hours',
    'fr' = 'environ 1 à 1.5 heure',
    'it' = 'circa 1 - 1.5 ore',
}

enum DurationMediumTranslation {
    'de' = 'etwa 1.5 - 2 Stunden',
    'de-ch' = 'etwa 1.5 - 2 Stunden',
    'en' = 'about 1.5 - 2 hours',
    'fr' = 'environ 1,5 à 2 heures',
    'it' = 'circa 1,5 - 2 ore',
}

enum DurationLongTranslation {
    'de' = 'etwa 2 Stunden',
    'de-ch' = 'etwa 2 Stunden',
    'en' = 'about 2 hours',
    'fr' = 'environ 2 heures',
    'it' = 'circa 2 ore',
}
