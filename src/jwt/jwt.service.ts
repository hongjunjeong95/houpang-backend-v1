import { Inject, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

import { CONFIG_OPTIONS } from '@apis/common/common.constants';
import { JwtModuleOptions } from '@jwt/jwt.interfaces';

@Injectable()
export class JwtService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: JwtModuleOptions,
  ) {}

  sign(userId: string): string {
    return jwt.sign({ id: userId }, this.options.privateKey);
  }

  verify(token: string) {
    return jwt.verify(token, this.options.privateKey);
  }
}
