import { test, expect } from '@playwright/test';

test.describe('Navegación del Espacio de Trabajo (Workspace Views)', () => {
  test.beforeEach(async ({ page }) => {
    // Iniciar sesión como supervisor
    await page.goto('/login');
    await page.fill('input[name="email"]', 'supervisor@geoops.pe');
    await page.fill('input[name="password"]', 'supervisor1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('debe cargar la Consola Principal con KPIs y Telemetría', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Panel de Control/i);
    await expect(page.getByText(/Maquinaria Operativa/i)).toBeVisible();
    await expect(page.getByText(/Curva Predictiva de Disponibilidad/i)).toBeVisible();
  });

  test('debe navegar a la vista de Despacho & Turnos', async ({ page }) => {
    await page.locator('nav[aria-label="Navegación del sistema"] a:visible').filter({ hasText: 'Guardias' }).click();
    await expect(page).toHaveURL('/turnos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Guardias & Despacho/i);
    await expect(page.getByText(/Apertura de Guardia/i)).toBeVisible();
  });

  test('debe navegar a la vista de Proyección 7D', async ({ page }) => {
    await page.locator('nav[aria-label="Navegación del sistema"] a:visible').filter({ hasText: 'Mantenimiento Predictivo' }).click();
    await expect(page).toHaveURL('/proyeccion');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Mantenimiento Predictivo/i);
    await expect(page.getByText(/Curva de Disponibilidad Diaria/i)).toBeVisible();
  });

  test('debe navegar a la vista de Flota & Telemetría', async ({ page }) => {
    await page.locator('nav[aria-label="Navegación del sistema"] a:visible').filter({ hasText: 'Maquinaria Pesada' }).click();
    await expect(page).toHaveURL('/equipos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Maquinaria Pesada/i);
    await expect(page.getByText(/Telemetría de la flota/i)).toBeVisible();
  });

  test('debe navegar a la vista de Personal & Certificaciones', async ({ page }) => {
    await page.locator('nav[aria-label="Navegación del sistema"] a:visible').filter({ hasText: 'Personal Habilitado' }).click();
    await expect(page).toHaveURL('/operadores');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Personal Habilitado/i);
    await expect(page.getByText(/Matriz de competencias/i)).toBeVisible();
  });

  test('debe navegar a la vista de Auditoría & Libro Mayor', async ({ page }) => {
    await page.locator('nav[aria-label="Navegación del sistema"] a:visible').filter({ hasText: 'Rastro Operativo' }).click();
    await expect(page).toHaveURL('/auditoria');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Rastro Operativo/i);
    await expect(page.getByText(/Excepciones firmadas/i)).toBeVisible();
  });
});
