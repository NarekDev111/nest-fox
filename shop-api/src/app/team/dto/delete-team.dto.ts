import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DeleteTeamDto {
    @IsNumber({}, { each: true })
    @Type(() => Number)
    payload: number[];
}
