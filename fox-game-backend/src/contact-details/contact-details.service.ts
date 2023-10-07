import { PrismaService } from '@foxtrail-backend/prisma';
import { Injectable } from '@nestjs/common';
import { IContact_Details } from '../types/contact-details.dto';

@Injectable()
export class ContactDetailsService {
    constructor(private readonly prisma: PrismaService) { }
    async postContactDetails(authHeader: string, body: IContact_Details) {
        try {
            const player = await this.prisma.players.findFirst({
                where: {
                    token: authHeader.replace("Bearer ", "")
                }
            })
            if (player) {
                return await this.prisma.players.update({
                    where: {
                        token: authHeader.replace("Bearer ", "")
                    },
                    data: {
                        first_name: body.first_name,
                        last_name: body.last_name,
                        email: body.email,
                        phone_number: body.phone_number,
                        date_of_birth: body.date_of_birth
                    }
                })
            }
            return null
        } catch (error) {
            return error
        }

    }
}
