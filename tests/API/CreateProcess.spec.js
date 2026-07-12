import { test, expect } from '@playwright/test';
import { login, createForm, getFormMetadata, saveFormContent, saveDependencies, BOTS_FOLDER_ID, createProcess, saveProcessContent } from '../../utils/apiClient.js';

test.describe('API Form and Process Creation Flow (API Automation)', () => {
  let token;

  test.beforeAll(async () => {
    // Authenticate using environmental credentials
    console.log("Authenticating API user...");
    const loginResponse = await login(process.env.AA_USERNAME, process.env.AA_PASSWORD);
    token = loginResponse.token;
    expect(token).toBeDefined();
  });

  test('should create a form and a linked process via API, and save all dependencies', async () => {
    const formName = `API_Assignment_Test_${Date.now()}`;

    // Step 1: Create Form in the verified BOTS_FOLDER_ID folder
    console.log(`Step 1: Creating Form '${formName}' under folder ID: ${BOTS_FOLDER_ID}`);
    const createRes = await createForm(token, BOTS_FOLDER_ID, formName);
    expect(createRes.status).toBe(201);
    
    const formId = createRes.body.id;
    expect(formId).toBeDefined();
    expect(typeof formId).toBe('string');
    expect(formId.length).toBeGreaterThan(0);
    console.log(`Form created successfully. ID: ${formId}`);

    // Step 2: Retrieve Form Metadata
    console.log(`Step 2: Retrieving Form Metadata for ID: ${formId}`);
    const metaRes = await getFormMetadata(token, formId);
    expect(metaRes.status).toBe(200);
    expect(metaRes.body.id).toBe(formId);

    // Step 3: Save Form Content
    console.log(`Step 3: Saving Form Content (Textbox, Textarea, Number fields) for ID: ${formId}`);
    const saveContentRes = await saveFormContent(token, formId, formName);
    expect(saveContentRes.status).toBe(200);

    // Step 4: Save Form Dependencies
    console.log(`Step 4: Saving Form Dependencies for ID: ${formId}`);
    const saveDepRes = await saveDependencies(token, formId);
    console.log('Save Dependencies Response Body:', JSON.stringify(saveDepRes.body, null, 2));
    console.log('Save Dependencies Status:', saveDepRes.status);
    expect(saveDepRes.status).toBe(200);

    // Step 6: Create Process
    console.log(`Step 6: Creating Process under folder ID: ${BOTS_FOLDER_ID}`);
    const processName = `API_Process_Test_${Date.now()}`;
    const createProcessRes = await createProcess(token, BOTS_FOLDER_ID, processName);
    expect(createProcessRes.status).toBe(201);
    const processId = createProcessRes.body.id;
    expect(processId).toBeDefined();
    expect(typeof processId).toBe('string');
    expect(processId.length).toBeGreaterThan(0);
    console.log(`Process created successfully. ID: ${processId}`);

    // Step 7: Save Process Content (3-node workflow: InitialStep -> FormStep -> exit)
    // The FormStep references the form created earlier in this test via its 
    // repository path, satisfying the requirement that both InitialStep and 
    // FormStep reference the form file.
    console.log(`Step 7: Saving Process Content (InitialStep -> FormStep -> exit) for ID: ${processId}`);
    const formRepositoryPath = `repository:///Automation%20Anywhere/Bots/${formName}`;
    const saveProcessRes = await saveProcessContent(token, processId, formRepositoryPath);
    expect(saveProcessRes.status).toBe(200);
    console.log('Process content saved successfully.');

    // Step 8: Save Process Dependencies, linking the form file as a dependency
    console.log(`Step 8: Saving Process Dependencies for ID: ${processId}, linking Form ID: ${formId}`);
    const saveProcessDepsRes = await saveDependencies(token, processId, [formId]);
    expect(saveProcessDepsRes.status).toBe(200);
    console.log('Process dependencies saved successfully, linking the form as a dependency.');

    console.log('Use Case 2 (Form and Process creation via API) completed successfully.');
  });
});
