export const DEFAULT_LANGUAGE_CODE: keyof typeof WPMLanguageCodeMap = 'en';

/**
 *  Maps directus country codes to tax classes in WooCommerce
 */
export enum WCTaxClassMap {
    'CH' = 'switzerland',
}

/**
 * Maps directus language codes to WPML language codes
 * ! Important: This map must contain all available website languages. Otherwise, there will be missing default translations on the website.
 */
export enum WPMLanguageCodeMap {
    'en' = 'en-US',
    'de' = 'de-DE',
    'pt-pt' = 'pt-PT',
    'es' = 'es-ES',
    'de-ch' = 'de-DE',
    'fr' = 'fr-FR',
}

export enum WPMLSlugPostfixMap {
    'en' = 'en',
    'de' = 'de',
    'pt-pt' = 'pt',
    'es' = 'es',
    'fr' = 'fr',
    'de-ch' = 'ch',
}

export type DirectusLanguageCode = `${WPMLanguageCodeMap}`;

export enum WheelchairTranslations {
    'en' = 'This trail is unfortunately only partially suitable for wheelchairs and strollers due to slopes and stairs. Nevertheless, the trail can be played, but some places may be more difficult to access.',
    'de' = 'Dieser Trail ist aufgrund von Steigungen und Treppen für Rollstühle und Kinderwagen nur bedingt geeignet. Alle Orte sind jedoch erreichbar.',
    'de-ch' = 'Dieser Trail ist aufgrund von Steigungen und Treppen für Rollstühle und Kinderwagen nur bedingt geeignet. Alle Orte sind jedoch erreichbar.',
    'pt-PT' = 'Este percurso infelizmente é parcialmente adequado para cadeiras de rodas e carrinhos de bebé devido a encostas e escadas. No entanto, o trajeto pode ser jogado, mas alguns lugares podem ser de mais difícil acesso.',
    'es' = 'Lamentablemente, este recorrido es sólo parcialmente apto para sillas de ruedas y coches de bebés debido a los desniveles y escaleras. No obstante, el recorrido se puede realizar, pero algunos tramos pueden ser de difícil acceso.',
    'fr' = 'Malheureusement, cette piste n’est que partiellement adaptée aux fauteuils roulants et aux poussettes en raison de ses pentes et de ses escaliers. Cependant, la piste peut être jouée, mais certains endroits peuvent être plus difficiles d’accès.',
}

export function getDurationInLanguage(duration: '1 - 1.5h' | '1.5 - 2h' | '2h', language: keyof typeof WPMLanguageCodeMap) {
    switch (duration) {
        case '1 - 1.5h':
            return DurationShortTranslation[language];
        case '1.5 - 2h':
            return DurationMediumTranslation[language];
        case '2h':
            return DurationLongTranslation[language];
    }
}

export function getLanguageNameTranslation(languageName: 'german' | 'english' | 'spanish' | 'portuguese' | 'french', targetLanguage: DirectusLanguageCode) {
    switch (targetLanguage) {
        case 'en-US':
            return EnglishLanguageNameTranslations[languageName];
        case 'de-DE':
            return GermanLanguageNameTranslations[languageName];
        case 'pt-PT':
            return PortugueseLanguageNameTranslations[languageName];
        case 'es-ES':
            return SpanishLanguageNameTranslations[languageName];
        case 'fr-FR':
            return FrenchLanguageNameTranslations[languageName];
    }
}

enum GermanLanguageNameTranslations {
    'english' = 'Englisch',
    'german' = 'Deutsch',
    'spanish' = 'Spanisch',
    'portuguese' = 'Portugiesisch',
    'french' = 'Französisch',
}

enum EnglishLanguageNameTranslations {
    'english' = 'English',
    'german' = 'German',
    'spanish' = 'Spanish',
    'portuguese' = 'Portuguese',
    'french' = 'French',
}

enum SpanishLanguageNameTranslations {
    'english' = 'Inglés',
    'german' = 'Alemán',
    'spanish' = 'Español',
    'portuguese' = 'Portugués',
    'french' = 'Francés',
}

enum PortugueseLanguageNameTranslations {
    'english' = 'Inglês',
    'german' = 'Alemão',
    'spanish' = 'Espanhol',
    'portuguese' = 'Português',
    'french' = 'Francês',
}

enum FrenchLanguageNameTranslations {
    'english' = 'Anglais',
    'german' = 'Allemand',
    'spanish' = 'Espagnol',
    'portuguese' = 'Portugais',
    'french' = 'Français',
}

enum DurationShortTranslation {
    'de' = 'etwa 1 - 1.5 Stunden',
    'de-ch' = 'etwa 1 - 1.5 Stunden',
    'en' = 'about 1 - 1.5 hours',
    'fr' = 'environ 1 à 1.5 heure',
    'pt-pt' = 'cerca de 1 - 1.5 horas',
    'es' = 'aprox. 1 - 1.5 horas',
}

enum DurationMediumTranslation {
    'de' = 'etwa 1.5 - 2 Stunden',
    'de-ch' = 'etwa 1.5 - 2 Stunden',
    'en' = 'about 1.5 - 2 hours',
    'fr' = 'environ 1,5 à 2 heures',
    'pt-pt' = 'cerca de 1.5 - 2 horas',
    'es' = 'aprox. 1.5 - 2 horas',
}

enum DurationLongTranslation {
    'de' = 'etwa 2 Stunden',
    'de-ch' = 'etwa 2 Stunden',
    'en' = 'about 2 hours',
    'fr' = 'environ 2 heures',
    'pt-pt' = 'cerca de 2 horas',
    'es' = 'aprox. 2 horas',
}
