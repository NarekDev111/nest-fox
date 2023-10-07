import { Allow, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTeamPayloadDto } from './update-team-payload.dto';

export class UpdateTeamDto {
    @IsNumber({}, { each: true })
    @Type(() => Number)
    keys: number[];
    @Allow()
    payload: UpdateTeamPayloadDto;
}
