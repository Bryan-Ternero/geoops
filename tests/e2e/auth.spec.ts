import { test, expect } from '@playwright/test';

test.describe('Autenticación y Control de Accesos', () => {
  test('debe redirigir al login si el usuario no está autenticado', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Iniciar Sesión|GeoOps/i);
  });

  test('debe permitir iniciar sesión como Supervisor', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'supervisor@geoops.pe');
    await page.fill('input[name="password"]', 'supervisor1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('#contenido')).toBeVisible();
    await expect(page.getByText(/Supervisor/i)).toBeVisible();
  });

  test('debe permitir iniciar sesión como Planificador', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'planner@geoops.pe');
    await page.fill('input[name="password"]', 'planner1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('#contenido')).toBeVisible();
    await expect(page.getByText(/Planificador/i)).toBeVisible();
  });

  test('debe rechazar credenciales inválidas con mensaje de error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'usuario_invalido@geoops.pe');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
