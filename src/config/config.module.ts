import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import AppConfig from '@config/app.config';
import JwtConfig from '@config/jwt.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'dev' ? '.env.development' : '.env.test',
      ignoreEnvFile: process.env.NODE_ENV === 'production',

      load: [
        //
        () => ({ app: AppConfig() }),
        () => ({ jwt: JwtConfig() }),
      ],
    }),
  ],
})
export class ConfigModule {}
