import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ClaimTokenDto {
  @ApiProperty({
    description: 'UUID of the user claiming the token',
    example: '2bcfc2a0-5249-4925-af02-94046226529f',
    required: true,
  })
  @IsNotEmpty()
  @IsUUID()
  userId?: string;
}
