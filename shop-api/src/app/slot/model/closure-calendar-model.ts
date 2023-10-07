export class ClosureCalendarModel {
    constructor(
        public readonly id: number, //
        public readonly reason: {
            languages_code: string;
            reason_detail: string;
        }[],
        public readonly dateTimeFrom: string,
        public readonly dateTimeTo: string,
    ) {}
}
