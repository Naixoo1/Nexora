import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, defaultMockUser } from './helpers/auth';

test.describe('E2E: Canvas-to-Task Bridge & Origin Deep Linking', () => {
  const canvasId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const nodeId = 'node-step-1';
  const convertedTaskId = '99999999-9999-4999-a999-999999999999';

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('should open NodeToTaskModal from canvas node, convert to task, navigate to tasks page with origin badge, and link back to node', async ({ page }) => {
    const linkedTasksMap: Record<string, string> = {};
    const createdTasksList: Array<{
      id: string;
      userId: string;
      parentId: string | null;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      category: string | null;
      dueDate: string | null;
      completedAt: string | null;
      source: string;
      canvasNodeId?: string | null;
      nodeX?: number | null;
      nodeY?: number | null;
      latexFormula?: string | null;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }> = [];

    const mockCanvas = {
      id: canvasId,
      userId: defaultMockUser.id,
      title: 'Derivasi Gerak Parabola & Jangkauan Maksimum',
      description: 'Logic tree penurunan rumus jangkauan proyektil.',
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
          step: 0.5,
          unit: 'm/s',
          isIndependent: true,
        },
      ],
      nodes: [
        {
          id: nodeId,
          canvasId,
          type: 'reasoning_step',
          position: { x: 200, y: 150 },
          data: {
            title: 'Dekomposisi Vektor Kecepatan',
            content: 'Kecepatan horizontal konstan dan kecepatan vertikal terpengaruh gravitasi.',
            latexFormula: 'v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt',
            nodeType: 'reasoning_step',
            validationStatus: 'valid',
            variables: [
              {
                id: 'var-v0',
                name: 'v_0',
                symbol: 'v_0',
                label: 'Initial Velocity',
                value: 20,
                defaultValue: 20,
                min: 1,
                max: 100,
                step: 0.5,
                unit: 'm/s',
                isIndependent: true,
              },
            ],
          },
        },
      ],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Canvas API Mocks
    await page.route(`**/api/canvas/${canvasId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockCanvas,
          message: 'Canvas loaded',
        }),
      });
    });

    await page.route(`**/api/canvas/${canvasId}/tasks`, async (route) => {
      const items = Object.entries(linkedTasksMap).map(([cNodeId, tId]) => ({
        id: tId,
        canvasNodeId: cNodeId,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items },
          message: 'Linked tasks loaded',
        }),
      });
    });

    await page.route(`**/api/canvas/${canvasId}/nodes/${nodeId}/to-task`, async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      const convertedTask = {
        id: convertedTaskId,
        userId: defaultMockUser.id,
        parentId: body.parentTaskId || null,
        title: body.title || '[Derivation Step] Dekomposisi Vektor Kecepatan',
        description: body.description || 'Komponen kecepatan pada sumbu-x dan sumbu-y.',
        status: 'todo',
        priority: body.priority || 'medium',
        category: body.category || 'Fisika Klasik',
        dueDate: body.dueDate || null,
        completedAt: null,
        source: 'canvas_export',
        canvasNodeId: nodeId,
        nodeX: 200,
        nodeY: 150,
        latexFormula: 'v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt',
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      linkedTasksMap[nodeId] = convertedTaskId;
      createdTasksList.push(convertedTask);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: convertedTask,
          message: 'Node converted to task successfully',
        }),
      });
    });

    // Tasks API Mock
    await page.route('**/api/tasks**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: createdTasksList,
            pagination: {
              total: createdTasksList.length,
              page: 1,
              limit: 50,
              totalPages: 1,
            },
          },
          message: 'Tasks retrieved',
        }),
      });
    });

    // 1. Navigate to Canvas Studio
    await page.goto(`/canvas/${canvasId}`);
    await expect(page.getByText('Dekomposisi Vektor Kecepatan')).toBeVisible();

    // 2. Click "To Task" button on the reasoning node
    const toTaskBtn = page.getByRole('button', { name: 'To Task' }).first();
    await expect(toTaskBtn).toBeVisible();
    await toTaskBtn.click();

    // 3. Verify NodeToTaskModal opens with mathematical formulation preview
    await expect(page.getByRole('heading', { name: 'Convert Node to Task' })).toBeVisible();
    await expect(page.getByText('Node Content & Math Formulation')).toBeVisible();
    await expect(page.locator('.katex').first()).toBeVisible();

    // 4. Submit conversion form
    const createLinkBtn = page.getByRole('button', { name: /create & link task/i });
    await expect(createLinkBtn).toBeVisible();
    await createLinkBtn.click();

    // Verify modal closes and node displays "Task Linked" badge
    await expect(page.getByText('Task Linked')).toBeVisible();

    // 5. Navigate to /tasks to verify exported task card
    await page.goto('/tasks');
    await expect(page.getByText('[Derivation Step] Dekomposisi Vektor Kecepatan')).toBeVisible();

    // 6. Verify "STEM Canvas Origin" badge
    const originBadge = page.getByText('STEM Canvas Origin');
    await expect(originBadge).toBeVisible();

    // 7. Click origin badge to navigate back to canvas with nodeId query param
    await originBadge.click();
    await expect(page).toHaveURL(new RegExp(`/canvas.*nodeId=${nodeId}`));
  });
});
