import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@foxtrail-backend/prisma';
import moment from 'moment/moment';
import { Rule, DateAdapter } from '../helpers/rschedule';
import { ClosureTriggerModel } from './model/closure-trigger-model';
import { SlotUpdateModel } from '../start-rule/model/slot-update-model';
import { Prisma } from '@prisma/client';
import { DirectusService } from '@foxtrail-backend/directus';
import { DirectusValidationModel } from '../model/directus-validation.model';

@Injectable()
export class ClosureService {
    private readonly logger = new Logger(ClosureService.name);

    constructor(
        private readonly prisma: PrismaService, //
        private readonly directusService: DirectusService,
    ) {}

    /**
     * Closes the slots that are affected by this closure(s).
     * @param body
     */
    async upsertClosure(body: ClosureTriggerModel) {
        const closureIds = body.keys ? body.keys.map((key) => parseInt(key)) : body.key ? parseInt(body.key) : undefined;
        if (!closureIds) {
            throw new Error(`Closure ids is not set!`);
        }

        const closures = await this.prisma.closure.findMany({
            where: {
                id: {
                    in: closureIds,
                },
            },
            include: {
                closure_trails: {
                    include: {
                        trails: {
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
        });

        // Free the slots that are affected from these closure(s), will be re-applied (if applicable) afterwards.
        // This makes it easier to check which slots are affected by the update. (Won't do anything for insert)
        await this.freeAndCheckStageForSlots(closures.map((closure) => closure.id));

        for (const closure of closures) {
            const rule = this.createRule(closure) as Rule;
            const affectedSlots = await this.getAllAffectedSlots(
                rule,
                closure.closure_trails.map((trail) => trail.trails_id),
            );

            const directusTasks = this.directusService.getDirectusInstance().items('task');

            for (const slot of affectedSlots) {
                if (slot.stage == 'sold') {
                    await this.directusService.createTaskIfSlotSold(slot.id, directusTasks);
                }
            }

            const prismaSlots = this.prisma.slot.updateMany({
                where: {
                    id: {
                        in: affectedSlots.map((slot) => slot.id),
                    },
                },
                data: {
                    stage: 'closed',
                },
            });

            const prismaSlotClosures = this.prisma.slot_closure.createMany({
                data: affectedSlots.map((slot) => {
                    return {
                        slot_id: slot.id,
                        closure_id: closure.id,
                    };
                }),
            });

            const prismaClosure = this.prisma.closure.update({
                where: {
                    id: closure.id,
                },
                data: {
                    rule: JSON.stringify(rule.toJSON()),
                    force: false,
                },
            });

            // All in the same transaction to speed up the process a bit...
            await this.prisma.$transaction([prismaSlots, prismaSlotClosures, prismaClosure]);
        }
    }

    /**
     * Only validates the closure, won't do any DB changes.
     * @param body
     */
    async validateUpsertClosure(body: ClosureTriggerModel): Promise<DirectusValidationModel> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (body.event == 'closure.items.create') {
            const rule = this.createRule(body.payload);
            if (rule instanceof Rule) {
                const trailIds = this.extractTrailIds(body);

                const affectedSlots = await this.getAllAffectedSlots(rule, trailIds);
                if (affectedSlots.length > 0) {
                    const slotsString = affectedSlots.reduce((acc, slot) => {
                        return acc + slot.bookingId + ' -> ' + slot.date + ' ' + slot.time + '\n / ';
                    }, '');
                    warnings.push(`The following ${affectedSlots.length} slot(s) would be affected by this closure: \n${slotsString}`);
                }
            } else {
                errors.push(...rule);
            }
        } else if (body.event == 'closure.items.update') {
            // keys is an array of ids, therefore potential multiple closures have to be checked
            return await this.validateUpdateClosures(body);
        } else {
            throw new Error(`Event ${body.event} not supported`);
        }

        return new DirectusValidationModel(errors, warnings);
    }

    private extractTrailIds(body: ClosureTriggerModel) {
        let trailIds: number[] = [];
        // Check if body.payload.trails is of type number[] or Trails
        if (Array.isArray(body.payload.trails)) {
            trailIds = body.payload.trails;
        } else if (body.payload.trails.create) {
            trailIds = body.payload.trails?.create?.map((trail) => trail.trails_id.id);
        }
        return trailIds ?? [];
    }

    private async validateUpdateClosures(body: ClosureTriggerModel): Promise<DirectusValidationModel> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Merge the already existing closure with the payload.
        // This is needed because the payload only contains the changed data and is NOT yet in the DB.
        const keys = body.keys?.map((str) => {
            return parseInt(str, 10);
        });
        if (!keys) {
            throw new Error(`Closure update event needs keys!`);
        }
        const closures = await this.prisma.closure.findMany({
            where: {
                id: {
                    in: keys,
                },
            },
            include: {
                closure_trails: {
                    select: {
                        trails_id: true,
                    },
                },
            },
        });

        const result: SlotUpdateModel[] = [];
        for (const closure of closures) {
            // Merge the already existing rule with the payload.
            // This is needed because the payload only contains the changed data and is NOT yet in the DB.
            const mergedRule = this.createRule({
                closed_time_from: body.payload.closed_time_from ?? closure.closed_time_from,
                closed_time_until: body.payload.closed_time_until ?? closure.closed_time_until,
                application_period_from: body.payload.application_period_from ?? closure.application_period_from,
                application_period_until: body.payload.application_period_until ?? closure.application_period_until,
                weekdays: body.payload.weekdays ?? closure.weekdays,
            });

            if (mergedRule instanceof Rule) {
                let trailIds = closure.closure_trails.map((closureTrail) => closureTrail.trails_id);
                if ((body.payload.trails as any)?.create !== undefined) {
                    trailIds = trailIds.concat((body.payload.trails as any).create.map((trail) => trail.trails_id.id));
                }
                if ((body.payload.trails as any)?.delete) {
                    trailIds = trailIds.filter((trailId) => {
                        return !(body.payload.trails as any).delete?.some((trail) => trail == trailId);
                    });
                }

                const affectedSlots = await this.getAllAffectedSlots(mergedRule, trailIds);
                result.push(...affectedSlots.filter((slot) => slot.stage == 'sold'));
            } else {
                errors.push(...mergedRule);
            }
        }

        if (result.length > 0) {
            const slotsString = result.reduce((acc, slot) => {
                return acc + slot.bookingId + ' -> ' + slot.date + ' ' + slot.time + '\n / ';
            }, '');
            warnings.push(`The following ${result.length} slot(s) would be affected by this closure: \n${slotsString}`);
        }

        return new DirectusValidationModel(errors, warnings);
    }

    /**
     * Returns either a Rule or an array of errors.
     * @param closure
     * @private
     */
    private createRule(closure: {
        application_period_from: string | Date | undefined;
        application_period_until: string | Date | null | undefined;
        closed_time_from: string | Date | undefined;
        closed_time_until: string | Date | undefined;
        weekdays: string[] | Prisma.JsonValue | undefined;
    }): Rule | string[] {
        closure.weekdays = closure.weekdays ?? ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
        const errors = this.validateRule(closure);
        if (errors.length > 0) {
            return errors;
        }
        // "YYYY-MM-DD"
        const dateFromString =
            closure.application_period_from instanceof Date //
                ? moment.utc(closure.application_period_from).format('YYYY-MM-DD')
                : closure.application_period_from;
        // HH:mm:ss
        const timeFrom =
            closure.closed_time_from instanceof Date //
                ? moment.utc(closure.closed_time_from).format('HH:mm:ss')
                : closure.closed_time_from ?? '00:00:00';
        const timeUntil =
            closure.closed_time_until instanceof Date //
                ? moment.utc(closure.closed_time_until).format('HH:mm:ss')
                : closure.closed_time_until ?? '23:59:59';
        const endDateTime =
            closure.application_period_until != null //
                ? moment.utc(moment.utc(closure.application_period_until).format('YYYY-MM-DD') + 'T' + timeUntil)
                : undefined;

        const fromDatetime = moment.utc(dateFromString + 'T' + timeFrom);
        const durationInMs = Math.abs(fromDatetime.diff(moment.utc(dateFromString + 'T' + timeUntil), 'milliseconds') as number);
        const byDayOfWeek = (closure.weekdays as string[]).map((weekday) => {
            const dateAdapterWd = DateAdapter.WEEKDAYS.find((day) => day == weekday);
            if (dateAdapterWd !== undefined) {
                return dateAdapterWd;
            } else {
                throw Error('Weekday is undefined!');
            }
        });
        const rule = new Rule({
            frequency: 'DAILY',
            byDayOfWeek: byDayOfWeek,
            start: fromDatetime,
            duration: durationInMs,
            end: endDateTime,
        });
        this.logger.log(`Created rule:`);
        this.logger.log(rule);
        return rule;
    }

    private async getAllAffectedSlots(rule: Rule, trailIds: number[]): Promise<SlotUpdateModel[]> {
        const result: SlotUpdateModel[] = [];
        const notClosedSlots = await this.prisma.slot.findMany({
            where: {
                trail: {
                    in: trailIds,
                },
                stage: {
                    not: 'closed',
                },
                date_time: {
                    gte: moment().toDate(),
                },
            },
        });

        for (const slot of notClosedSlots) {
            const occursOn = rule.occursOn({
                date: moment.utc(slot.date_time),
                // 86400000 ms = 1 day
                maxDuration: 86400000,
            });
            if (occursOn) {
                const slotDate = moment.utc(slot.date_time);
                result.push({
                    id: slot.id,
                    stage: slot.stage,
                    bookingId: slot.id.toString(),
                    date: slotDate.format('YYYY-MM-DD'),
                    time: slotDate.format('HH:mm:ss'),
                });
            }
        }

        // Summarize the slots by stage
        const counts = result.reduce((p, c) => {
            const stage = c.stage;
            // eslint-disable-next-line no-prototype-builtins
            if (!p.hasOwnProperty(stage)) {
                p[stage] = 0;
            }
            p[stage]++;
            return p;
        }, {});

        this.logger.log(`Found the following slots that will be affected by the closure:`);
        this.logger.log(counts);

        return result;
    }

    async deleteClosure(closureIds: number[]) {
        const closures = await this.prisma.slot_closure.findMany({
            where: {
                closure_id: {
                    in: closureIds,
                },
            },
        });
        const updatedSlots = await this.prisma.slot.updateMany({
            where: {
                id: {
                    in: closures.map((closure) => closure.slot_id),
                },
            },
            data: {
                stage: 'available',
            },
        });
        this.logger.log(`The deletion of the closure made ${updatedSlots.count} slots available again.`);
    }

    /**
     * Free all slots that are affected by the closure and check if the stage of the slot is still valid.
     * If the stage is available again, the slot will be set to 'available'.
     * But because a slot can be affected by multiple closures, the slot will only be set to 'available' if all closures for it are deleted.
     * @param closureIds
     */
    async freeAndCheckStageForSlots(closureIds: number[]) {
        const slotClosures = await this.prisma.slot_closure.findMany({
            where: {
                closure_id: {
                    in: closureIds,
                },
            },
        });
        const beforeDeleteAffectedSlots = await this.prisma.slot.findMany({
            where: {
                id: {
                    in: slotClosures.map((closure) => closure.slot_id),
                },
            },
        });
        await this.prisma.slot_closure.deleteMany({
            where: {
                closure_id: {
                    in: closureIds,
                },
            },
        });
        const afterDeleteAffectedSlots = await this.prisma.slot.findMany({
            where: {
                id: {
                    in: beforeDeleteAffectedSlots.map((slot) => slot.id),
                },
            },
            select: {
                id: true,
                slot_closure: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        const freedSlots: number[] = [];
        for (const slot of afterDeleteAffectedSlots) {
            if (slot.slot_closure.length == 0) {
                freedSlots.push(slot.id);
            }
        }
        const updatedSlots = await this.prisma.slot.updateMany({
            where: {
                id: {
                    in: freedSlots,
                },
            },
            data: {
                stage: 'available',
            },
        });
        this.logger.log(`The deletion of the closure made ${updatedSlots.count} slots available again.`);
    }

    private validateRule(closure: {
        application_period_from: string | Date | undefined;
        application_period_until: string | Date | null | undefined;
        closed_time_from: string | Date | undefined;
        closed_time_until: string | Date | undefined;
        weekdays: string[] | Prisma.JsonValue | undefined;
    }): string[] {
        const errors: string[] = [];
        if (closure.application_period_from == undefined) {
            errors.push('The application_period_from is undefined!');
        }
        if (
            (closure.closed_time_from === undefined || closure.closed_time_until === undefined) &&
            !(closure.closed_time_from === undefined && closure.closed_time_until === undefined)
        ) {
            errors.push('closed_time_from or closed_time_until is not defined!');
        }
        if (closure.weekdays == undefined || (closure.weekdays as string[]).length == 0) {
            errors.push('The weekdays is undefined or not specified!');
        }
        //check if closed time from is before closed time until
        const timeFrom =
            closure.closed_time_from instanceof Date //
                ? moment.utc(closure.closed_time_from).format('HH:mm:ss')
                : closure.closed_time_from ?? '00:00:00';
        const timeUntil =
            closure.closed_time_until instanceof Date //
                ? moment.utc(closure.closed_time_until).format('HH:mm:ss')
                : closure.closed_time_until ?? '23:59:59';
        if (moment.utc(timeFrom, 'HH:mm:ss').isAfter(moment.utc(timeUntil, 'HH:mm:ss'))) {
            errors.push('The closed_time_from is before the closed_time_until!');
        }
        //check if application period from is before application period until
        if (closure.application_period_until != null) {
            const applicationPeriodFrom = moment.utc(closure.application_period_from).format('YYYY-MM-DD');
            const applicationPeriodUntil = moment.utc(closure.application_period_until).format('YYYY-MM-DD');
            if (moment.utc(applicationPeriodFrom, 'YYYY-MM-DD').isAfter(moment.utc(applicationPeriodUntil, 'YYYY-MM-DD'))) {
                errors.push('The application_period_from is after the application_period_until!');
            }
        }
        return errors;
    }
}
