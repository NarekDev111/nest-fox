import { DirectusLanguageCode, getDurationInLanguage, getLanguageNameTranslation, WCTaxClassMap, WheelchairTranslations, WPMLanguageCodeMap } from '../exp-importer.wpml';
import { Attribute, CustomImporterFile, Product } from '@foxtrail-backend/woocommerce';
import { ExpCollection, ExpComponents } from '@foxtrail-backend/directus';
import { createTrailSlug } from '../exp-importer.helpers';

export function transformTrail(
    trail: ExpCollection['trails'],
    lang: keyof typeof WPMLanguageCodeMap,
    availableAttributes: Attribute[],
    availableTaxClasses,
    availablePriceCategoryAttributes,
    availableLanguageAttributes,
    translation_of = null,
    endLocation = null,
): Product {
    const fallbackLang: DirectusLanguageCode = (
        ((trail.city as ExpComponents['schemas']['ItemsCity']).region as ExpComponents['schemas']['ItemsRegion']).main_language as ExpComponents['schemas']['ItemsLanguages']
    ).code as DirectusLanguageCode;

    const wantedTranslation = {
        3: (trail.translations_3 as ExpComponents['schemas']['ItemsTrailsTranslations'][]).find(
            (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[lang],
        ) as ExpComponents['schemas']['ItemsTrailsTranslations3'],
        4: (trail.translations_4 as ExpComponents['schemas']['ItemsTrailsTranslations'][]).find(
            (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[lang],
        ) as ExpComponents['schemas']['ItemsTrailsTranslations1'],
        5: (trail.translations_5 as ExpComponents['schemas']['ItemsTrailsTranslations'][]).find(
            (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[lang],
        ) as ExpComponents['schemas']['ItemsTrailsTranslations'],
        6: (trail.translations_6 as ExpComponents['schemas']['ItemsTrailsTranslations'][]).find(
            (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[lang],
        ) as ExpComponents['schemas']['ItemsTrailsTranslations2'],
    };

    const fallbackTranslation = {
        3: (trail.translations_3 as ExpComponents['schemas']['ItemsTrailsTranslations'][]).find(
            (t) => (t.languages_code as DirectusLanguageCode) === fallbackLang,
        ) as ExpComponents['schemas']['ItemsTrailsTranslations3'],
        4: (trail.translations_4 as ExpComponents['schemas']['ItemsTrailsTranslations'][]).find(
            (t) => (t.languages_code as DirectusLanguageCode) === fallbackLang,
        ) as ExpComponents['schemas']['ItemsTrailsTranslations1'],
        5: (trail.translations_5 as ExpComponents['schemas']['ItemsTrailsTranslations'][]).find(
            (t) => (t.languages_code as DirectusLanguageCode) === fallbackLang,
        ) as ExpComponents['schemas']['ItemsTrailsTranslations'],
        6: (trail.translations_6 as ExpComponents['schemas']['ItemsTrailsTranslations'][]).find(
            (t) => (t.languages_code as DirectusLanguageCode) === fallbackLang,
        ) as ExpComponents['schemas']['ItemsTrailsTranslations2'],
    };

    // create list of language attributes for woocommerce
    const languageAttributes: string[] = [];
    (trail.languages as ExpComponents['schemas']['ItemsTrailsLanguagesAvailable'][]).forEach((language) => {
        languageAttributes.push(language.languages_available_id['name']);
    });
    if (!languageAttributes.every((languageAttribute) => availableLanguageAttributes.map((l) => l.name).includes(languageAttribute)))
        throw new Error(`At least one trail language is not available as attribute in woocommerce.`);

    // create list of highlight locations
    const highlightLocations: string[] = [];
    (trail.highlight_locations as ExpComponents['schemas']['ItemsTrailsLocationHighlight'][]).forEach((location) => {
        const highlightName =
            location.event_location_uuid['translations_2'].find((t) => t.languages_code == lang)?.name ||
            location.event_location_uuid['translations_2'].find((t) => t.languages_code == fallbackLang)?.name;
        highlightLocations.push(highlightName);
    });

    const cityName = (trail.city['translations'] as ExpComponents['schemas']['ItemsCityTranslations'][]).find(
        (t) => (t.languages_code as DirectusLanguageCode) === WPMLanguageCodeMap[lang],
    )?.name;
    const fallbackCityName = (trail.city['translations'] as ExpComponents['schemas']['ItemsCityTranslations'][]).find(
        (t) => (t.languages_code as DirectusLanguageCode) === fallbackLang,
    )?.name;

    let displayName = cityName;
    if (wantedTranslation['3']?.city_name_suffix) {
        displayName += ` (${wantedTranslation['3']?.city_name_suffix})`;
    } else if (fallbackTranslation['3']?.city_name_suffix) {
        displayName += ` (${fallbackTranslation['3']?.city_name_suffix})`;
    }

    const product: Product = {
        name: displayName,
        type: 'variable',
        slug: createTrailSlug(cityName, trail.identifier, lang),
        images: [], // will be filled below
        lang: lang,
        status: 'publish',
        attributes: [
            {
                id: availableAttributes.find((a) => a.slug == 'pa_languages').id,
                visible: true,
                options: languageAttributes,
            },
            {
                id: availableAttributes.find((a) => a.slug == 'pa_number-of-players').id,
                visible: true,
                variation: true,
                options: availablePriceCategoryAttributes.map((c) => c.name),
            },
        ],
        tax_status: 'taxable',
        tax_class: WCTaxClassMap[(trail.city as ExpComponents['schemas']['ItemsCity']).region['country']] || 'standard',
        categories: [], // will be filled by trail importer service
        tags: [], // will be filled by trail importer service
        meta_data: [
            {
                key: 'identifier',
                value: trail.identifier,
            },
            {
                key: 'city_name',
                value: cityName,
            },
            {
                key: 'city_name_display',
                value: displayName,
            },
            {
                key: 'city_description',
                value: wantedTranslation['3']?.city_description || '',
            },
            {
                key: 'short_description',
                value: wantedTranslation['3']?.short_description || '',
            },
            {
                key: 'notes',
                value: wantedTranslation['3']?.notes || '',
            },
            {
                key: 'duration',
                value: getDurationInLanguage(trail.duration as '1 - 1.5h' | '1.5 - 2h' | '2h', lang),
            },
            {
                key: 'highlight_locations',
                value: highlightLocations ? highlightLocations.join(', ') : '',
            },
            {
                key: 'languages',
                value: languageAttributes
                    .map((l) => getLanguageNameTranslation(l.toLowerCase() as 'german' | 'english' | 'spanish' | 'portuguese' | 'french', WPMLanguageCodeMap[lang]))
                    .join(', '),
            },
            {
                key: 'additional_wheelchair',
                value: WheelchairTranslations[lang] || '',
            },
            {
                key: 'start_location_name',
                value: wantedTranslation['5']?.startlocation_name || fallbackTranslation['5'].startlocation_name,
            },
            {
                key: 'start_location_coordinates',
                value: trail.start_location,
            },
            {
                key: 'start_location_address',
                value: wantedTranslation['5']?.startlocation_address || fallbackTranslation['5'].startlocation_address,
            },
            {
                key: 'start_location_map_link',
                value: `https://www.google.com/maps/search/?api=1&query=${trail.start_location}`,
            },
            {
                key: 'end_location_name',
                value: endLocation.translations_2.find((t) => t.languages_code === lang)?.name || endLocation.translations_2.find((t) => t.languages_code === fallbackLang)?.name,
            },
            {
                key: 'partner_object',
                value: null, // will be filled by trail importer service
            },
            {
                // needed for ACF to recognize the object reference
                key: '_partner_object',
                value: 'field_63a060066b3bc',
            },
            {
                key: 'header_image',
                value: null, // will be filled by trail importer service
            },
        ],
        acf: { partner_object: null }, // will be filled by trail importer service
    };

    if (translation_of) {
        product.translation_of = translation_of;
    } else {
        product.sku = trail.identifier;
    }

    // just add the directus images, the importer service will upload them to wp
    if (trail.image) {
        product.images.push(trail.image as CustomImporterFile);
    }
    if (trail.image_carousel) {
        trail.image_carousel.forEach((image) => {
            product.images.push(image['directus_files_id']);
        });
    }

    return product;
}
