export interface TrailExportDto {
  identifier: string;
  event_locations: EventLocation[];
  translations: {
    startlocation_name: string;
    startlocation_address: string;
    find_back: string;
    short_description: string;
    city_description: string;
    city_name_suffix: string;
    notes: string;
  };
}

export interface EventLocation {
  uuid: string;
  screens: Screen[];
  team_tasks: Screen[];
  translations: {
    name: string;
    find_text: string;
    note_title: string;
    note_description: string;
  };
}

export interface Screen {
  type: string;
  identifier: string;
  translations: {
    title?: string;
    description?: string;
    explanation?: string;
    question?: string;
    hint?: any;
    solution: string;
  };
  answers?: Answer[];
}

export interface Answer {
  id: number;
  correct: boolean;
  answer: string;
}
