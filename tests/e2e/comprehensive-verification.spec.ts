import { test, expect } from '@playwright/test';

test.describe('Verificación Integral de Acceso y Vistas del Sistema', () => {
  test('1. Flujo de Login y Navegación como SUPERVISOR (Valeria Mendoza)', async ({ page }) => {
    // 1. Ir al Login
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Iniciar sesión/i);

    // 2. Llenar credenciales de Supervisor
    await page.fill('input[name="email"]', 'supervisor@geoops.pe');
    await page.fill('input[name="password"]', 'supervisor1234');
    await page.click('button[type="submit"]');

    // 3. Verificar acceso al Dashboard Principal
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('#contenido')).toBeVisible();
    await expect(page.getByText(/Valeria Mendoza|Supervisor/i).first()).toBeVisible();

    // 4. Navegar por todas las vistas operativas
    // A) Despacho & Guardias
    await page.goto('/turnos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Despacho Operativo|Guardias/i);

    // B) Proyección 7D
    await page.goto('/proyeccion');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Proyección Operativa 7D/i);

    // C) Flota & Telemetría
    await page.goto('/equipos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Gestión de Flota/i);

    // D) Personal & Certificaciones
    await page.goto('/operadores');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Padrón de Operadores/i);

    // E) Auditoría & Libro Mayor
    await page.goto('/auditoria');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Libro Mayor & Auditoría/i);
  });

  test('2. Flujo de Login como PLANIFICADOR (Marco Velásquez)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'planner@geoops.pe');
    await page.fill('input[name="password"]', 'planner1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('#contenido')).toBeVisible();
    await expect(page.getByText(/Marco Velásquez|Planificador/i).first()).toBeVisible();
  });

  test('3. Flujo de Login como CONSULTA / AUDITOR (Camila Navarro)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'viewer@geoops.pe');
    await page.fill('input[name="password"]', 'viewer1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('#contenido')).toBeVisible();
    await expect(page.getByText(/Camila Navarro|Consulta/i).first()).toBeVisible();
  });
});
