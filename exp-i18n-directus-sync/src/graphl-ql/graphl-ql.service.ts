import { Injectable } from '@nestjs/common';
import { ApolloClient, gql, InMemoryCache } from '@apollo/client/core';
import {
  Answer,
  EventLocation,
  Screen,
  TrailExportDto,
} from '../types/trail-export.dto';

const client = new ApolloClient({
  uri: 'https://content.explorial.com/graphql',
  headers: {
    Authorization: 'Bearer Ijfsa8f9j21398asfhasF-213fasd-01248POl',
  },
  cache: new InMemoryCache({
    possibleTypes: {
      event_location_screens_item_union: [
        'info_screen',
        'single_choice_quiz',
        'image_choice_quiz',
        'crossword',
        'photo_challenge',
        'estimation_slider_screen',
        'sort_quiz',
      ],
      event_location_team_tasks_item_union: [
        'single_choice_quiz',
        'image_choice_quiz',
        'crossword',
        'photo_challenge',
        'estimation_slider_screen',
        'sort_quiz',
      ],
      answer_item_union: ['single_choice_answer', 'image_choice_answer'],
    },
  }),
});

const GET_FULL_TRAIL = gql`
  query GetFullTrail($id: String! = "TEST", $language: String! = "en-US") {
    trails(filter: { identifier: { _eq: $id } }) {
      # General_Section
      identifier

      # trail.trail_locations
      event_location(sort: ["sort"]) {
        uuid

        # event_location.screens_group
        screens(sort: ["sort"]) {
          item {
            ...screenFragment
          }
        }
        team_tasks(sort: ["sort"]) {
          item {
            ...screenFragment
          }
        }

        # event_location.location_information_group
        translations_2(
          filter: { languages_code: { code: { _eq: $language } } }
        ) {
          name
          find_text
        }

        # event_location.location_note
        translations_1(
          filter: { languages_code: { code: { _eq: $language } } }
        ) {
          note_title
          note_description
        }
      }

      # trail.starting_information
      translations_5(filter: { languages_code: { code: { _eq: $language } } }) {
        startlocation_name
        startlocation_address
      }

      # trail.after_trail_section
      translations_4(filter: { languages_code: { code: { _eq: $language } } }) {
        find_back
      }

      # trail.trail_overview_section
      translations_3(filter: { languages_code: { code: { _eq: $language } } }) {
        short_description
        city_description
        city_name_suffix
        notes
      }
    }
  }

  fragment screenFragment on event_location_screens_item_union {
    __typename
    ... on info_screen {
      identifier
      translations(filter: { languages_code: { code: { _eq: $language } } }) {
        title
        description
      }
    }

    ... on single_choice_quiz {
      identifier
      translations_2(filter: { languages_code: { code: { _eq: $language } } }) {
        question
        hint
      }
      answers(sort: ["sort"]) {
        id
        correct
        translations(filter: { languages_code: { code: { _eq: $language } } }) {
          answer
        }
      }
      translations(filter: { languages_code: { code: { _eq: $language } } }) {
        explanation
      }
    }
    ... on image_choice_quiz {
      identifier
      translations(filter: { languages_code: { code: { _eq: $language } } }) {
        question
        hint
      }
      translations_2(filter: { languages_code: { code: { _eq: $language } } }) {
        explanation
      }
    }
    ... on crossword {
      identifier
      translations(filter: { languages_code: { code: { _eq: $language } } }) {
        question
        hint
      }
      translations_4(filter: { languages_code: { code: { _eq: $language } } }) {
        solution
      }
      translations_3(filter: { languages_code: { code: { _eq: $language } } }) {
        explanation
      }
    }
    ... on estimation_slider_screen {
      identifier
      translations_1(filter: { languages_code: { code: { _eq: $language } } }) {
        question
        hint
      }
      translations_3(filter: { languages_code: { code: { _eq: $language } } }) {
        explanation
      }
    }
    ... on photo_challenge {
      identifier
      translations(filter: { languages_code: { code: { _eq: $language } } }) {
        description
      }
    }
    ... on sort_quiz {
      identifier
      translations(filter: { languages_code: { code: { _eq: $language } } }) {
        question
        hint
      }
      answers(sort: ["sort"]) {
        id
        translations_1(
          filter: { languages_code: { code: { _eq: $language } } }
        ) {
          answer
        }
      }
      translations_1(filter: { languages_code: { code: { _eq: $language } } }) {
        explanation
      }
    }
  }
`;

@Injectable()
export class GraphlQlService {
  async exportTrail(
    trailIdentifier: string,
    targetLanguage: string,
  ): Promise<TrailExportDto> {
    const result = await client.query({
      query: GET_FULL_TRAIL,
      variables: {
        id: trailIdentifier,
        language: targetLanguage,
      },
    });
    return this.mergeTranslations(result.data.trails[0]);
  }

  private mergeTranslations(trail: any): TrailExportDto {
    function mapAnswers(screen: any): Answer[] {
      return screen.answers?.map((answer: any) => ({
        id: Number(answer.id),
        correct: answer.correct,
        answer:
          answer.translations?.[0]?.answer ??
          answer.translations_1?.[0]?.answer,
      }));
    }

    function mapScreenItem(screenItem: any): any {
      return {
        identifier: screenItem.identifier,
        type: screenItem.__typename,
        translations: {
          title: screenItem.translations?.[0]?.title,
          description: screenItem.translations?.[0]?.description,
          question:
            screenItem.translations?.[0]?.question ??
            screenItem.translations_1?.[0]?.question ??
            screenItem.translations_2?.[0]?.question,
          hint:
            screenItem.translations?.[0]?.hint ??
            screenItem.translations_1?.[0]?.hint ??
            screenItem.translations_2?.[0]?.hint,
          explanation:
            screenItem.translations?.[0]?.explanation ??
            screenItem.translations_1?.[0]?.explanation ??
            screenItem.translations_2?.[0]?.explanation ??
            screenItem.translations_3?.[0]?.explanation,
          solution: screenItem.translations_4?.[0]?.solution,
        },
        answers: mapAnswers(screenItem),
      };
    }

    function mapScreens(eventLocation: any): {
      screens: Screen[];
      teamTasks: Screen[];
    } {
      const mapScreen = (screen: any) => mapScreenItem(screen.item);

      const screens = eventLocation.screens.map(mapScreen);
      const teamTasks = eventLocation.team_tasks.map(mapScreen);

      return { screens, teamTasks };
    }

    function mapEventLocations(trail: any): EventLocation[] {
      return trail.event_location.map((eventLocation: any) => {
        return {
          uuid: eventLocation.uuid,
          translations: {
            name: eventLocation.translations_2[0]?.name,
            find_text: eventLocation.translations_2[0]?.find_text,
            note_title: eventLocation.translations_1[0]?.note_title,
            note_description: eventLocation.translations_1[0]?.note_description,
          },
          screens: mapScreens(eventLocation).screens,
          team_tasks: mapScreens(eventLocation).teamTasks,
        };
      });
    }

    return {
      identifier: trail.identifier,
      event_locations: mapEventLocations(trail),
      translations: {
        short_description: trail.translations_3?.[0]?.short_description,
        city_description: trail.translations_3?.[0]?.city_description,
        city_name_suffix: trail.translations_3?.[0]?.city_name_suffix,
        notes: trail.translations_3?.[0]?.notes,
        find_back: trail.translations_4?.[0]?.find_back,
        startlocation_name: trail.translations_5?.[0]?.startlocation_name,
        startlocation_address: trail.translations_5?.[0]?.startlocation_address,
      },
    };
  }
}
