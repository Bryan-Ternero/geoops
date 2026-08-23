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
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Centro de Control Operativo/i);
    await expect(page.getByText(/Flota Operativa Activa/i)).toBeVisible();
    await expect(page.getByText(/Proyección de Disponibilidad/i)).toBeVisible();
  });

  test('debe navegar a la vista de Despacho & Turnos', async ({ page }) => {
    await page.click('a[href="/turnos"]');
    await expect(page).toHaveURL('/turnos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Despacho Operativo/i);
    await expect(page.getByText(/Apertura de Nueva Guardia/i)).toBeVisible();
  });

  test('debe navegar a la vista de Proyección 7D', async ({ page }) => {
    await page.click('a[href="/proyeccion"]');
    await expect(page).toHaveURL('/proyeccion');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Motor de Proyección/i);
    await expect(page.getByText(/Curva de Disponibilidad Diaria/i)).toBeVisible();
  });

  test('debe navegar a la vista de Flota & Telemetría', async ({ page }) => {
    await page.click('a[href="/equipos"]');
    await expect(page).toHaveURL('/equipos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Gestión de Flota/i);
    await expect(page.getByText(/Matriz de Telemetría/i)).toBeVisible();
  });

  test('debe navegar a la vista de Personal & Certificaciones', async ({ page }) => {
    await page.click('a[href="/operadores"]');
    await expect(page).toHaveURL('/operadores');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Personal Operativo/i);
    await expect(page.getByText(/Padrón de Operadores/i)).toBeVisible();
  });

  test('debe navegar a la vista de Auditoría & Libro Mayor', async ({ page }) => {
    await page.click('a[href="/auditoria"]');
    await expect(page).toHaveURL('/auditoria');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Libro Mayor/i);
    await expect(page.getByText(/Registro de Excepciones/i)).toBeVisible();
  });
});
