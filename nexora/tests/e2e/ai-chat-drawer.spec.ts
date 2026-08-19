import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, defaultMockUser } from './helpers/auth';

test.describe('E2E: AI Chat & Brainstorming Drawer with Tutor Modes & Citations', () => {
  const sessionId = 'session-chat-123';

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('should open floating AI drawer, switch tutor mode, send message with streaming response, and render citation badges', async ({ page }) => {
    // Mock Chat Sessions API
    await page.route('**/api/chat/sessions**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: sessionId,
                  userId: defaultMockUser.id,
                  title: 'Diskusi Gerak Harmonik Sederhana',
                  tutorMode: 'socratic',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              total: 1,
            },
            message: 'Sessions retrieved',
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: sessionId,
              userId: defaultMockUser.id,
              title: 'Brainstorming Session',
              tutorMode: 'socratic',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            message: 'Session created',
          }),
        });
      }
    });

    // Mock Streaming Chat API
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const streamResponse =
          'Mari kita turunkan frekuensi osilasi bandul sederhana:\n\n$$\n\\omega = \\sqrt{\\frac{g}{L}}\n$$\n\nPerhatikan bahwa untuk simpangan kecil $\\sin(\\theta) \\approx \\theta$ seperti pada [[node:node-root-1|Problem Root]].';

        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Chat-Session-Id': sessionId,
          },
          body: streamResponse,
        });
      }
    });

    // Mock Tasks endpoint for page mount
    await page.route('**/api/tasks**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } },
          message: 'Tasks loaded',
        }),
      });
    });

    // 1. Navigate to Tasks page with floating AI drawer
    await page.goto('/tasks');

    // 2. Click floating "AI Brainstorm" button
    const brainstormBtn = page.getByRole('button', { name: /ai brainstorm/i }).last();
    await expect(brainstormBtn).toBeVisible();
    await brainstormBtn.click();

    // 3. Verify Drawer Opens & Check Tutor Mode Selector
    await expect(page.getByText('AI Brainstorming').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /socratic/i }).first()).toBeVisible();

    // Switch Tutor Mode dropdown/options if present
    const tutorSelector = page.getByRole('button', { name: /socratic/i }).first();
    await tutorSelector.click();
    const olympiadOption = page.getByText(/olympiad coach/i);
    if (await olympiadOption.isVisible()) {
      await olympiadOption.click();
    }

    // 4. Type prompt and send message
    const chatInput = page.getByPlaceholder(/ask nexora ai/i);
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Bagaimana penurunan rumus periode bandul sederhana?');

    const sendBtn = page.getByRole('button', { name: /send prompt/i });
    await expect(sendBtn).toBeVisible();
    await sendBtn.click();

    // 5. Verify Streaming Assistant Response & KaTeX equation rendering
    await expect(page.getByText('frekuensi osilasi bandul')).toBeVisible();
    await expect(page.locator('.katex').first()).toBeVisible();

    // 6. Verify Citation Badge Rendering
    await expect(page.getByText('Problem Root').first()).toBeVisible();
  });
});
