import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto';
import { CreateUserDto } from './dto/createUser.dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async updateUser(userId: number, dto: EditUserDto) {
    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...dto,
      },
    });

    delete user.hash;

    return user;
  }

  async createUser(dto: CreateUserDto) {
    const newPassword = `newPassword${Math.random()}`;

    const hash = await argon.hash(newPassword);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
        },
      });

      return newPassword;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }

  async deleteUser(userId) {
    const foundUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!foundUser) throw new ForbiddenException('Credentials incorrect');

    delete foundUser.hash;

    const deletedUser = await this.prisma.deletedUser.create({
      data: {
        ...foundUser,
      },
    });

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return 'Success';
  }
}
