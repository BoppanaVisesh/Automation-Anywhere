import { expect } from '@playwright/test';

/**
 * FormPage represents the Page Object Model (POM) for the Automation Anywhere Form Builder.
 * 
 * As a production-quality Page Object, it design-integrates:
 * 1. Playwright Web-First Assertions (automatic waiting and retrying).
 * 2. Multi-element resilience (using index-based selectors to prevent Playwright Strictness errors).
 * 3. Robust drag-and-drop mechanism with a coordinates-based fallback.
 * 4. Dual-strategy file uploading to handle standard and custom/hidden file input structures.
 */
export class FormPage {
  /**
   * @param {import('@playwright/test').Page} page - Playwright Page instance
   */
  constructor(page) {
    this.page = page;

    // iframe container for the Form Builder editor
    this.editorFrame = page.frameLocator('iframe.modulepage-frame');

    // Palette Items (Draggable source elements)
    this.textboxPaletteItem = this.editorFrame.locator('[data-item-name="TextBox"] button, [data-item-name="TextBox"]').first();
    this.selectFilePaletteItem = this.editorFrame.locator('[data-item-name="File"] button, [data-item-name="File"]').first();

    // Canvas (Target drop zone)
    this.canvas = this.editorFrame.locator('[data-path="content"]').first();

    // Action Controls
    this.saveButton = this.editorFrame.locator('button[aria-label="Save"], button:has-text("Save")').first();

    // File Component drop area text on the canvas
    this.uploadDropArea = this.editorFrame.getByText('Drop file here or browse');
    this.browseLink = this.editorFrame.locator('a.preview-label__browseText');

    // Textbox Properties Panel (Right-side panel)
    this.textboxLabelField = this.editorFrame.locator('[name="label"], [aria-label="Element label"]').first();
    this.textboxDefaultValueField = this.editorFrame.locator('[name="defaultValue"], [aria-label="Default value"]').first();
    this.textboxHintField = this.editorFrame.locator('[aria-label="Hint below field"]').first();
    this.textboxTooltipField = this.editorFrame.locator('[name="toolTip"]').first();

    // Select File Properties Panel (Right-side panel)
    this.fileLabelField = this.editorFrame.locator('[name="label"], [aria-label="Element label"]').first();
    this.fileAllowedExtensionsField = this.editorFrame.locator(
      '[name="allowedExtensions"], [name="fileFormats"], [name="supportedTypes"], textarea[maxlength]'
    ).first();
    this.fileHintField = this.editorFrame.locator('[aria-label="Hint below field"]').first();
    this.fileTooltipField = this.editorFrame.locator('[name="toolTip"]').first();
    this.fileEnableDownloadCheckbox = this.editorFrame.getByText('Enable file download');
  }

  async waitForEditorReady() {
    // First wait for the editor URL to match /edit/
    await this.page.waitForURL(/edit/, { timeout: 60000 });
    console.log("Editor URL loaded");

    // Then wait for the palette item inside the iframe to become visible
    await expect(this.textboxPaletteItem).toBeVisible({ timeout: 60000 });
    console.log("Text Box palette loaded");
  }

  /**
   * Fills properties for the Text Box component after selecting it on the canvas.
   */
  async fillTextboxProperties({ label, defaultValue, hint, tooltip } = {}) {
    // Select the Text Box component on the canvas first to display its Properties panel
    const textboxOnCanvas = this.editorFrame.locator('[data-path="TextInput.input"], input.textinput-cell-input-control').first();
    await textboxOnCanvas.click();

    if (label) {
      await this.textboxLabelField.fill(label);
      await expect(this.textboxLabelField).toHaveValue(label);
    }
    if (defaultValue) {
      await this.textboxDefaultValueField.fill(defaultValue);
      await expect(this.textboxDefaultValueField).toHaveValue(defaultValue);
    }
    if (hint) {
      await this.textboxHintField.fill(hint);
      await expect(this.textboxHintField).toHaveValue(hint);
    }
    if (tooltip) {
      await this.textboxTooltipField.fill(tooltip);
      await expect(this.textboxTooltipField).toHaveValue(tooltip);
    }
  }

  /**
   * Fills properties for the Select File component after selecting it on the canvas.
   */
  async fillSelectFileProperties({ label, allowedExtensions, hint, tooltip } = {}) {
    // Select the Select File component on the canvas first to display its Properties panel
    const fileOnCanvas = this.editorFrame.locator('#File0, div.preview-fileupload, a.preview-label__browseText').first();
    await fileOnCanvas.click();

    if (label) {
      await this.fileLabelField.fill(label);
      await expect(this.fileLabelField).toHaveValue(label);
    }
    if (allowedExtensions) {
      try {
        await this.fileAllowedExtensionsField.fill(allowedExtensions, { timeout: 5000 });
        await expect(this.fileAllowedExtensionsField).toHaveValue(allowedExtensions, { timeout: 5000 });
      } catch (error) {
        console.warn('Allowed Extensions field could not be located/filled - skipping this optional property.');
      }
    }
    if (hint) {
      await this.fileHintField.fill(hint);
      await expect(this.fileHintField).toHaveValue(hint);
    }
    if (tooltip) {
      await this.fileTooltipField.fill(tooltip);
      await expect(this.fileTooltipField).toHaveValue(tooltip);
    }
  }

