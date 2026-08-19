import { type Page } from '@playwright/test';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export const defaultMockUser: MockUser = {
  id: '11111111-1111-4111-a111-111111111111',
  name: 'Alex Nexora (Student)',
  email: 'alex.student@nexora.edu',
  image: null,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
};

/**
 * Setup mock authentication session for Better Auth in Playwright
 */
export async function mockAuthenticatedSession(
  page: Page,
  user: Partial<MockUser> = {}
): Promise<void> {
  const fullUser = { ...defaultMockUser, ...user };

  const sessionPayload = {
    user: fullUser,
    session: {
      id: 'mock-session-id-123',
      userId: fullUser.id,
      token: 'mock-token-abc-xyz',
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // Intercept Better Auth session endpoints
  await page.route('**/api/auth/**', async (route) => {
    const url = route.request().url();
    if (url.includes('session') || url.includes('get-session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });

  // Set mock session cookie in browser context
  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: 'mock-token-abc-xyz',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}
