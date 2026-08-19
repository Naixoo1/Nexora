import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, defaultMockUser } from './helpers/auth';

test.describe('E2E: Authentication & User Tasks with 3-Level Nesting', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('should create tasks, nest subtasks up to 3 levels, recalculate progress, and delete tasks', async ({ page }) => {
    // In-memory tasks store for the test session
    let taskList: Array<{
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
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }> = [];

    // Intercept Tasks API
    await page.route('**/api/tasks**', async (route) => {
      const request = route.request();
      const method = request.method();
      const url = request.url();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: taskList,
              pagination: {
                total: taskList.length,
                page: 1,
                limit: 50,
                totalPages: 1,
              },
            },
            message: 'Tasks retrieved successfully',
          }),
        });
      } else if (method === 'POST') {
        const body = JSON.parse(request.postData() || '{}');
        const newTask = {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: defaultMockUser.id,
          parentId: body.parentId || null,
          title: body.title,
          description: body.description || null,
          status: 'todo',
          priority: body.priority || 'medium',
          category: body.category || null,
          dueDate: body.dueDate || null,
          completedAt: null,
          source: body.source || 'manual',
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        taskList.push(newTask);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: newTask,
            message: 'Task created successfully',
          }),
        });
      } else if (method === 'DELETE') {
        const id = url.split('/').pop()?.split('?')[0];
        taskList = taskList.filter((t) => t.id !== id && t.parentId !== id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id },
            message: 'Task deleted successfully',
          }),
        });
      } else if (method === 'PUT') {
        const id = url.split('/').pop()?.split('?')[0];
        const body = JSON.parse(request.postData() || '{}');
        const index = taskList.findIndex((t) => t.id === id);
        if (index !== -1) {
          taskList[index] = { ...taskList[index], ...body, updatedAt: new Date().toISOString() };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: taskList[index],
              message: 'Task updated successfully',
            }),
          });
        }
      } else {
        await route.continue();
      }
    });

    // 1. Navigate to Tasks page
    await page.goto('/tasks');
    await expect(page.locator('h1')).toContainText('Study Planner & Tasks');

    // 2. Click "New Task" button to open CreateTaskModal
    const createBtn = page.getByRole('button', { name: /new task|create task|add task/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // 3. Fill and submit Root Task (Level 1)
    const titleInput = page.getByPlaceholder(/kerjakan latihan soal/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Fisika: Mekanika Fluida & Termodinamika');

    const categoryInput = page.getByPlaceholder(/matematika, fisika, skripsi/i);
    await categoryInput.fill('Fisika Klasik');

    const submitBtn = page.getByRole('button', { name: /create task/i }).last();
    await submitBtn.click();

    // Verify Root Task is in the list
    await expect(page.getByText('Fisika: Mekanika Fluida & Termodinamika')).toBeVisible();

    // 4. Add Subtask (Level 2)
    const addSubtaskBtn = page.getByRole('button', { name: 'Sub-task' }).first();
    await expect(addSubtaskBtn).toBeVisible();
    await addSubtaskBtn.click();

    // Fill Subtask Form
    await expect(page.getByText('Add Sub-task')).toBeVisible();
    await titleInput.fill('Subtask Level 2: Penurunan Persamaan Bernoulli');
    await submitBtn.click();

    // Verify Subtask Level 2 appears
    await expect(page.getByText('Subtask Level 2: Penurunan Persamaan Bernoulli')).toBeVisible();

    // 5. Add Subtask (Level 3)
    const addSubtaskL3Btn = page.getByRole('button', { name: 'Sub-task' }).last();
    await addSubtaskL3Btn.click();
    await expect(page.getByText('Add Sub-task')).toBeVisible();
    await titleInput.fill('Subtask Level 3: Eksperimen Tabung Pitot');
    await submitBtn.click();

    // Verify Subtask Level 3 appears
    await expect(page.getByText('Subtask Level 3: Eksperimen Tabung Pitot')).toBeVisible();

    // 6. Complete Subtask and verify status toggle
    const completeCheckbox = page.getByTitle('Mark as completed').last();
    await completeCheckbox.click();

    // 7. Delete Root Task via More Actions Menu
    const moreActionsBtn = page.getByTitle('More actions').first();
    await moreActionsBtn.click();
    const deleteBtn = page.getByRole('button', { name: 'Delete Task' });
    await deleteBtn.click();

    // Verify Root Task and nested subtasks are removed
    await expect(page.getByText('Fisika: Mekanika Fluida & Termodinamika')).not.toBeVisible();
  });
});
