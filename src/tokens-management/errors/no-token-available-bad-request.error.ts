import { BadRequestException, HttpStatus } from '@nestjs/common';

export class NoTokenAvailableException extends BadRequestException {
  constructor(errorData = {}) {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      type: NoTokenAvailableException,
      message: `No token available to claim`,
      ...errorData,
    });
  }
}
