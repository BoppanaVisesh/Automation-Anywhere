import crypto from 'node:crypto';

/**
 * API client utilities for the Automation Anywhere portal.
 */

// NOTE: The assignment asks to "retrieve the private workspace folder ID 
// for the authenticated user." After systematic investigation of the 
// repository API (folder metadata, ancestors, and list endpoints via 
// Chrome DevTools), no endpoint was found that dynamically discovers a 
// user's private workspace folder without already knowing a folder ID. 
// All repository endpoints require a folder ID as input, not output. 
// The 'Bots' folder (ID: 32996680) is used here as it is the folder 
// used by the Automation Anywhere UI for file creation for this account.
export const BOTS_FOLDER_ID = '32996680';

/**
 * Authenticates the user with the community cloud API.
 * 
 * @param {string} username - Account email/username.
 * @param {string} password - Account password.
 * @returns {Promise<Object>} The authentication response containing the token.
 */
export async function login(username, password) {
  const response = await fetch('https://community.cloud.automationanywhere.digital/v2/authentication', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Login failed with status ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

/**
 * Generates authentication headers using the provided token.
 * 
 * @param {string} token - The auth token.
 * @returns {Object} Headers object.
 */
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'X-Authorization': token
  };
}

/**
 * Creates a new form file in the repository.
 * 
 * Expected success status: 201
 * Response contains: id, name, parentId, type
 * The returned id must be reused for subsequent Save Form Content and Save Form Dependencies calls
 * 
 * @param {string} token - The auth token.
 * @param {string|number} folderId - ID of the parent folder.
 * @param {string} formName - The name of the new form.
 * @returns {Promise<Object>} Object containing response status and parsed JSON body.
 */
export async function createForm(token, folderId, formName) {
  const response = await fetch('https://community.cloud.automationanywhere.digital/v2/repository/files', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      name: formName,
      parentFolderId: folderId,
      description: "",
      contentType: "application/vnd.aa.form"
    })
  });

  const responseBody = await response.json();

  return {
    status: response.status,
    body: responseBody
  };
}

/**
 * Saves form content with textbox, textarea, and number inputs.
 * Note: This payload structure was captured directly from the Chrome DevTools Network tab, not inferred.
 * 
 * @param {string} token - The auth token.
 * @param {string|number} fileId - The created form file ID.
 * @param {string} formTitle - The form title.
 * @returns {Promise<Object>} Object containing status and raw text body.
 */
export async function saveFormContent(token, fileId, formTitle) {
  const payload = {
    form: {
      properties: {
        title: formTitle,
        dimension: {
          height: 600,
          width: 600,
          displayHeight: 600
        },
        font: {
          fontType: "System",
          fontSize: "MEDIUM"
        },
        closeOnEndMachine: false,
        minimizeOnEndMachine: false,
        hiddenElements: [],
        brandLogos: [],
        logoCount: "Zero",
        position: {
          isFormPreviewCentered: false,
          startX: 650,
          startY: 10
        },
        formPlacement: "TOP_LEFT"
      },
      version: "2",
      rules: [],
      documentElement: {
        rows: [
          {
            columns: [
              {
                type: "TextBox",
                fieldType: "TextBox",
                id: "TextBox",
                label: "TextBox",
                defaultValue: "",
                toolTip: "",
                hintText: "",
                mandatory: false,
                hidden: false,
                readOnly: false,
                width: 100,
                minLength: -1,
                maxLength: -1,
                masked: false,
                regex: "",
                regexErrorMessage: "",
                validationType: "standard"
              }
            ]
          },
          {
            columns: [
              {
                type: "TextArea",
                fieldType: "TextArea",
                id: "TextArea",
                label: "TextArea",
                defaultValue: "",
                toolTip: "",
                hintText: "",
                mandatory: false,
                hidden: false,
                readOnly: false,
                width: 100,
                minLength: -1,
                maxLength: -1,
                height: 64
              }
            ]
          },
          {
            columns: [
              {
                type: "Number",
                fieldType: "Number",
                id: "Number",
                label: "Number",
                defaultValue: "",
                toolTip: "",
                hintText: "",
                mandatory: false,
                readOnly: false,
                width: 100,
                minLength: -1,
                maxLength: -1,
                allowNegative: true,
                allowTrailingZeros: false,
                commaSeparatedThousands: false,
                numberOfDecimalPlaces: 3,
                prefixText: "",
                suffixText: "",
                hidden: false
              }
            ]
          }
        ],
        styles: {}
      }
    }
  };

  const response = await fetch(
    `https://community.cloud.automationanywhere.digital/v2/repository/files/${fileId}/content?hasErrors=false`,
    {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    }
  );

  return { status: response.status, body: await response.text() };
}

/**
 * Retrieves the metadata of a form.
 * 
 * @param {string} token - The auth token.
 * @param {string|number} fileId - The form file ID.
 * @returns {Promise<Object>} Object containing response status and body.
 */
