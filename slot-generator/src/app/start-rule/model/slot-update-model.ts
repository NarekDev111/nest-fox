export class SlotUpdateModel {
    constructor(
        readonly id: number, //
        readonly stage: string,
        readonly bookingId: string,
        readonly date: string,
        readonly time: string,
    ) {}
}
