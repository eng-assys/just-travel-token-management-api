import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { TokenStatus } from 'src/generated/prisma/enums';

export class ListTokenQueryDto {
  @ApiPropertyOptional({
    description: 'Status of tokens to be shown',
    enum: TokenStatus,
    example: TokenStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(TokenStatus)
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  page: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit: string;
}
