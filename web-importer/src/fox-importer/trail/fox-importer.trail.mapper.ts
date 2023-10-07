import { TypeOf } from '@directus/sdk';
import slugify from 'slugify';
import { getActivePriceSegments, roundHalf } from '../fox-importer.helpers';
import { getDurationSlugs, getLanguageNameTranslation, TrailLanguageNameMap, WPBookingRoleMap, WPMLanguageCodeMap } from '../fox-importer.wpml';
import { FoxCollection } from '@foxtrail-backend/directus';
import { ArbitraryField, Attribute, CustomImporterFile, Product } from '@foxtrail-backend/woocommerce';

export function transformTrail(
    trail: TypeOf<FoxCollection, 'trails'>,
    lang: keyof typeof WPMLanguageCodeMap,
    availableAttributes: Attribute[],
    availableTaxClasses,
    availableLanguageAttributes,
    availablePlayingTimeAttributes,
    translation_of: number | null = null,
): Product {
    const translation = (trail.translations as FoxCollection['trails_translations'][]).find((t) => t.languages_id === WPMLanguageCodeMap[lang]);
    if (!translation) throw new Error(`No translation found for trail ${trail.id} in language ${lang}.`);

    const languageAttributes: string[] = [];
    (trail.trail_languages as FoxCollection['trails_trail_languages'][]).forEach((language) => {
        languageAttributes.push(getLanguageNameTranslation(TrailLanguageNameMap[language.trail_languages_id as string], lang) as string);
    });

    if (
        !languageAttributes.every((languageAttribute) =>
            availableLanguageAttributes
                .filter((l) => l.lang == lang)
                .map((l) => l.name)
                .includes(languageAttribute),
        )
    ) {
        throw new Error(`At least one trail language is not available as attribute in woocommerce.`);
    }

    const durationSlugs: string[] = getDurationSlugs(trail.playtime_dec);

    // TODO currently only classic ticket product is imported
    const ticketProduct = (trail.ticket_products as FoxCollection['ticket_product_trails'][]).find(
        (tp) => (tp.ticket_product_id as FoxCollection['ticket_product']).name == 'Classic',
    )?.ticket_product_id as FoxCollection['ticket_product'];

    const activeSegments = getActivePriceSegments(ticketProduct, trail.price_category as string);

    const product: Product = {
        name: translation.name?.trim() || 'Undefined',
        type: 'ft_booking',
        // regular_price: activeSegments.find((price) => (price.ticket_segment as components['schemas']['ItemsTicketSegment']).id == 'adult')?.unit_price.toString(), // activeSegments.reduce((r, price) => (r.unit_price < price.unit_price ? r : price)).unit_price?.toString(),
        images: [],
        lang: lang,
        status: 'publish',
        catalog_visibility: 'visible',
        attributes: [
            {
                id: availableAttributes.find((a) => a.slug == 'pa_languages')?.id,
                visible: true,
                options: languageAttributes,
            },
            {
                id: availableAttributes.find((a) => a.slug == 'pa_playing-time')?.id,
                visible: true,
                options: availablePlayingTimeAttributes.filter((a) => a.lang == lang && durationSlugs.includes(a.slug)).map((a) => a.name),
            },
            {
                id: availableAttributes.find((a) => a.slug == 'pa_bookable')?.id,
                visible: true,
                options: trail.bookings_status ? 'yes' : 'no',
            },
            {
                id: availableAttributes.find((a) => a.slug == 'pa_booking-roles')?.id,
                visible: false,
                options: trail.booking_roles?.map((r) => WPBookingRoleMap[r]),
            },
            {
                id: availableAttributes.find((a) => a.slug == 'pa_weitere')?.id,
                visible: true,
                options: [
                    ...(trail.dogs_allowed ? ['Hunde erlaubt'] : []),
                    ...(trail.wheelchair ? ['Rollstuhl tauglich'] : []),
                    ...(trail.baby_stroller ? ['Kinderwagen tauglich'] : []),
                ],
            },
        ],
        tax_status: 'taxable',
        tax_class: '' /* WCTaxClassMap[(trail.city as components['schemas']['ItemsCity']).region['country']] */,
        categories: [], // will be populated by trail importer service
        tags: [], // will be populated by trail importer service
        reviews_allowed: false,
        meta_data: [
            {
                key: '_ft_booking_ticket_product',
                value: 'Classic',
            },
            {
                key: '_ft_booking_price_category',
                value: trail.price_category as string,
            },
            {
                key: '_ft_booking_minimum_number_of_required_participant',
                value: ticketProduct.min_user_in_booking?.toString(),
            },
            {
                key: '_ft_booking_maximum_number_of_allowed_participant',
                value: ticketProduct.max_user_in_booking?.toString(),
            },
            {
                key: '_ft_booking_minimum_number_of_required_participant_per_team',
                value: ticketProduct.min_user_per_team?.toString(),
            },
            {
                key: '_ft_booking_maximum_number_of_allowed_participant_per_team',
                value: ticketProduct.max_user_per_team?.toString(),
            },
            {
                key: '_ft_booking_persons_pricing_rules',
                value: activeSegments.map((price) => {
                    const ticketSegment = price.ticket_segment as FoxCollection['ticket_segment'];
                    return {
                        ft_booking_persons_rule_type: ticketSegment.id,
                        ft_booking_persons_rule_min: ticketSegment.min_user_in_segment?.toString() || '0',
                        ft_booking_persons_rule_max: ticketSegment.max_user_in_segment?.toString() || ticketProduct.max_user_per_team?.toString(),
                        ft_booking_persons_rule_age_from: ticketSegment.age_from?.toString() || '',
                        ft_booking_persons_rule_age_until: ticketSegment.age_until?.toString() || '',
                        ft_booking_persons_rule_cost_per_unit: price.unit_price?.toString(),
                        ft_booking_persons_rule_auto_apply: ticketSegment.auto_apply,
                        ft_booking_persons_rule_conditions: ticketSegment.auto_apply_conditions?.map((cond: FoxCollection['ticket_segment_condition']) => {
                            return {
                                ft_booking_persons_rule_condition_target: cond.target_ticket_segment,
                                ft_booking_persons_rule_condition_user_count: cond.user_count_condition,
                            };
                        }),
                    };
                }) as ArbitraryField[],
            },
            {
                key: 'description',
                value: translation.description || 'undefined',
            },
            {
                key: 'playtime',
                value: roundHalf(trail.playtime_dec).toString(),
            },
            {
                key: 'playtime_display',
                value: `${(roundHalf(trail.playtime_dec) - 0.5).toString()}-${(roundHalf(trail.playtime_dec) + 0.5).toString()}`,
            },
            {
                key: 'arrival_instructions',
                value: translation.arrival_instructions || '',
            },
            {
                key: 'start_location',
                value: translation.start_location || 'undefined',
            },
            {
                key: 'finish_location',
                value: translation.finish_location || 'undefined',
            },
            {
                key: 'route',
                value: translation.route || 'undefined',
            },
            {
                key: 'dogs_allowed',
                value: trail.dogs_allowed || '0',
            },
            {
                key: 'wheelchair',
                value: trail.wheelchair || '0',
            },
            {
                key: 'baby_stroller',
                value: trail.baby_stroller || '0',
            },
            {
                key: 'languages',
                value: languageAttributes.join(', '),
            },
            {
                key: 'partner_object',
                value: [], // will be populated by trail importer
            },
            {
                key: 'paper_ticket',
                value: trail.ticket_physical || '0',
            },
            // ACF field references
            {
                key: '_partner_object',
                value: 'field_636138a19cacf',
            },
            {
                key: '_baby_stroller',
                value: 'field_636111f65d318',
            },
            {
                key: '_wheelchair',
                value: 'field_636111ea5d317',
            },
            {
                key: '_dogs_allowed',
                value: 'field_636111d65d316',
            },
            {
                key: '_playtime',
                value: 'field_636111835d315',
            },
            {
                key: '_languages',
                value: 'field_63725f246fcdd',
            },
            {
                key: '_start_location',
                value: 'field_63610f6774522',
            },
            {
                key: '_finish_location',
                value: 'field_63610f8c74523',
            },
            {
                key: '_route',
                value: 'field_63725ecf6fcdc',
            },
            {
                key: '_arrival_instructions',
                value: 'field_63725e9e6fcdb',
            },
            {
                key: '_paper_ticket',
                value: 'field_63a55ad6928da',
            },
            {
                key: 'shoptimizer_layout_pdp_short_description_position',
                value: 'default',
            },
            {
                key: '_wpml_media_duplicate',
                value: '0',
            },
            {
                key: '_wpml_media_featured',
                value: '0',
            },
            {
                key: '_playtime_display',
                value: 'field_63dcc96ca5c81',
            },
        ],
    };

    if (translation_of) {
        product.translation_of = translation_of;
    } else {
        product.sku = trail.id?.toString();
    }

    if (trail.tile_image_file) {
        product.images?.push(trail.tile_image_file as CustomImporterFile);
    }
    if (trail.image_gallery_files) {
        trail.image_gallery_files.forEach((image) => {
            product.images?.push(image['directus_files_id']);
        });
    }

    return product;
}

function createTrailSlug(cityName, trailId, lang: keyof typeof WPMLanguageCodeMap) {
    const t = trailId.split('_');
    const trailNo = t[t.length - 1];
    switch (lang) {
        case 'en':
            return slugify(`city-tour-${cityName}-${trailNo}`, { lower: true, trim: true });
        case 'de':
            return slugify(`staedtetour-${cityName}-${trailNo}`, { lower: true, trim: true });
        case 'fr':
            return slugify(`tour-de-la-ville-${cityName}-${trailNo}`, { lower: true, trim: true });
    }
}
