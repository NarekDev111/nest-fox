export interface StartruleTriggerPayload {
    trail: number | undefined;
    time: string | undefined;
    date_from: string | undefined;
    date_to: string | undefined;
    weekdays: string[] | undefined;
}

export interface StartruleTriggerModel {
    payload: StartruleTriggerPayload;
    // start_rule.items.create or start_rule.items.update
    event: string;
    // For the update (action) event, the keys are set.
    keys: string[] | undefined;
    key: string | undefined;
    collection: string;
}
