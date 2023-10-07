import { Injectable } from '@nestjs/common';
import { DirectusService, ExpCollection, ExpGetTrailResult } from '@foxtrail-backend/directus';
import { OpenaiService } from '@foxtrail-backend/openai';

@Injectable()
export class SigmaService {
    constructor(private readonly openaiService: OpenaiService, private readonly directusService: DirectusService) {}

    async generateInfoScreenDescriptions(countryId: string): Promise<string> {
        const trails = (await this.directusService.getAllTrails([
            '*.*',
            'city.translations.*',
            'event_location.translations_2.*',
            'event_location.screens.*',
            'event_location.screens.item.*',
            'event_location.screens.item.translations.*',
        ])) as ExpCollection['trails'][];
        let queries = [];
        trails.forEach((trail: ExpCollection['trails']) => {
            trail.event_location.forEach((eventLocation: ExpCollection['event_location']) => {
                eventLocation.screens.forEach((screen: ExpCollection['event_location_screens']) => {
                    if (screen.collection != 'info_screen') return;
                    queries.push({
                        trailId: trail.identifier,
                        eventLocationId: eventLocation.uuid,
                        cityName: ((trail.city as ExpCollection['city']).translations as ExpCollection['city_translations'][]).find((t) => t.languages_code == 'en-US')?.name,
                        eventLocationName: (eventLocation.translations_2 as ExpCollection['event_location_translations2'][]).find((t) => t.languages_code == 'en-US')?.name,
                        screenTitle: ((screen.item as ExpCollection['info_screen']).translations as ExpCollection['info_screen_translations'][]).find(
                            (t) => t.languages_code == 'en-US',
                        )?.title,
                        screenDescription: ((screen.item as ExpCollection['info_screen']).translations as ExpCollection['info_screen_translations'][]).find(
                            (t) => t.languages_code == 'en-US',
                        )?.description,
                    });
                });
            });
        });
        queries = queries.filter((q) => q.cityName && q.eventLocationName && q.trailId.startsWith(countryId));
        for (const query of queries) {
            const charLenght = query.screenDescription.length;
            const words = query.screenDescription.split(' ').length;
            console.log(charLenght, words);
            console.log('Generated info screen description for', query.screenTitle, 'in', query.cityName);
            const generatedDescription = await this.openaiService.getInfoScreenDescription(query.cityName, query.screenTitle);
            query.generatedDescription = generatedDescription[0].text.trim();
            console.log(query.generatedDescription);
        }

        const csvString = [
            ['City', 'Title', 'Original Description', 'Generated Description'],
            ...queries.map((item) => [
                item.cityName,
                item.screenTitle,
                item.screenDescription.trim().replace(/\r?\n|\r/g, ''),
                item.generatedDescription.trim().replace(/\r?\n|\r/g, ''),
            ]),
        ]
            .map((e) => e.join(';'))
            .join('\n');

        return csvString;
    }

    async generateSEODescriptions(trailId: string): Promise<string> {
        const trail = (await this.directusService.getTrail(trailId)) as ExpGetTrailResult;
        let queries = [];
        trail.event_location.forEach((eventLocation: ExpCollection['event_location']) => {
            queries.push({
                trailId: trail.identifier,
                eventLocationId: eventLocation.uuid,
                cityName: ((trail.city as ExpCollection['city']).translations as ExpCollection['city_translations'][]).find((t) => t.languages_code == 'en-US')?.name,
                eventLocationName: (eventLocation.translations_2 as ExpCollection['event_location_translations2'][]).find((t) => t.languages_code == 'en-US')?.name,
            });
        });
        queries = queries.filter((q) => q.cityName && q.eventLocationName && q.trailId == trailId);
        for (const query of queries) {
            const seoDescription = await this.openaiService.getSEODescription(query.cityName, query.eventLocationName);
            console.log('Generated SEO description for', query.eventLocationName, 'in', query.cityName);
            // const res = updateSEODescription(query.eventLocationId, seoDescription[0].text.trim());
            await this.directusService.createSEODescription(query.eventLocationId, seoDescription[0].text.trim());
        }

        return 'ok';
    }

    async generateSEODescription(cityName: string, eventLocationName: string): Promise<string> {
        console.log('Generating SEO description for', eventLocationName, 'in', cityName, '...');
        const seoDescription = await this.openaiService.getSEODescription(cityName, eventLocationName);
        console.log('Generated SEO description for', eventLocationName, 'in', cityName);
        return seoDescription[0].text.trim();
    }
}
