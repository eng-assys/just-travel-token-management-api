import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { TokensManagementService } from './tokens-management.service';
import { ClaimTokenDto } from './dtos/claim-token.dto';
import { ListTokenQueryDto } from './dtos/list-token-query.dto';

@Controller('tokens')
export class TokensManagementController {
  constructor(
    private readonly tokensManagementService: TokensManagementService,
  ) {}

  @Post('claim')
  async claimToken(@Body() body: ClaimTokenDto) {
    return this.tokensManagementService.claimToken(body);
  }

  @Get()
  async listTokens(@Query() query: ListTokenQueryDto) {
    return this.tokensManagementService.listTokens(query);
  }

  @Get(':tokenId')
  async tokenDetail(@Param('tokenId') tokenId: string) {
    return this.tokensManagementService.tokenDetail(tokenId);
  }

  @Get(':tokenId/history')
  async tokenHistory(@Param('tokenId') tokenId: string) {
    return this.tokensManagementService.tokenHistory(tokenId);
  }

  @Delete('clear-active')
  async clearActiveTokens(){
    return this.tokensManagementService.clearActiveTokens();
  }
  
}
