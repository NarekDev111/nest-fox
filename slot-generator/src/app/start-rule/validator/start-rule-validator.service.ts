import { Injectable } from '@nestjs/common';
import { StartruleTriggerModel } from '../model/start-rule-trigger-model';
import { SlotUpdateModel } from '../model/slot-update-model';
import moment from 'moment/moment';
import { PrismaService } from '@foxtrail-backend/prisma';
import RuleHelper from '../../helpers/rule-helper';
import { DirectusValidationModel } from '../../model/directus-validation.model';

@Injectable()
export class StartRuleValidatorService {
    constructor(private readonly prisma: PrismaService) {}

    async validateUpdateStartrules(body: StartruleTriggerModel): Promise<DirectusValidationModel> {
        const startRuleIds = body.keys ? body.keys.map((key) => parseInt(key)) : body.key ? parseInt(body.key) : undefined;
        if (!startRuleIds) {
            throw new Error(`Start rule ids is not set!`);
        }

        // Get the start rules including slots which have been sold for each start rule
        const startRules = await this.prisma.start_rule.findMany({
            where: {
                id: {
                    in: startRuleIds,
                },
            },
            include: {
                slots: {
                    select: {
                        id: true,
                        date_time: true,
                        stage: true,
                    },
                    where: {
                        stage: 'sold',
                    },
                },
            },
        });

        const result: DirectusValidationModel = new DirectusValidationModel([], []);
        for (const startRule of startRules) {
            // Merge the rule from the payload and the existing rule
            const validations = RuleHelper.validateStartRule({
                date_from: body.payload.date_from ?? startRule.date_from,
                date_to: body.payload.date_to ?? startRule.date_to,
                time: body.payload.time ?? startRule.time,
                weekdays: body.payload.weekdays ?? startRule.weekdays,
            });
            if (validations.length == 0) {
                const rule = RuleHelper.buildStartRule({
                    date_from: body.payload.date_from ?? startRule.date_from,
                    date_to: body.payload.date_to ?? startRule.date_to,
                    time: body.payload.time ?? startRule.time,
                    weekdays: body.payload.weekdays ?? startRule.weekdays,
                });
                for (const soldSlot of startRule.slots) {
                    const occursOn = rule.occursOn({
                        date: moment.utc(soldSlot.date_time),
                    });

                    if (!occursOn) {
                        // The (changed) rule wouldn't include this slot anymore
                        result.warnings.push(
                            new SlotUpdateModel( //
                                soldSlot.id,
                                soldSlot.stage,
                                'a booking ID',
                                moment.utc(soldSlot.date_time).format('YYYY-MM-DD'),
                                moment.utc(soldSlot.date_time).format('HH:mm'),
                            ).toString(),
                        );
                    }
                }
            } else {
                result.errors.push(...validations.map((validation) => validation.toString()));
            }
        }

        return result;
    }
}
