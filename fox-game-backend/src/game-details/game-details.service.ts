import { PrismaService } from '@foxtrail-backend/prisma';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameDetailsService {
  constructor(private readonly prisma: PrismaService) {
  }

  async getGameDetails(authHeader: string) {
    const player = await this.prisma.players.findFirst({
      where: {
        token: authHeader.replace("Bearer ", "")
      }
    })
    if (player) {
      const team = await this.prisma.team.findFirst({
        where: {
          id: player.team_id
        }
      })
      const trail = await this.prisma.trails.findFirst({
        where: {
          id: team.trail
        }
      })
      return {
        team_name: team.team_name,
        trail_name: trail.name,
        start_time: team.start_time
      }
    }
    return null
  }
}