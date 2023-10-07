import { Injectable, Logger } from '@nestjs/common';
import RuleHelper from '../../helpers/rule-helper';
import moment from 'moment/moment';
import { Rule, Schedule } from '../../helpers/rschedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@foxtrail-backend/prisma';
import { DirectusService } from '@foxtrail-backend/directus';

@Injectable()
export class StartRuleGeneratorService {
    constructor(
        private readonly prisma: PrismaService, //
        private readonly directusService: DirectusService,
    ) {}

    private readonly logger = new Logger(StartRuleGeneratorService.name);

    /**
     * This method assumes a new start-rule, which has already been validated and persisted in the DB.
     * Generates the slots for it, taking the closures into account.
     * @param startRuleId Existing start-rule ID
     */
    async initializeNewStartRule(startRuleId: number): Promise<void> {
        const startRule = await this.prisma.start_rule.findUniqueOrThrow({
            where: {
                id: startRuleId,
            },
        });
        const rule = RuleHelper.buildStartRule(startRule);
        await this.prisma.start_rule.update({
            where: {
                id: startRuleId,
            },
            data: {
                rule: JSON.stringify(rule.toJSON()),
                // Usually this is not needed and just here to make sure the data is consistent,
                // because a start-rule creation event will never need to be forced.
                force: false,
            },
        });

        await this.generateSlotsInDb(rule, startRule.trail, startRuleId);
    }

    /**
     * This method assumes an existing start-rule, which has already been validated and persisted in the DB.
     * Update the slots for it, taking the closures into account.
     * @param startRuleId
     */
    async updateStartRule(startRuleId: number) {
        const startRule = await this.prisma.start_rule.findUnique({
            where: {
                id: startRuleId,
            },
            rejectOnNotFound: true,
        });

        const rule = RuleHelper.buildStartRule(startRule);

        const soldSlots = await this.prisma.slot.findMany({
            where: {
                start_rule_id: startRuleId,
                stage: 'sold',
                date_time: {
                    gte: moment.utc().toDate(),
                },
            },
        });

        const directusTasks = this.directusService.getDirectusInstance().items('task');

        for (const slot of soldSlots) {
            await this.directusService.createTaskIfSlotSold(slot.id, directusTasks);
        }

        await this.prisma.slot.deleteMany({
            where: {
                start_rule_id: startRule.id,
            },
        });

        await this.prisma.start_rule.update({
            where: {
                id: startRule.id,
            },
            data: {
                rule: JSON.stringify(rule.toJSON()),
                force: false,
            },
        });

        await this.generateSlotsInDb(rule, startRule.trail, startRuleId);
    }

    /**
     * This will delete all the slots which have a connection to this start-rule.
     * @param startRuleId
     */
    async deleteStartRule(startRuleId: number): Promise<void> {
        await this.prisma.slot.deleteMany({
            where: {
                start_rule_id: startRuleId,
            },
        });
    }

    private async generateSlotsInDb(startRuleRule: Rule, trailId: number, startRuleId: number) {
        const closuresForTrail = await this.prisma.closure.findMany({
            where: {
                closure_trails: {
                    some: {
                        trails_id: trailId,
                    },
                },
            },
        });

        const closureRules = closuresForTrail.map((closure) => {
            if (closure.rule != null) {
                return { closure: closure, rule: Rule.fromJSON(JSON.parse(closure.rule.toString())) };
            } else {
                throw new Error('Closure rule (JSON) is null');
            }
        });

        const freeSlots: Prisma.slotCreateManyInput[] = [];
        const closedSlots: Prisma.slotCreateInput[] = [];

        const closures = new Schedule({
            rrules: closureRules.map((closureRule) => closureRule.rule),
        });

        const iterator = startRuleRule.occurrences({ start: moment.utc(), end: moment.utc().add(1, 'year') });
        for (const date of iterator) {
            if (
                closures.occursOn({
                    date: moment.utc(date.date),
                    maxDuration: 86400000,
                })
            ) {
                // On this date, find the closure(s) which affects the slot
                const slotAffectingClosures = closureRules.filter((closureRule) => {
                    return closureRule.rule.occursOn({
                        date: moment.utc(date.date),
                        maxDuration: 86400000,
                    });
                });

                closedSlots.push({
                    trails: {
                        connect: {
                            id: trailId,
                        },
                    },
                    date_time: date.toDateTime().date,
                    stage: 'closed',
                    start_rule: {
                        connect: {
                            id: startRuleId,
                        },
                    },
                    slot_closure: {
                        createMany: {
                            data: slotAffectingClosures.map((closureRule) => {
                                return {
                                    closure_id: closureRule.closure.id,
                                };
                            }),
                        },
                    },
                });
            } else {
                freeSlots.push({
                    trail: trailId,
                    date_time: date.toDateTime().date,
                    stage: 'available',
                    start_rule_id: startRuleId,
                });
            }
        }

        await this.prisma.$transaction([
            this.prisma.slot.createMany({
                data: freeSlots,
            }),
            ...closedSlots.map((closedSlot) => this.prisma.slot.create({ data: closedSlot })),
        ]);

        this.logger.log(`Created ${freeSlots.length} slots for start rule ${startRuleId}`);
    }
}
