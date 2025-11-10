import { MiddlewareConsumer, Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health/health.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { EventConfigModule } from './event-config/event-config.module'
import * as OpenApiValidator from 'express-openapi-validator'
import { join } from 'path'
import { LoggerModule } from '@company-name/cloud-core/dist/logger/logger.module'
import { SERVICE_NAME } from './constants'
import { ConfigModule } from '@nestjs/config'
import { DeviceDataUsageModule } from './device-data-usage/device-data-usage.module'
import { DeviceMobileTrafficModule } from './device-mobile-traffic/device-mobile-traffic.module'
import {
  CustomMicroserviceHealthCheckIndicator,
  CustomMongooseHealthIndicator,
} from '@company-name/cloud-core/dist/health'

@Module({
  imports: [
    TerminusModule,
    ConfigModule.forRoot(),
    MongooseModule.forRoot(
      'mongodb://' +
        `${encodeURIComponent(process.env.ATLASDB_USER)}:` +
        `${encodeURIComponent(process.env.ATLASDB_PASSWORD)}@` +
        `${process.env.ATLASDB_HOST}:${process.env.ATLASDB_PORT}/` +
        `${process.env.ATLASDB_DATABASE}` +
        `${process.env.ATLASDB_HOST}/` +
        `${process.env.ATLASDB_DATABASE}`,
      { useCreateIndex: true, useFindAndModify: false },
    ),
    EventConfigModule,
    LoggerModule.register({ context: SERVICE_NAME }),
    DeviceDataUsageModule,
    DeviceMobileTrafficModule,
  ],
  controllers: [HealthController],
  providers: [
    CustomMicroserviceHealthCheckIndicator,
    CustomMongooseHealthIndicator,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        ...OpenApiValidator.middleware({
          apiSpec: join(__dirname, './api.yaml'),
          validateRequests: {
            allowUnknownQueryParameters: false,
            coerceTypes: true,
          },
          validateResponses: false,
          validateFormats: 'full',
        }),
      )
      .forRoutes('*')
  }
}
