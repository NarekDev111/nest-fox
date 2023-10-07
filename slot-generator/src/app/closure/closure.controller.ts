import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ClosureService } from './closure.service';
import { ClosureTriggerModel } from './model/closure-trigger-model';
import { DirectusValidationModel } from '../model/directus-validation.model';

@Controller('closure')
export class ClosureController {
    constructor(private readonly closureService: ClosureService) {}

    // This gets triggered by a Filter in Directus, we need to check if the user is allowed to create or update a closure.
    @Post('filter')
    async filterUpsertClosure(
        @Body()
        body: ClosureTriggerModel,
    ): Promise<DirectusValidationModel> {
        return await this.closureService.validateUpsertClosure(body);
    }

    // This gets triggered by an Action in Directus, so we have valid closureIds
    @Post('action')
    async actionUpsertClosure(
        @Body()
        body: ClosureTriggerModel,
    ): Promise<void> {
        await this.closureService.upsertClosure(body);
    }

    @Delete()
    async filterDeleteClosure(
        @Body()
        body: {
            // list of closureIds
            payload: string[];
        },
    ): Promise<void> {
        await this.closureService.deleteClosure(body.payload.map((id) => parseInt(id)));
    }
}
