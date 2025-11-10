import { TerminusModule } from '@nestjs/terminus'
import { Test, TestingModule } from '@nestjs/testing'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
    }).compile()

    controller = module.get<HealthController>(HealthController)
  })

  it('HealthCheck 1 - should returns status ok', async () => {
    const response = await controller.check()
    expect(response.status).toBe('ok')
  })
})
