# Automation Anywhere — Intern Automation Assignment

Automated test suite for Automation Anywhere Community Edition, covering:

- **Use Case 1 — UI Automation:** Building a Form with Textbox and Select File components via the Form Builder editor.
- **Use Case 2 — API Automation:** Creating a Form and a Process (with a linked 3-node workflow) entirely via the repository API.

**Framework:** Playwright (JavaScript, not TypeScript)
**Design pattern:** Page Object Model (POM) for UI automation

---

## Project Structure

```
Automation Anywhere/
├── pages/
│   ├── LoginPage.js       # Login page object
│   ├── DashboardPage.js   # Dashboard / navigation page object
│   └── FormPage.js        # Form Builder editor page object
├── tests/
│   ├── UI/
│   │   └── CreateForm.spec.js       # Use Case 1
│   └── API/
│       └── CreateProcess.spec.js    # Use Case 2
├── utils/
│   └── apiClient.js       # API helper functions for Use Case 2
├── test-data/
│   └── sample.pdf
├── .env                   # Credentials (gitignored, not committed)
├── .gitignore
├── playwright.config.js
├── package.json
└── README.md
```

---

## Setup and Execution

### Prerequisites
- Node.js (LTS recommended)
- A registered account on [Automation Anywhere Community Edition](https://www.automationanywhere.com/products/enterprise/community-edition)

### 1. Install dependencies
```bash
npm install
npx playwright install
```

### 2. Configure environment variables
Create a `.env` file in the project root (this file is gitignored and must never be committed):

```
AA_USERNAME=your-email@example.com
AA_PASSWORD=your-password
```

### 3. Run the UI test (Use Case 1)
```bash
npx playwright test tests/UI/CreateForm.spec.js --project=chromium --headed --workers=1
```

### 4. Run the API test (Use Case 2)
```bash
npx playwright test tests/API/CreateProcess.spec.js --project=chromium --workers=1
```

> **Important:** always run the API test with `--project=chromium --workers=1`. See [Known Environment Constraints](#known-environment-constraints) below for why.

### 5. Run the full suite
```bash
npx playwright test --project=chromium --workers=1
```

---

## Use Case 1: Form with Upload Flow (UI Automation)

**File:** `tests/UI/CreateForm.spec.js` — built using page objects in `pages/`.

**Flow:**
1. Log in (`LoginPage.js`)
2. Navigate to Automation and create a new Form (`DashboardPage.js`)
3. Drag a Textbox and a Select File component onto the canvas (`FormPage.js`)
4. Fill Textbox properties (Label, Default Value, Hint, Tooltip) — verified with `expect()`
5. Fill Select File properties (Label, Hint, Tooltip)
6. Attempt file upload (see limitation below)
7. Save the form and verify the success toast

### Key technical detail: the Form Builder editor runs inside an iframe
The entire editor (component palette, canvas, and properties panel) is rendered inside:
```html
<iframe class="modulepage-frame" src="/modules/attended/#/file/form/.../edit"></iframe>
```
All locators targeting the editor are scoped through `page.frameLocator('iframe.modulepage-frame')`. The save-success toast, however, renders **outside** this iframe on the main page and is located directly on `page`.

---

## Use Case 2: Create a Process with a Form via API (API Automation)

**Files:** `utils/apiClient.js` (API helper functions), `tests/API/CreateProcess.spec.js` (test).

**Flow and corresponding assignment steps:**

| Assignment step | Implementation |
|---|---|
| 1. Authenticate, capture token | `login()` — `POST /v2/authentication` |
| 2. Retrieve private workspace folder ID | See [Known Limitation: Folder ID](#known-limitation-no-endpoint-to-retrieve-private-workspace-folder-id) |
| 3. Create Form | `createForm()` — `POST /v2/repository/files` |
| 4. Save form content (TextBox, TextArea, Number) | `saveFormContent()` — `PUT /v2/repository/files/{id}/content` |
| 5. Save form dependencies | `saveDependencies()` — `PUT /v2/repository/files/{id}/dependencies` |
| 6. Create Process | `createProcess()` — `POST /v2/repository/files` |
| 7. Save process content (InitialStep → FormStep → exit) | `saveProcessContent()` — `PUT /v2/repository/files/{id}/content` |
| 8. Save process dependencies (form linked as dependency) | `saveDependencies()`, reused with the process's file ID |

Every step asserts the expected HTTP status (`201` for creation, `200` for saves), and both `formId` and `processId` are validated as defined, non-empty values before being reused in later steps.

### Authentication header
The API uses a non-standard authentication header:
```
X-Authorization: <token>
```
This is **not** the standard `Authorization: Bearer <token>` pattern — using the standard header will fail authentication.

### Content-Type per endpoint
Most endpoints use `Content-Type: application/json`. The one exception is Save Process Content, which requires:
```
Content-Type: application/vnd.aa.workflow
```

### Workflow linking
In the process content payload, `InitialStep.children[0].attributes` includes a `stepId` that must equal the `FormStep.uid` — this is how the two workflow nodes are linked into a graph. UIDs are generated fresh per test run via `crypto.randomUUID()`.

---

## Known Platform Limitations

These are documented findings, not test failures or bugs in this codebase.

### File upload not functional in Form Builder editor
The Select File component's upload control was tested via **two independent interaction methods**:
1. Clicking the "browse" link
2. Dragging a real file from the desktop directly onto the drop zone

Neither method triggered a functional file upload:
- No native file dialog opened in either case.
- `document.querySelectorAll('input[type="file"]').length` returns `0` in the browser console — there is no `<input type="file">` element anywhere in the DOM, hidden or otherwise.
- No visible upload state change occurred.
- The static "Preview" is a non-interactive screenshot-style mockup, not a live control.

Testing two meaningfully different interaction methods with the same result is strong evidence this is a genuine platform constraint rather than a selector or timing issue. This appears to be specific to the Form Builder's edit/design view — the Select File component may only become functional once a form is deployed and executed as part of a live bot task, which is outside the scope of this UI automation exercise. This was not confirmed further due to time constraints.

**Implementation:** `uploadFile()` attempts both the click and drag-drop interaction methods, with clear logging for each attempt, wrapped in a try/catch with a 5-second timeout. On failure, it logs a `console.warn` describing this finding and does **not** fail the test — failing here would misrepresent a platform/environment constraint as a test defect.

### No endpoint to retrieve private workspace folder ID
The following endpoints were investigated and confirmed to all require a folder ID as **input**, not provide one as output:
- `GET /v2/repository/folders/{folderId}`
- `GET /v2/repository/folders/{folderId}/ancestors`
- `POST /v2/repository/folders/{folderId}/list`

No endpoint was found that dynamically discovers a user's private workspace folder ID without already knowing a folder ID. As a result, this suite uses a hardcoded `BOTS_FOLDER_ID` constant in `apiClient.js`, set to the folder the Automation Anywhere UI itself uses for file creation on the test account. This is documented inline in the code.

---

## Known Environment Constraints

### API tests must run single-worker, single-browser
Running the API test across multiple Playwright browser projects (chromium, firefox, webkit) simultaneously causes intermittent `401 Unauthorized` errors. Automation Anywhere appears to allow only one active session per account — a second browser logging in invalidates the first browser's token mid-test.

**Fix:** always run API tests with `--project=chromium --workers=1`.

### Playwright default timeout
Playwright's default per-test timeout is 30 seconds total, not per action. The full UI flow (login, navigate, create, drag-and-drop twice, fill properties, save) exceeds this, so `test.setTimeout(120000)` is set at the start of the UI test.

### Avoid `waitForLoadState('networkidle')` after login
Automation Anywhere is a SPA with continuous background network requests, so `networkidle` never resolves reliably and can cause `Target page, context or browser has been closed` errors. Login success is instead verified with:
```javascript
page.waitForURL(/.*#\/home/, { timeout: 30000 })
```

---

## Tools and Framework Summary

| Aspect | Choice |
|---|---|
| Automation framework | Playwright |
| Language | JavaScript |
| UI design pattern | Page Object Model (POM) |
| API testing | Native `fetch`, wrapped in helper functions in `utils/apiClient.js` |
| Assertions | Playwright's built-in `expect()` |
