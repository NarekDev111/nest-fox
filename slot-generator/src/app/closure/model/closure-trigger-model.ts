export interface Create {
    trails_id: {
        id: number;
    };
}

export interface Trails {
    create: Create[];
    delete: number[];
}

export interface ClosureTriggerPayload {
    application_period_from: string | undefined;
    application_period_until: string | undefined;
    closed_time_from: string | undefined;
    closed_time_until: string | undefined;
    weekdays: string[] | undefined;
    trails: Trails | number[];
    force: boolean | undefined;
}

export interface ClosureTriggerModel {
    payload: ClosureTriggerPayload;
    // closure.items.create or closure.items.update
    event: string;
    collection: string;
    // For the update event, the keys are set.
    keys: string[] | undefined;
    // For the create (action) event, the key is set.
    key: string | undefined;
}
