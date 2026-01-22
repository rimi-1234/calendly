import { initializeGhlApi } from './src/integrations/ghl/initializeGhl.mjs';

// Define the integration object at the top level
const integration = {
  user: { "$oid": "690a5cb12f4318c6c9ace775" },
  platform: "Calendly",
  keys: {
    accessToken: "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzYyNDQ0ODc0LCJqdGkiOiIzMDU5M2YxMy1lMTA2LTRjMDktYjkyNS1jMjc4NzU2ZGNmNGEiLCJ1c2VyX3V1aWQiOiI2NTI5NmUzZi1hMTE1LTQ2ZWMtODA5OC1jOTQ4MjcxNGU5NTMifQ.5sUwqk24Tkqv1s0auLcAKU0joF2H7AIv78HCg6xPNBTCUvjDTYlCc4V9VZFmKT-U07gXW2j5MVQay3dRnCAGQg",
    events: [
      {
        eventName: "30 Minute Meeting",
        eventUri: "992915d0-f7dc-4427-a245-22e19e289b0b",
        customFields: [
          { name: "full_name", label: "Name\n*", required: true },
          { name: "email", label: "Email\n*", required: true }
        ]
      }
    ]
  }
};

async function runDebug() {
  try {
    console.log("🚀 Starting GHL Initialization Debug...");

    // 1. Call the initialization function
    const initializationResult = await initializeGhlApi(integration, "30 Minute Meeting");

    // 2. Print result details
    console.log("------------------------------------------");
    console.log("🔍 DEBUG: initializeGhlApi Result Details:");
    console.dir(initializationResult, { depth: null }); 
    console.log("------------------------------------------");

    // 3. Destructure and verify extraction
    const { calendarId, calendarFields, client } = initializationResult;
    
    if (calendarId) {
      console.log(`✅ Extracted Calendar ID (eventUri): ${calendarId}`);
    }
    
    if (calendarFields) {
      console.log(`📋 Found ${calendarFields.length} Custom Fields.`);
    }

    if (client) {
      console.log("📡 Axios Client ready with baseURL and Headers.");
    }

  } catch (error) {
    // If you get "integration is not defined" here, 
    // it means the variable wasn't accessible in this scope.
    console.error("❌ Debugging Failed:", error.message);
  }
}

// Execute the debug function
runDebug();