import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import jwt from 'jsonwebtoken';

@Injectable()
export class AuthHeaderGuard implements CanActivate {

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    try {
      jwt.verify(authHeader.replace("Bearer ", ""), (process.env['JWT_SECRET_KEY']));
      return true;
    } catch (error) {
      throw new UnauthorizedException('Unauthorized token')
    }
  }
}
