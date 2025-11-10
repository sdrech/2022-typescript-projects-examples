import { LoggerService } from '@nestjs/common'

export class LoggerMock implements LoggerService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  log(message: any, ...optionalParams: any[]) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  error(message: any, ...optionalParams: any[]) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  warn(message: any, ...optionalParams: any[]) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  debug?(message: any, ...optionalParams: any[]) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  verbose?(message: any, ...optionalParams: any[]) {}
}
