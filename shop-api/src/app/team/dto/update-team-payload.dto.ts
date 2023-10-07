import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTeamPayloadDto {
    @IsString()
    @Type(() => String)
    start_time?: string;
    @IsNumber()
    @Type(() => Number)
    trail?: number;
}
