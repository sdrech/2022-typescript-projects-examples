import { Module } from '@nestjs/common'
import { DeviceMobileTrafficService } from './device-mobile-traffic.service'
import { DeviceMobileTrafficController } from './device-mobile-traffic.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { HttpModule } from '@nestjs/axios'
import { ScheduleModule } from '@nestjs/schedule'
import {
  DeviceMobileTraffic,
  DeviceMobileTrafficSchema,
} from './entities/device-mobile-traffic.entity'

@Module({
  controllers: [DeviceMobileTrafficController],
  providers: [DeviceMobileTrafficService],
  imports: [
    MongooseModule.forFeature([
      { name: DeviceMobileTraffic.name, schema: DeviceMobileTrafficSchema },
    ]),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  exports: [DeviceMobileTrafficService],
})
export class DeviceMobileTrafficModule {}
