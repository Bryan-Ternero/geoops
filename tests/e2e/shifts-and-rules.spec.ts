import { test, expect } from '@playwright/test';

test.describe('Despacho de Turnos y Validación de Reglas de Negocio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'supervisor@geoops.pe');
    await page.fill('input[name="password"]', 'supervisor1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('debe listar las guardias y permitir acceder al detalle de un turno', async ({ page }) => {
    await page.goto('/turnos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Despacho Operativo/i);

    // Click on the first shift detail link
    const primerEnlaceTurno = page.locator('tbody tr').first().locator('a').first();
    await expect(primerEnlaceTurno).toBeVisible();
    await primerEnlaceTurno.click();

    await expect(page).toHaveURL(/\/turnos\/[a-zA-Z0-9_-]+/);
    await expect(page.getByRole('heading', { name: /Asignaciones/i })).toBeVisible();
  });
});
