import { Body, Controller, ParseArrayPipe, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '@foxtrail-backend/prisma';
import { SlotService } from './slot.service';

@Controller('slot')
export class SlotController {
    constructor(
        private readonly prismaService: PrismaService, //
        private readonly slotService: SlotService,
    ) {}

    /**
     * Syncs the status of a slot with the status of the trail group.
     * Is called in Directus when a slot is updated.
     * @param slotIds
     */
    @Put()
    async syncTrailGroupSlotStatus(
        @Query('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
        slotIds: number[],
    ) {
        for (const slotId of slotIds) {
            const chosenSlot = await this.prismaService.slot.findUnique({
                where: {
                    id: Number(slotId),
                },
                select: {
                    stage: true,
                },
            });
            await this.slotService.updateSlot(Number(slotId), { stage: chosenSlot.stage });
        }
    }

    @Post('/register')
    async registerTeam(
        @Body()
        body: {
            // The ID of the new team
            key: number;
        },
    ) {
        await this.slotService.registerTeam(body.key);
    }
}
