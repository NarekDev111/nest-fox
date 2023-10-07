import { Test, TestingModule } from '@nestjs/testing';
import { GraphlQlService } from './graphl-ql.service';

describe('GraphlQlService', () => {
  let service: GraphlQlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphlQlService],
    }).compile();

    service = module.get<GraphlQlService>(GraphlQlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
