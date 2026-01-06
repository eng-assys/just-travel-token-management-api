import { Controller } from '@nestjs/common';
import { TokensManagementService } from './tokens-management.service';

@Controller('tokens-management')
export class TokensManagementController {
  constructor(
    private readonly tokensManagementService: TokensManagementService,
  ) {}
}
