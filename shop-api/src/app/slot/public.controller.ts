import { Controller, Get, HttpStatus, Param, ParseArrayPipe, Put, Query, Res } from '@nestjs/common';
import { PrismaService } from '@foxtrail-backend/prisma';
import { SlotService } from './slot.service';
import { SlotPricingModel } from './model/slot-pricing-model';
import { FilteredSlotModel } from './model/filtered-slot-model';
import { Response } from 'express';

@Controller('public')
export class PublicController {
    constructor(
        private readonly prismaService: PrismaService, //
        private readonly slotService: SlotService,
    ) {}

    @Get('/slot')
    async getSlots(
        @Query('year') year: string, //
        @Query('month') month: string,
        @Query('trailID') trailID: string,
        @Res() response: Response,
    ): Promise<FilteredSlotModel[] | string> {
        if (!year || !month || !trailID) {
            response.status(HttpStatus.BAD_REQUEST).send('Query parameters year, month or trailID are missing.');
            return;
        }
        response.status(HttpStatus.OK).send(JSON.stringify(await this.slotService.getSlots(Number(year), Number(month), Number(trailID))));
    }

    @Get('slot/:id')
    async getSlotPricing(@Param('id') slotId: string): Promise<SlotPricingModel> {
        return await this.slotService.getPricing(Number(slotId));
    }

    /**
     * Syncs the status of a slot with the status of the trail group.
     * Is called in Directus when a slot is updated.
     * @param slotIds
     */
    @Put('slot')
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

    // Get endpoint to get name by trailID
    @Get('trail/:id')
    async getOne(@Param('id') id: string): Promise<{ name: string }> {
        const trail = await this.prismaService.trails.findUnique({
            where: {
                id: parseInt(id),
            },
            select: {
                name: true,
            },
        });
        return { name: trail?.name ?? '' };
    }

    /**
     * Get all closures for a given year and trail. Used to be displayed in the calendar.
     * @param year
     * @param month
     * @param trailID
     */
    @Get('closure')
    async getClosures(
        @Query('year') year: string, //
        @Query('month') month: string,
        @Query('trailID') trailID: string,
    ) {
        return await this.slotService.getClosures(Number(year), month ? Number(month) : null, Number(trailID));
    }
}
