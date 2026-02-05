import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { ShippingAddressService } from './shipping-adress.service';
import { ShippingAddress } from './shipping-adress.entity';

describe('ShippingAdressService', () => {
  let service: ShippingAddressService;
  const repo = createMockRepository<ShippingAddress>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingAddressService,
        { provide: getRepositoryToken(ShippingAddress), useValue: repo },
      ],
    }).compile();

    service = module.get<ShippingAddressService>(ShippingAddressService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
