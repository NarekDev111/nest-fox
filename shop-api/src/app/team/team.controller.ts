import { Body, Controller, Delete, Logger, Patch } from '@nestjs/common';
import { TeamService } from './team.service';
import { UpdateTeamDto } from './dto/update-team.dto';
import { DeleteTeamDto } from './dto/delete-team.dto';

@Controller('team')
export class TeamController {
    private readonly logger = new Logger(TeamController.name);
    constructor(private readonly teamService: TeamService) {}

    @Patch()
    async updateTeam(@Body() body: UpdateTeamDto): Promise<void> {
        this.logger.log(`Updating teams ${body.keys} with payload ${JSON.stringify(body.payload)}`);
        for (const key of body.keys) {
            await this.teamService.updateTeam(key, body.payload);
        }
    }

    @Delete()
    async deleteTeam(@Body() body: DeleteTeamDto): Promise<void> {
        this.logger.log(`Freeing slots of teams ${body.payload}`);
        for (const teamId of body.payload) {
            await this.teamService.deleteTeam(teamId);
        }
    }
}
