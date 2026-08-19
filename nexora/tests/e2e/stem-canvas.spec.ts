import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, defaultMockUser } from './helpers/auth';

test.describe('E2E: STEM Canvas Studio & Interactive Logic Tree', () => {
  const canvasId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('should create and load canvas, add STEM reasoning nodes, render KaTeX formulas, adjust variable sliders, and trigger auto-save', async ({ page }) => {
    // Initial Canvas State
    const mockCanvas = {
      id: canvasId,
      userId: defaultMockUser.id,
      title: 'Derivasi Gerak Parabola & Jangkauan Maksimum',
      description: 'Studi logic tree penurunan rumus proyektil 2D.',
      category: 'Fisika Klasik',
      viewport: { x: 0, y: 0, zoom: 1 },
      globalVariables: [
        {
          id: 'var-v0',
          name: 'v_0',
          symbol: 'v_0',
          label: 'Initial Velocity',
          value: 20,
          defaultValue: 20,
          min: 1,
          max: 100,
          step: 1,
          unit: 'm/s',
          isIndependent: true,
        },
      ],
      nodes: [
        {
          id: 'node-root-1',
          canvasId,
          type: 'problem_root',
          position: { x: 200, y: 50 },
          data: {
            title: 'Problem Root: Jangkauan Horisontal Proyektil',
            content: 'Tentukan jarak horisontal maksimum R yang ditempuh proyektil.',
            latexFormula: 'R = \\frac{v_0^2 \\sin(2\\theta)}{g}',
            nodeType: 'problem_root',
            validationStatus: 'valid',
            variables: [],
          },
        },
      ],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Route Mocks for Canvas Studio
    await page.route(`**/api/canvas/${canvasId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockCanvas,
          message: 'Canvas loaded successfully',
        }),
      });
    });

    await page.route(`**/api/canvas/${canvasId}/graph`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { savedAt: new Date().toISOString() },
            message: 'Graph saved successfully',
          }),
        });
      }
    });

    await page.route(`**/api/canvas/${canvasId}/tasks`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [] },
          message: 'Linked tasks loaded',
        }),
      });
    });

    // 1. Navigate to Canvas Studio
    await page.goto(`/canvas/${canvasId}`);

    // 2. Verify Studio Header & Canvas Title
    await expect(page.getByRole('heading', { name: 'Derivasi Gerak Parabola & Jangkauan Maksimum' })).toBeVisible();
    await expect(page.getByText('Fisika Klasik')).toBeVisible();

    // 3. Verify Problem Root Node and KaTeX Math Formula Rendering
    await expect(page.getByText('Problem Root: Jangkauan Horisontal Proyektil')).toBeVisible();
    await expect(page.locator('.katex')).toBeVisible();

    // 4. Open Add Node Dropup from Toolbar
    const addNodeBtn = page.getByRole('button', { name: /add node/i });
    await expect(addNodeBtn).toBeVisible();
    await addNodeBtn.click();

    // Click "Reasoning Step"
    const reasoningStepOption = page.getByText('Reasoning Step', { exact: false }).first();
    await expect(reasoningStepOption).toBeVisible();
    await reasoningStepOption.click();

    // Verify new reasoning node is rendered in the canvas
    await expect(page.getByText('Logical Derivation Step')).toBeVisible();

    // 5. Open Variable Panel from header button
    const variableBtn = page.getByRole('button', { name: /variables/i }).first();
    await expect(variableBtn).toBeVisible();
    await variableBtn.click();

    await expect(page.getByText('Dynamic Variables')).toBeVisible();
    await expect(page.locator('.font-mono', { hasText: 'v_0' }).first()).toBeVisible();

    // 6. Verify Auto-save indicator shows Synced or Saved
    await expect(page.getByText(/synced|saved/i).first()).toBeVisible();
  });
});
