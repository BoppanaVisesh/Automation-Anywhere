import { expect } from '@playwright/test';

export class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.usernameField = page.getByRole('textbox', { name: 'Username' });
    this.passwordField = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Log in' });
  }

  async goto() {
    await this.page.goto('https://community.cloud.automationanywhere.digital/#/login');
  }

  async login(username, password) {
    await this.usernameField.waitFor();
    await this.usernameField.fill(username);
    await this.passwordField.waitFor();
    await this.passwordField.fill(password);
    await expect(this.loginButton).toBeVisible();
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();
    await this.page.waitForURL(/.*#\/home/, { timeout: 30000 });
  }

  async isLoggedIn() {
    await expect(this.page).toHaveURL(/.*#\/home/);
  }
}
