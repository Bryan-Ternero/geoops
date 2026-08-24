import { test, expect } from '@playwright/test';

test.describe('Verificación Integral de Acceso y Vistas del Sistema', () => {
  test('1. Flujo de Login y Navegación como SUPERVISOR (Rosario Quispe)', async ({ page }) => {
    // 1. Ir al Login
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();

    // 2. Llenar credenciales de Supervisor
    await page.fill('input[name="email"]', 'supervisor@geoops.pe');
    await page.fill('input[name="password"]', 'supervisor1234');
    await page.click('button[type="submit"]');

    // 3. Verificar acceso al Dashboard Principal
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('#contenido')).toBeVisible();
    await expect(page.getByText(/Rosario Quispe|Supervisor/i).first()).toBeVisible();

    // 4. Navegar por todas las vistas operativas
    // A) Despacho & Guardias
    await page.goto('/turnos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Despacho Operativo|Guardias/i);

    // B) Proyección 7D
    await page.goto('/proyeccion');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Mantenimiento Predictivo/i);

    // C) Flota & Telemetría
    await page.goto('/equipos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Maquinaria Pesada/i);

    // D) Personal & Certificaciones
    await page.goto('/operadores');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Personal Habilitado/i);

    // E) Auditoría & Libro Mayor
    await page.goto('/auditoria');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Rastro Operativo/i);
  });

  test('2. Flujo de Login como PLANIFICADOR (Alonso Rivas)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'planner@geoops.pe');
    await page.fill('input[name="password"]', 'planner1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('#contenido')).toBeVisible();
    await expect(page.getByText(/Alonso Rivas|Planificador/i).first()).toBeVisible();
  });

  test('3. Flujo de Login como CONSULTA / AUDITOR (Diana Flores)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'viewer@geoops.pe');
    await page.fill('input[name="password"]', 'viewer1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('#contenido')).toBeVisible();
    await expect(page.getByText(/Diana Flores|Consulta/i).first()).toBeVisible();
  });
});
