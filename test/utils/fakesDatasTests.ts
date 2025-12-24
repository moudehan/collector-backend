import type { JwtUser } from '../../src/auth/user.type';
import { UserRole } from '../../src/users/user.entity';
import type { CreateShopDto } from '../../src/shops/dto/create-shop.dto';

export const FAKE_UUID = '00000000-0000-0000-0000-000000000001';
export const FAKE_SHOP_ID = '11111111-1111-1111-1111-111111111111';

export function fakeUser(overrides: Partial<JwtUser> = {}): JwtUser {
  return {
    userId: FAKE_UUID,
    sub: FAKE_UUID,
    email: 'test.user@example.com',
    role: UserRole.USER,
    ...overrides,
  };
}

export function fakeCreateShopDto(
  overrides: Partial<CreateShopDto> = {},
): CreateShopDto {
  return {
    name: 'Ma Boutique Test',
    description: 'Description de la boutique test',
    ...overrides,
  } as CreateShopDto;
}

export function fakeShopResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: FAKE_SHOP_ID,
    name: 'Ma Boutique Test',
    description: 'Description de la boutique test',
    created_at: new Date().toISOString(),
    owner: {
      id: FAKE_UUID,
      firstname: 'Test',
      lastname: 'User',
    },
    ...overrides,
  };
}

export function fakeMyShopsResponse() {
  return [
    fakeShopResponse({ id: FAKE_SHOP_ID, name: 'Ma Boutique Test' }),
    fakeShopResponse({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Deuxième Boutique',
    }),
  ];
}
