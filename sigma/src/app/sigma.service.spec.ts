import { Test } from '@nestjs/testing';

import { SigmaService } from './sigma.service';

describe('SigmaService', () => {
    let service: SigmaService;

    beforeAll(async () => {
        const app = await Test.createTestingModule({
            providers: [SigmaService],
        }).compile();

        service = app.get<SigmaService>(SigmaService);
    });
});
