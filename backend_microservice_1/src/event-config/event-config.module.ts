import { Module } from '@nestjs/common'
import { EventConfigService } from './event-config.service'
import { EventConfigController } from './event-config.controller'
import { MongooseModule } from '@nestjs/mongoose'
import {
  EventConfigEntity,
  EventConfigSchema,
} from './schemas/event-config.schema'
import { KAFKA_CLIENT_TOKEN, KAFKA_CONFIG } from '../constants'
import { ClientsModule } from '@nestjs/microservices'

@Module({
  controllers: [EventConfigController],
  providers: [EventConfigService],
  imports: [
    ClientsModule.register([
      {
        name: KAFKA_CLIENT_TOKEN,
        ...KAFKA_CONFIG,
      },
    ]),
    MongooseModule.forFeature([
      { name: EventConfigEntity.name, schema: EventConfigSchema },
    ]),
  ],
  exports: [EventConfigService],
})
export class EventConfigModule {}
