import { ApiProperty } from '@nestjs/swagger'
import { EventConfigEntity } from '../schemas/event-config.schema'
import { TriggerDto } from './trigger.dto'

export class CreateBulkEventConfigDto {
  @ApiProperty({ type: [String] })
  imeis: string[]

  @ApiProperty({ type: [TriggerDto] })
  triggers: EventConfigEntity['triggers']
}
