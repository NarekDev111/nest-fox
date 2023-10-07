import { PrismaService } from '@foxtrail-backend/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) { }
    async Auth(code: string): Promise<Prisma.playersCreateInput> {
        const team = await this.prisma.team.findFirst({
            where: {
                token_check_in: code
            },
        });
        if (team) {
            const secretKey = process.env['JWT_SECRET_KEY'];
            const token = jwt.sign({}, secretKey);
            return await this.prisma.players.create({
                data: {
                    token,
                    team_id: team.id
                }
            });
        }
        return null
    }
}