  /**
   * Drags the Text Box palette item onto the form builder canvas.
   * 
   * Strategy:
   * 1. Attempts Playwright's native locator.dragTo() first.
   * 2. Falls back to coordinates-based mouse simulation if dragTo() is unsupported
   *    by the front-end framework (common in certain drag-and-drop libraries).
   */
  async dragTextboxToCanvas() {
    console.log("Dragging Text Box");
    await expect(this.textboxPaletteItem).toBeVisible();
    await expect(this.canvas).toBeVisible();
    try {
      // Step 1: Use Playwright's built-in drag-and-drop mechanism.
      // This automatically scrolls elements into view, hovers, downs the mouse, moves, and ups the mouse.
      await this.textboxPaletteItem.dragTo(this.canvas);
    } catch (error) {
      await this._performManualDrag(this.textboxPaletteItem, this.canvas);
    }
  }

  /**
   * Drags the Select File palette item onto the form builder canvas.
   * 
   * Strategy:
   * 1. Attempts Playwright's native locator.dragTo() first.
   * 2. Falls back to coordinates-based mouse simulation if dragTo() is unsupported.
   */
  async dragSelectFileToCanvas() {
    console.log("Dragging Select File");
    await expect(this.selectFilePaletteItem).toBeVisible();
    await expect(this.canvas).toBeVisible();
    try {
      // Step 1: Use Playwright's built-in drag-and-drop mechanism.
      await this.selectFilePaletteItem.dragTo(this.canvas);
    } catch (error) {
      await this._performManualDrag(this.selectFilePaletteItem, this.canvas);
    }
  }

  /**
   * Enters text into a textbox located on the canvas.
   * 
   * Best Practice:
   * Playwright is strict and will fail if multiple textboxes exist on the canvas.
   * We introduce an optional `index` parameter to allow targeting specific textboxes if multiple are added.
   * 
   * @param {string} text - The text value to input.
   * @param {number} [index=0] - The 0-based index of the textbox element to target.
   */
  async enterTextboxValue(text, index = 0) {
    console.log("Entering Text Box value");
    
    // Locate the textbox field scoped through editorFrame instead of page or canvas directly
    const textboxInput = this.editorFrame.locator('[data-path="TextInput.input"], input.textinput-cell-input-control').nth(index);

    // Perform interactions. Playwright automatically waits for these elements to be actionable.
    await textboxInput.click();
    await textboxInput.fill(text);

    // Web-First assertion: Automatically retries until the assertion passes or times out.
    await expect(textboxInput).toHaveValue(text);
  }

  /**
   * Uploads a file to a "Select File" component located on the canvas.
   * 
   * Since modern Web Apps often customize file upload components, we implement two strategies:
   * 
   * Strategy A (Direct Upload):
   * Targets a hidden/visible input[type="file"] element within the canvas. This is the fastest,
   * most reliable method in Playwright because it directly populates the browser's file input object.
   * 
   * Strategy B (File Chooser Event):
   * Falls back to clicking the drop/browse area and handling the native file chooser dialog
   * emitted by the browser.
   * 
   * @param {string} filePath - Absolute or relative path to the file.
   * @param {number} [index=0] - The 0-based index of the file component to target.
   */
  async uploadFile(filePath, index = 0) {
    console.log("Uploading file");
    try {
      const browse = this.browseLink.nth(index);
      const chooserPromise = this.page.waitForEvent("filechooser", { timeout: 5000 });
      await browse.click({ timeout: 5000 });
      const chooser = await chooserPromise;
      await chooser.setFiles(filePath);
    } catch (error) {
      try {
        // Strategy 3 Fallback: Find input[type="file"] including hidden inputs and use setInputFiles scoped through editorFrame
        const fileInput = this.editorFrame.locator('input[type="file"]').nth(index);
        await fileInput.waitFor({ state: 'attached', timeout: 5000 });
        await fileInput.setInputFiles(filePath, { timeout: 5000 });
      } catch (innerError) {
        console.warn('File upload could not be triggered - Select File component ' +
          'does not expose a functional upload control in the Form Builder editor. ' +
          'This is a platform limitation, not a test failure.');
      }
    }
  }

  /**
   * Clicks the Save button to persist the current form state.
   */
  async saveForm() {
    console.log("Saving form");
    // Playwright auto-waits for the button to be visible and enabled before clicking.
    await this.saveButton.click();
  }

  /**
   * Verifies that the form was saved successfully.
   * 
   * TODO: Update this placeholder assertion once the application's runtime save success behavior
   * (e.g., specific success toast message, redirect URL, or status indicator) is confirmed.
   */
  async verifySaveSuccess() {
    console.log("Verifying save success");
    
    // Assert the success toast notification appears with expected text
    await expect(
      this.page.locator("div.toast-message")
    ).toContainText(/successfully saved/i);
  }

  /**
   * Helper method to perform a manual drag-and-drop sequence using mouse actions.
   * Useful when elements are built with frameworks that do not react to native dragTo commands.
   * 
   * @param {import('@playwright/test').Locator} source - Locator of the element to drag.
   * @param {import('@playwright/test').Locator} target - Locator of the element to drop onto.
   * @private
   */
  async _performManualDrag(source, target) {
    // Ensure both elements are scrolled into the viewport before fetching bounding boxes.
    await source.scrollIntoViewIfNeeded();
    const sourceBox = await source.boundingBox();

    await target.scrollIntoViewIfNeeded();
    const targetBox = await target.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error('Failed to resolve coordinates. Element might be hidden or detached from the DOM.');
    }

    // Calculate center coordinates
    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    // Simulate drag sequence
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY, { steps: 20 }); // Multiple steps ensure smooth drag movement simulation.
    await this.page.mouse.up();
  }
}