export async function getFormMetadata(token, fileId) {
  const response = await fetch(`https://community.cloud.automationanywhere.digital/v2/repository/files/${fileId}`, {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  const responseBody = await response.json();

  return {
    status: response.status,
    body: responseBody
  };
}

/**
 * Saves form dependencies.
 * 
 * @param {string} token - The auth token.
 * @param {string|number} fileId - The form file ID.
 * @param {Array} [childFileIds=[]] - The dependent file IDs.
 * @returns {Promise<Object>} Object containing response status and raw text body.
 */
export async function saveDependencies(token, fileId, childFileIds = []) {
  const url = `https://community.cloud.automationanywhere.digital/v2/repository/files/${fileId}/dependencies`;
  const body = JSON.stringify({ childFileIds });
  
  console.log('Save Dependencies Request URL:', url);
  console.log('Save Dependencies Request Body:', body);
  // console.log('Save Dependencies Request Headers:', JSON.stringify(getAuthHeaders(token)));

  const response = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: body
  });

  const responseText = await response.text();
  return { status: response.status, body: responseText };
}

/**
 * Creates a new process in the repository.
 * 
 * Verified via Chrome DevTools: endpoint is POST /v2/repository/files
 * Expected success status: 201
 * Response contains: id, parentId, name, type
 * The returned id must be reused for Save Process Content and Save Process Dependencies calls
 * 
 * @param {string} token - The auth token.
 * @param {string|number} folderId - ID of the parent folder.
 * @param {string} processName - The name of the process.
 * @returns {Promise<Object>} Object containing response status and body.
 */
export async function createProcess(token, folderId, processName) {
  const response = await fetch('https://community.cloud.automationanywhere.digital/v2/repository/files', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      contentType: "application/vnd.aa.workflow",
      description: "",
      name: processName,
      parentFolderId: folderId
    })
  });

  const responseBody = await response.json();

  return {
    status: response.status,
    body: responseBody
  };
}

/**
 * Saves workflow/process content with InitialStep, FormStep, and exit nodes.
 * Note: The Content-Type header must be application/vnd.aa.workflow for this specific endpoint.
 * 
 * @param {string} token - The auth token.
 * @param {string|number} fileId - The created process file ID.
 * @param {string} formRepositoryPath - Repository path of the dependent form.
 * @returns {Promise<Object>} Object containing response status and text body.
 */
export async function saveProcessContent(token, fileId, formRepositoryPath) {
  const initialStepUid = crypto.randomUUID();
  const formStepUid = crypto.randomUUID();
  const exitUid = crypto.randomUUID();

  const payload = {
    nodes: [
      {
        commandName: "InitialStep",
        packageName: "HBCWorkflow",
        uid: initialStepUid,
        attributes: [
          { name: "caseTitle", value: { type: "STRING", string: "API Process Request" } },
          { name: "stepTitle", value: { type: "STRING", string: "Request Creation" } },
          { name: "initMethod", value: { string: "INIT_BY_INPUT" } },
          { name: "aaFileStorage", value: { type: "STRING", string: "aari" } },
          { name: "piiTag", value: { type: "STRING", string: "" } }
        ],
        children: [
          {
            children: [],
            attributes: [{ name: "stepId", value: { string: formStepUid } }],
            commandName: "schedule",
            packageName: "HBCWorkflow",
            uid: crypto.randomUUID()
          }
        ],
        layout: { x: 140, y: 140, outgoingEdgeSelfHandle: "HANDLEBOTTOM" }
      },
      {
        commandName: "FormStep",
        packageName: "HBCWorkflow",
        uid: formStepUid,
        attributes: [
          { name: "stepAlias", value: { type: "STRING", string: "Form" } },
          { name: "stepTitle", value: { type: "STRING", string: "" } },
          { name: "hidden", value: { type: "BOOLEAN", boolean: "false" } },
          { name: "readOnly", value: { type: "BOOLEAN", boolean: "false" } },
          { name: "formButtons", value: { dictionary: [{ value: { string: "primary" }, key: "Submit" }], type: "DICTIONARY" } },
          { name: "showInRequested", value: { type: "BOOLEAN", boolean: false } },
          { name: "stepInput", value: { type: "TASKBOT", taskbotFile: { type: "FILE", string: formRepositoryPath } } },
          { name: "piiTag", value: { type: "STRING", string: "" } }
        ],
        children: [
          {
            commandName: "exit",
            packageName: "HBCWorkflow",
            uid: exitUid,
            attributes: [{ name: "caseExit", value: { string: "SUCCESS" } }],
            layout: { x: 140, y: 540, incomingEdgeSelfHandle: "HANDLETOP", incomingEdgeSourceHandle: "HANDLEBOTTOM" }
          }
        ],
        layout: { x: 127, y: 337, incomingEdgeSelfHandle: "HANDLETOP", incomingEdgeSourceHandle: "HANDLEBOTTOM", outgoingEdgeSelfHandle: "HANDLEBOTTOM" }
      }
    ],
    orphans: [],
    swimlanes: [],
    swimlaneStacking: "LEFT_TO_RIGHT",
    variables: [],
    isProcessV2: true
  };

  const response = await fetch(
    `https://community.cloud.automationanywhere.digital/v2/repository/files/${fileId}/content?hasErrors=false`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.aa.workflow',
        'X-Authorization': token
      },
      body: JSON.stringify(payload)
    }
  );

  return { status: response.status, body: await response.text() };
}
