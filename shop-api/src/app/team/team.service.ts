import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@foxtrail-backend/prisma';
import { UpdateTeamPayloadDto } from './dto/update-team-payload.dto';
import { SlotService } from '../slot/slot.service';

@Injectable()
export class TeamService {
    private readonly logger = new Logger(TeamService.name);

    constructor(
        private readonly slotService: SlotService, //
        private readonly prismaService: PrismaService,
    ) {}

    async updateTeam(teamId: number, payload: UpdateTeamPayloadDto) {
        this.logger.log(`Updating team ${teamId}...`);

        const team = await this.prismaService.team.findUnique({
            where: { id: teamId },
        });

        if (!team) {
            this.logger.error(`Team with id ${teamId} not found`);
            return;
        }

        if (payload.start_time || payload.trail) {
            this.logger.log(`Updating start_time and/or trail for team ${teamId}...`);
            const existingSlot = await this.prismaService.slot.findUnique({
                where: { team: teamId },
            });

            if (existingSlot) {
                await this.freeSlot(existingSlot.id, existingSlot.start_rule_id);
            }

            await this.slotService.registerTeam(teamId);
        }

        this.logger.log(`Updated team ${teamId}`);
    }

    async deleteTeam(teamId: number) {
        this.logger.log(`Freeing slots of team ${teamId}...`);
        const existingSlot = await this.prismaService.slot.findUnique({
            where: { team: teamId },
        });
        if (existingSlot) {
            await this.freeSlot(existingSlot.id, existingSlot.start_rule_id);
        } else {
            this.logger.warn(`Team ${teamId} has no slot to free`);
        }
    }

    /**
     * Frees a slot, either by setting it to available or by deleting it.
     * @param slotId: the id of the slot to free
     * @param startRuleId: the optional id of the start rule that the slot belongs to
     * @private
     */
    private async freeSlot(slotId: number, startRuleId?: number) {
        if (startRuleId) {
            this.logger.log(`The slot belongs to a start rule, freeing it...`);
            await this.prismaService.slot.update({
                where: { id: slotId },
                data: {
                    stage: 'available',
                    team: null,
                },
            });
        } else {
            this.logger.log(`The slot does not belong to a start rule, therefore it's only virtual and can be deleted...`);
            await this.prismaService.slot.delete({
                where: { id: slotId },
            });
        }
    }
}
