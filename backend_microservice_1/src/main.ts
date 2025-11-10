import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { SERVICE_NAME, OPENAPI_CONFIG, KAFKA_CONFIG } from './constants'
import { appInit } from '@company-name/cloud-core/dist/utils'
import { MicroserviceOptions } from '@nestjs/microservices'
import { Logger } from 'nestjs-pino'
import { APPLICATION_OPTIONS } from '@company-name/cloud-core/dist/logger/logger.constants'
import { SurfServerKafka } from '@company-name/cloud-core/dist/server/surf-server-kafka'

async function bootstrap() {
  const prefix = `${process.env.APP_NAME || SERVICE_NAME}/v1`

  const app = await NestFactory.create(AppModule, APPLICATION_OPTIONS)
  const logger = app.get(Logger)
  app.useLogger(logger)

  await appInit(app, prefix, OPENAPI_CONFIG, __dirname)

  app.connectMicroservice<MicroserviceOptions>({
    strategy: new SurfServerKafka(KAFKA_CONFIG.options),
  })

  app.startAllMicroservices().catch((error) =>
    logger.error({
      message: 'error initiating external microservices connection.',
      method: bootstrap.name,
      err: error,
    }),
  )

  await app.listen(process.env.APP_PORT)
  logger.log('Application is running')
}

bootstrap()
