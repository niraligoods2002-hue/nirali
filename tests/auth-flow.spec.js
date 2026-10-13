import { test, expect } from '@playwright/test';

test.describe('authentication flows', () => {
  test('signup proceeds to the OTP screen and keeps the pending email', async ({ page }) => {
    await page.route('**/api/auth/register', async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        name: 'Test Shopper',
        email: 'shopper@example.com',
        password: 'Saree1234',
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ requiresVerification: true, email: 'shopper@example.com' }),
      });
    });

    await page.goto('/signup');
    await page.getByLabel('Full Name').fill('Test Shopper');
    await page.getByLabel('Email Address').fill('shopper@example.com');
    await page.getByLabel('Create Password').fill('Saree1234');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/verify-email\?email=shopper%40example\.com/);
    await expect(page.locator('#verify-email-form')).toBeVisible();
    await expect(page.locator('#verify-email')).toHaveValue('shopper@example.com');
    expect(await page.evaluate(() => localStorage.getItem('pendingVerificationEmail'))).toBe('shopper@example.com');
  });

  test('email verification submits the matching fields and signs the user in', async ({ page }) => {
    let submitted;
    await page.route('**/api/auth/verify-email', async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'test-session-token',
          user: { id: 'user-1', name: 'Test Shopper', email: 'shopper@example.com', role: 'user' },
        }),
      });
    });

    await page.goto('/verify-email?email=shopper%40example.com&redirect=%2Fshop');
    await expect(page.locator('#verify-email-form')).toBeVisible();
    await expect(page.locator('#resend-otp')).toBeVisible();
    await page.getByLabel('Verification OTP').fill('123456');
    await page.getByRole('button', { name: 'Verify & Continue' }).click();

    await expect(page).toHaveURL(/\/shop$/);
    expect(submitted).toEqual({ email: 'shopper@example.com', otp: '123456' });
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('test-session-token');
    expect(await page.evaluate(() => localStorage.getItem('pendingVerificationEmail'))).toBeNull();
  });

  test('resend OTP reports success and starts the cooldown', async ({ page }) => {
    await page.route('**/api/auth/resend-otp', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: 'New OTP sent' }) });
    });

    await page.goto('/verify-email?email=shopper%40example.com');
    await page.getByRole('button', { name: 'Resend OTP' }).click();
    await expect(page.locator('#verify-status')).toHaveText('New OTP sent');
    await expect(page.locator('#resend-otp')).toBeDisabled();
  });

  test('login shows API errors inline and rejects external redirects on success', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      const body = route.request().postDataJSON();
      if (body.password === 'wrong-password') {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid email or password' }) });
        return;
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-session-token', user: { id: 'user-1', name: 'Test Shopper', email: body.email, role: 'user' } }),
      });
    });

    await page.goto('/login?redirect=https%3A%2F%2Fexample.com');
    await page.getByLabel('Email Address').fill('shopper@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In to Account' }).click();
    await expect(page.locator('#auth-status')).toHaveText('Invalid email or password');

    await page.getByLabel('Password', { exact: true }).fill('Saree1234');
    await page.getByRole('button', { name: 'Sign In to Account' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(new URL(page.url()).origin).toBe('http://localhost:3000');
  });
});
