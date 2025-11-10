import { ApiProperty } from '@nestjs/swagger'

export class ImeisListDto {
  @ApiProperty({
    required: true,
    type: [String],
    example: ['1234567', '9876543'],
  })
  imeis: string[]
}
