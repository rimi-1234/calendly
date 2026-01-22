import { initializeGhlApi } from './src/integrations/ghl/initializeGhl.mjs';

async function runDirectly() {
  try {
    // 1. Call the initialization function
    const initializationResult = await initializeGhlApi(integration, "30 Minute Meeting");

    // 2. Print the entire object to the terminal
    console.log("------------------------------------------");
    console.log("🔍 DEBUG: initializeGhlApi Result:");
    console.dir(initializationResult, { depth: null }); 
    console.log("------------------------------------------");

    // 3. Destructure if you need specific fields later
    const { calendarId, client } = initializationResult;
    
    if (calendarId) {
      console.log(`✅ Extracted Calendar ID: ${calendarId}`);
    }

  } catch (error) {
    console.error("❌ Failed to print initialization data:", error.message);
  }
}

runDirectly();