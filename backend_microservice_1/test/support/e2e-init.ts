import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import * as fs from 'fs'
import { join } from 'path'
import { AllExceptionsFilter } from '@company-name/cloud-core/dist/filters/all-exception.filter'

export async function testAppInit(app, prefix) {
  app.setGlobalPrefix(prefix)
  app.useGlobalPipes(new ValidationPipe())
  const config = new DocumentBuilder()
    .setTitle('Media service')
    .setDescription('Media service docs')
    .setVersion('1.0')
    .build()
  app.useGlobalFilters(new AllExceptionsFilter())
  const document = SwaggerModule.createDocument(app, config)
  fs.writeFileSync(
    join(__dirname, '../../src/api.json'),
    JSON.stringify(document),
  )

  SwaggerModule.setup(`${prefix}/api`, app, document)
  await app.init()
}
