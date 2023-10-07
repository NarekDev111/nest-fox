import { Injectable } from '@nestjs/common';
import { StartruleTriggerModel } from './model/start-rule-trigger-model';
import { StartRuleValidatorService } from './validator/start-rule-validator.service';
import { StartRuleGeneratorService } from './generator/start-rule-generator.service';
import { DirectusValidationModel } from '../model/directus-validation.model';
import RuleHelper from '../helpers/rule-helper';

@Injectable()
export class StartRuleService {
    constructor(
        private readonly validator: StartRuleValidatorService, //
        private readonly generator: StartRuleGeneratorService,
    ) {}

    /**
     * This gets triggered by a Filter in Directus, we need to check if the user is allowed to create or update a start-rule.
     * No DB changes are made here.
     * @param body
     */
    async validateUpsertStartrule(body: StartruleTriggerModel): Promise<DirectusValidationModel> {
        if (body.event == 'start_rule.items.create') {
            const validationErrors = RuleHelper.validateStartRule(body.payload);
            if (validationErrors.length > 0) {
                return new DirectusValidationModel(validationErrors, []);
            }
        } else if (body.event == 'start_rule.items.update') {
            // keys is an array of ids, therefore potential multiple start-rules have to be checked
            return await this.validator.validateUpdateStartrules(body);
        } else {
            throw new Error(`Event ${body.event} not supported in this call.`);
        }
    }

    /**
     * This gets triggered by an Action in Directus, so we have valid startRuleId(s).
     * This will do DB changes, including creation of the slots and updating the rule.
     * @param body
     */
    async upsertStartrule(body: StartruleTriggerModel) {
        if (body.event == 'start_rule.items.create') {
            const startRuleId = body.key ? parseInt(body.key) : undefined;
            if (startRuleId) {
                await this.generator.initializeNewStartRule(startRuleId);
            } else {
                throw new Error(`No startRuleId found to create slots from`);
            }
        } else if (body.event == 'start_rule.items.update') {
            const startRuleIds = body.keys ? body.keys.map((key) => parseInt(key)) : [];
            if (startRuleIds.length == 0) {
                throw new Error(`No startRuleId found to update slots from`);
            } else {
                for (const startRuleId of startRuleIds) {
                    await this.generator.updateStartRule(startRuleId);
                }
            }
        } else {
            throw new Error(`Event ${body.event} not supported in this call.`);
        }
    }

    /**
     * Gets triggered as a filter in Directus.
     * This will delete all slots that are associated with the start-rules, but will abort if force is not set to true.
     * @param startSlotIds
     */
    async deleteStartRules(startSlotIds: number[]): Promise<void> {
        for (const startRuleId of startSlotIds) {
            await this.generator.deleteStartRule(startRuleId);
        }
    }
}
