export class FilteredSlotModel {
    constructor(
        public readonly startRuleId: number | null,
        public readonly slotId: number, //
        public readonly datetime: string,
        public readonly stage: string,
    ) {}
}
