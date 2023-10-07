import { Body, Controller, Delete, Post } from '@nestjs/common';
import { StartRuleService } from './start-rule.service';
import { StartruleTriggerModel } from './model/start-rule-trigger-model';
import { DirectusValidationModel } from '../model/directus-validation.model';

@Controller('start-rule')
export class StartRuleController {
    constructor(private readonly startRuleService: StartRuleService) {}

    // This gets triggered by a Filter in Directus, we need to check if the user is allowed to create or update a start-rule.
    @Post('filter')
    async filterUpsertStartrule(
        @Body()
        body: StartruleTriggerModel,
    ): Promise<DirectusValidationModel> {
        return await this.startRuleService.validateUpsertStartrule(body);
    }

    // This gets triggered by an Action in Directus, so we have valid startRuleId(s).
    @Post('action')
    async actionUpsertStartrule(
        @Body()
        body: StartruleTriggerModel,
    ): Promise<void> {
        await this.startRuleService.upsertStartrule(body);
    }

    @Delete()
    async filterDeleteStartRule(
        @Body()
        body: {
            // list of start-rules
            payload: string[];
        },
    ): Promise<void> {
        await this.startRuleService.deleteStartRules(body.payload.map((id) => parseInt(id)));
    }
}
