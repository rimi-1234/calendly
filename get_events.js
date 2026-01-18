require('dotenv').config();
const getCalendlyClient = require('./src/config/client');

async function getEventTypes() {
  try {
    const token = process.env.CALENDLY_TOKEN;
    if (!token) {
      console.error("❌ Error: CALENDLY_TOKEN is missing in your .env file");
      return;
    }

    const client = getCalendlyClient(token);

    console.log("🔍 Step 1: Fetching your User URI...");
    
    // 1. Get the current User's URI (Required for the next step)
    const userResponse = await client.get('/users/me');
    const userUri = userResponse.data.resource.uri;
    console.log(`✅ User identified: ${userUri}`);

    console.log("🔄 Step 2: Fetching Event Types...");

    // 2. Get Event Types specifically for this User
    const eventsResponse = await client.get('/event_types', {
      params: {
        user: userUri 
      }
    });
    
    const events = eventsResponse.data.collection;

    if (events.length === 0) {
      console.log("⚠️ No events found. Please create an event type in Calendly first.");
      return;
    }

    console.log("\n✅ FOUND EVENTS (Copy the URI below):");
    events.forEach((event, index) => {
      console.log(`\n--- [Event #${index + 1}] ---`);
      console.log(`Name:  ${event.name}`);
      console.log(`Active:${event.active ? ' Yes' : ' No'}`);
      console.log(`URI:   ${event.uri}`); // <--- COPY THIS LINK
      console.log("-----------------------");
    });

  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

getEventTypes();