export class DashboardPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.automationNavLink = page.getByRole('link', { name: 'Automation', exact: true });
    this.createDropdownButton = page.getByRole('button', { name: 'Create', description: 'Create', exact: true });
    this.formOption = page.getByRole('button', { name: ' Form…' });
    this.formNameInput = page.getByRole('textbox', { name: 'Name' });
    this.chooseFolderButton = page.getByRole('button', { name: 'Choose…' });
    this.botsFolderOption = page.getByRole('button', { name: ' Keyboard focus boundary View file Bots \\Bots' });
    this.confirmFolderChoiceButton = page.getByRole('button', { name: 'Choose' });
    this.createAndEditButton = page.getByRole('button', { name: 'Create & edit' });
  }

  async goToAutomation() {
    await this.automationNavLink.click();
  }

  async openCreateFormDialog() {
    await this.createDropdownButton.click();
    await this.formOption.click();
  }

  async createForm(formName) {
    await this.formNameInput.fill(formName);
    await this.chooseFolderButton.click();
    await this.botsFolderOption.click();
    await this.confirmFolderChoiceButton.click();
    await this.createAndEditButton.click();
  }
}
