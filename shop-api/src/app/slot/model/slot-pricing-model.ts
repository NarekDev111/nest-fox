import { TranslationModel } from './translation.model';

export class SlotPricingModel {
    constructor(
        public readonly slotId: number,
        public readonly datetime: string,
        public readonly stage: string,
        public readonly notifications: TranslationModel[],
        public readonly priceCategory: string,
        public readonly minUsersBooking: number | null,
        public readonly maxUsersBooking: number | null,
        public readonly minUsersTeam: number | null,
        public readonly maxUsersTeam: number | null,
        public readonly segments:
            | {
                  unitPrice: number;
                  minUsers: number | null;
                  maxUsers: number | null;
                  ageUntil: number | null;
                  autoApply: boolean | null;
                  ageFrom: number | null;
                  autoApplyConditions:
                      | {
                            userCount: number | null;
                            segmentId: string | null;
                        }[]
                      | null;
                  id: string;
              }[]
            | null,
    ) {}
}
