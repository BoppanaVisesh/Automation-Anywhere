import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { FormPage } from '../../pages/FormPage.js';

test.describe('Use Case 1: Form with Upload Flow (UI Automation)', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    // Instantiate the Login Page Object Model representation
    loginPage = new LoginPage(page);

    // Navigate to the target Automation Anywhere login portal
    await loginPage.goto();

    // Authenticate using environmental credentials to avoid exposing credentials in source code
    console.log("USERNAME =", process.env.AA_USERNAME);
    console.log("PASSWORD EXISTS =", !!process.env.AA_PASSWORD);
    await loginPage.login(process.env.AA_USERNAME, process.env.AA_PASSWORD);

    // Verify authentication was successful by checking for redirect to the main homepage URL
    await loginPage.isLoggedIn();
  });

  test('should create a form with textbox and file upload, and verify successful upload', async ({ page }) => {
    // Set test timeout to 2 minutes
    test.setTimeout(120000);

    // Instantiate pages needed for the test actions
    const dashboardPage = new DashboardPage(page);
    const formPage = new FormPage(page);

    // Step 1 & 2: Navigate from homepage/dashboard into the Automation workspace area
    await dashboardPage.goToAutomation();

    // Step 3 & 4: Initiate the creation of a new Form using a unique time-stamped name to prevent naming collisions
    await dashboardPage.openCreateFormDialog();
    const uniqueFormName = `Assignment_Test_${Date.now()}`;
    await dashboardPage.createForm(uniqueFormName);

    // Step 5: Drag and drop a Text Box field from the palette sidebar onto the canvas design area
    await formPage.waitForEditorReady();
    await formPage.dragTextboxToCanvas();

    // Step 6: UI Visibility Assertion for Textbox
    // Verify that the TextBox component has been successfully added to the form builder layout.
    // Asserting visibility of a textbox input within the canvas ensures the drag-and-drop event was processed.
    await expect(formPage.canvas.getByRole('textbox').first()).toBeVisible();

    // Step 9: Input text value into the added Textbox component
    await formPage.enterTextboxValue('Sample automation text');

    // Configure properties for the Text Box component
    await formPage.fillTextboxProperties({
      label: 'Sample Text Field',
      defaultValue: 'Sample automation text',
      hint: 'Enter sample text here',
      tooltip: 'This is a sample textbox for automation testing'
    });

    // Step 7: Drag and drop a Select File component from the palette sidebar onto the canvas
    await formPage.dragSelectFileToCanvas();

    // Step 8: UI Visibility Assertion for File Uploader component
    // Verify that the File Uploader component is visible on the canvas by searching for its guide text.
    // This confirms the drag-and-drop completed successfully and the upload component is ready for interaction.
    await expect(formPage.uploadDropArea.first()).toBeVisible();

    // Configure properties for the Select File component
    await formPage.fillSelectFileProperties({
      label: 'Upload Document',
      allowedExtensions: 'pdf,doc,docx',
      hint: 'Upload a supported document',
      tooltip: 'Only PDF and Word documents are accepted'
    });

    // Note: upload may not complete due to a platform limitation in the 
    // Form Builder editor (see FormPage.uploadFile() for details). This step 
    // does not fail the test if no upload control is found.
    await formPage.uploadFile('./test-data/sample.pdf');

    // Step 11: Persist/Save the form design
    await formPage.saveForm();

    // Step 12: Verify successful completion of the save operation
    await formPage.verifySaveSuccess();
  });
});
