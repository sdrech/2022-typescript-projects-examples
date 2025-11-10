import { OmitType } from '@nestjs/swagger'
import { CreateBulkEventConfigDto } from './create-bulk-event-config.dto'

export class UpdateEventConfigDto extends OmitType(CreateBulkEventConfigDto, [
  'imeis',
] as const) {}
