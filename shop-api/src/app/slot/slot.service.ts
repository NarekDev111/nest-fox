import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@foxtrail-backend/prisma';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import { FilteredSlotModel } from './model/filtered-slot-model';
import { SlotPricingModel } from './model/slot-pricing-model';
import { ClosureCalendarModel } from './model/closure-calendar-model';
import { Rule } from '../helpers/rschedule';
import { TranslationModel } from './model/translation.model';

@Injectable()
export class SlotService {
    private readonly logger = new Logger(SlotService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getSlots(year: number, month: number, trailID: number): Promise<FilteredSlotModel[]> {
        //select all slots in a month for a trail id
        const allSlotsInMonth = await this.prisma.slot.findMany({
            where: {
                trail: trailID,
                date_time: {
                    gte: new Date(year, month - 1, 1),
                    lt: new Date(year, month, 1),
                },
            },
        });

        return allSlotsInMonth.map((slot) => {
            return new FilteredSlotModel(
                slot.start_rule_id,
                slot.id, //
                slot.date_time.toISOString().slice(0, -1),
                slot.stage,
            );
        });
    }

    async getPricing(slotId: number): Promise<SlotPricingModel> {
        this.logger.log('Get Pricing for Slot-ID: ' + slotId);
        const slot = await this.prisma.slot.findUnique({
            where: {
                id: slotId,
            },
            include: {
                trails: {
                    select: {
                        id: true,
                        price_category: true,
                    },
                },
            },
        });

        if (slot != undefined) {
            const urgentNotifications = await this.getUrgentNotificationsForSlot(slot.trails.id, slot.date_time);

            const priceCategory = slot.trails.price_category;

            if (priceCategory == null) {
                throw new Error('Price category not set for trail ' + slot.trails.id);
            }

            const ticketProduct = await this.prisma.ticket_product.findUnique({
                where: {
                    name: 'Classic',
                },
                include: {
                    ticket_price: {
                        include: {
                            //TODO: Rename this foreign key (?)
                            ticket_segment_ticket_price_ticket_segmentToticket_segment: {
                                include: {
                                    //TODO: Rename this foreign key (?)
                                    ticket_segment_condition_ticket_segment_condition_source_ticket_segmentToticket_segment: true,
                                },
                            },
                        },
                    },
                },
            });

            if (ticketProduct == null) {
                throw new Error('Ticket product "Classic" not found');
            }

            const prices = ticketProduct?.ticket_price
                .filter((ticketPrice) => {
                    return (
                        ticketPrice.price_category === priceCategory &&
                        ticketPrice.valid_from <= slot.date_time &&
                        (ticketPrice.valid_until == null || ticketPrice.valid_until >= slot.date_time)
                    );
                })
                .map((ticketPrice) => {
                    if (ticketPrice.ticket_segment_ticket_price_ticket_segmentToticket_segment != undefined) {
                        return {
                            id: ticketPrice.ticket_segment_ticket_price_ticket_segmentToticket_segment.id,
                            minUsers: ticketPrice.ticket_segment_ticket_price_ticket_segmentToticket_segment.min_user_in_segment,
                            maxUsers: ticketPrice.ticket_segment_ticket_price_ticket_segmentToticket_segment.max_user_in_segment,
                            ageFrom: ticketPrice.ticket_segment_ticket_price_ticket_segmentToticket_segment.age_from,
                            ageUntil: ticketPrice.ticket_segment_ticket_price_ticket_segmentToticket_segment.age_until,
                            autoApply: ticketPrice.ticket_segment_ticket_price_ticket_segmentToticket_segment.auto_apply,
                            autoApplyConditions:
                                ticketPrice.ticket_segment_ticket_price_ticket_segmentToticket_segment.ticket_segment_condition_ticket_segment_condition_source_ticket_segmentToticket_segment.map(
                                    (condition) => {
                                        return {
                                            userCount: condition.user_count_condition,
                                            segmentId: condition.target_ticket_segment,
                                        };
                                    },
                                ),
                            unitPrice: Number(ticketPrice.unit_price),
                        };
                    } else {
                        this.logger.error(`Ticket segment not found for ticket price ${ticketPrice.id}!`);
                        this.logger.log(ticketPrice);
                        throw new Error('Ticket segment not found');
                    }
                });

            if (prices == undefined || prices.length != 3) {
                this.logger.log(ticketProduct);
                this.logger.log(prices);
                this.logger.error(`Expected 3 prices, got ${prices?.length}`);
            }

            return new SlotPricingModel(
                slot.id,
                slot.date_time.toISOString().slice(0, -1),
                slot.stage,
                urgentNotifications,
                priceCategory,
                ticketProduct.min_user_in_booking,
                ticketProduct.max_user_in_booking,
                ticketProduct.min_user_per_team,
                ticketProduct.max_user_per_team,
                [...prices],
            );
        } else {
            throw new Error('Slot not found');
        }
    }

    /**
     * Get all closures for a specific year and trail. This is used to display them in the calendar frontend and the web-shop.
     * @param year
     * @param month
     * @param trailId
     */
    async getClosures(year: number, month: number | null, trailId: number): Promise<ClosureCalendarModel[]> {
        console.log('Get closures for trail ' + trailId + ' in ' + year + '-' + month);
        console.log(
            moment
                .utc()
                .year(year)
                .month(month - 1)
                .endOf('month')
                .toDate()
                .toISOString(),
        );
        console.log(
            moment
                .utc()
                .year(year)
                .month(month - 1)
                .startOf('month')
                .toDate() // last day of selected month
                .toISOString(),
        );
        const closures = await this.prisma.closure.findMany({
            where: {
                closure_trails: {
                    some: {
                        trails_id: trailId,
                    },
                },
                AND: [
                    {
                        application_period_from: {
                            lte: moment
                                .utc()
                                .year(year)
                                .month(month - 1)
                                .endOf('month')
                                .toDate(), // last day of selected month
                        },
                    },
                    {
                        OR: [
                            {
                                application_period_until: {
                                    gte: moment
                                        .utc()
                                        .year(year)
                                        .month(month - 1)
                                        .startOf('month')
                                        .toDate(), // last day of selected month
                                },
                            },
                            {
                                application_period_until: {
                                    equals: null,
                                },
                            },
                        ],
                    },
                ],
            },
            include: {
                closure_translations: {
                    select: {
                        languages_code: true,
                        reason_detail: true,
                    },
                },
            },
        });
        const occurrences: ClosureCalendarModel[] = [];
        for (const closure of closures) {
            if (closure.rule != null) {
                const closureRule = Rule.fromJSON(JSON.parse(closure.rule.toString()));
                const occurencesInGivenYear = closureRule.occurrences({
                    start: moment().year(year).startOf('year'),
                    end: moment().year(year).endOf('year'),
                });

                for (const date of occurencesInGivenYear) {
                    const dateTimeFrom = moment.utc(date.toDateTime().date).set({
                        hour: closure.closed_time_from?.getHours() ?? 0,
                        minute: closure.closed_time_from?.getMinutes() ?? 0,
                        second: 0,
                        millisecond: 0,
                    });
                    const dateTimeTo = moment.utc(date.toDateTime().date).set({
                        hour: closure.closed_time_until?.getHours() ?? 23,
                        minute: closure.closed_time_until?.getMinutes() ?? 59,
                        second: 0,
                        millisecond: 0,
                    });
                    occurrences.push(
                        new ClosureCalendarModel(
                            closure.id, //
                            closure.closure_translations,
                            dateTimeFrom.toISOString().slice(0, -1),
                            dateTimeTo.toISOString().slice(0, -1),
                        ),
                    );
                }
            } else {
                throw new Error(`Closure ${closure.id} has no rule!`);
            }
        }

        return occurrences;
    }

    /**
     * Sells a slot.
     * This will close all slots from the same trail_group and the same datetime.
     * @param slotId
     * @param updateData
     */
    async updateSlot(slotId: number, updateData: Prisma.slotUncheckedUpdateInput) {
        const slot = await this.prisma.slot.findUnique({
            where: {
                id: slotId,
            },
            select: {
                trail: true,
                date_time: true,
                team: true,
                trails: {
                    select: {
                        trailgroup_trails: {
                            select: {
                                trails: {
                                    select: {
                                        id: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (slot.team != null) {
            this.logger.log(updateData);
            console.log(slot.date_time);
            throw new Error(`Slot ${slotId} is already occupied by team ${slot.team}`);
        }

        // ...Update the specified slot
        await this.prisma.slot.update({
            where: {
                id: slotId,
            },
            data: updateData,
        });

        // ...Update all slots from the same trail_group and the same datetime
        const trailIds = slot.trails.trailgroup_trails?.trails.map((trail) => trail.id) ?? [];
        // Clear the team from the update data, since team should be unique.
        updateData.team = undefined;
        await this.prisma.slot.updateMany({
            where: {
                AND: {
                    trail: {
                        in: trailIds,
                    },
                    date_time: slot.date_time,
                },
            },
            data: updateData,
        });
    }

    /**
     * Register a team for a slot. This will also create a (virtual) slot if the start-time slot does not exist yet.
     * Also closes other slots of there are any with a 14min overlap.
     * @param teamId
     */
    async registerTeam(teamId: number) {
        this.logger.log('Registering team ' + teamId);

        // 1. Get the team and the start date.
        const team = await this.prisma.team.findUnique({
            where: {
                id: teamId,
            },
        });

        // 2. Update the slot if it can be found, otherwise create a new slot
        const startTime = moment.utc(team.start_time);
        const slot = await this.prisma.slot.findFirst({
            where: {
                trail: team.trail,
                date_time: startTime.toDate(),
            },
        });

        // 2.5 Connect the slot to the team
        if (slot == null) {
            const newVirtualSlot = await this.prisma.slot.create({
                data: {
                    trail: team.trail,
                    date_time: startTime.toDate(),
                    team: team.id,
                    stage: 'sold',
                },
            });
            this.logger.log('Created new (virtual) slot ' + newVirtualSlot.id);
        } else {
            this.logger.log('Found existing slot ' + slot.id + '. Updating...');
            await this.updateSlot(slot.id, { team: team.id, stage: 'sold' });
            this.logger.log('Updated existing slot ' + slot.id);
        }

        // 3. Close +/- 14 min slots
        const additionalClosedSlots = await this.prisma.slot.findMany({
            where: {
                trail: team.trail,
                date_time: {
                    in: [
                        moment(startTime).subtract(14, 'minutes').toDate(), //
                        moment(startTime).add(14, 'minutes').toDate(),
                    ],
                },
            },
        });
        //loop
        for (const slot of additionalClosedSlots) {
            await this.updateSlot(slot.id, { stage: 'closed' });
        }

        this.logger.log(`Closed ${additionalClosedSlots.length} other slots for trail ${team.trail} and team ${team.id}`);
    }

    private async getUrgentNotificationsForSlot(trailId: number, slotDateTime: Date): Promise<TranslationModel[]> {
        const urgentNotifications = await this.prisma.urgent_notification.findMany({
            where: {
                AND: {
                    trail: trailId,
                    OR: [
                        {
                            show_until: null,
                        },
                        {
                            show_until: {
                                gte: slotDateTime,
                            },
                        },
                    ],
                    show_from: {
                        lte: slotDateTime,
                    },
                },
            },
            include: {
                urgent_notification_translations: {
                    select: {
                        languages_code: true,
                        notification: true,
                    },
                },
            },
        });
        return urgentNotifications.flatMap((notification) => {
            return notification.urgent_notification_translations.map((translation) => {
                return new TranslationModel(translation.languages_code, translation.notification ?? '');
            });
        });
    }
}
