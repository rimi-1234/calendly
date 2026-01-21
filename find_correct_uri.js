require('dotenv').config();
const axios = require('axios');

async function findMyEventURIs() {
  const token = process.env.CALENDLY_TOKEN;

  if (!token) {
    console.error("❌ Error: CALENDLY_TOKEN is missing in .env");
    return;
  }

  const client = axios.create({
    baseURL: 'https://api.calendly.com',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  try {
    console.log("🔍 Fetching your Calendly Event Types...\n");

    // 1. Get current user info to get the user URI
    const userResponse = await client.get('/users/me');
    const userUri = userResponse.data.resource.uri;

    // 2. Get all event types for this user
    const eventsResponse = await client.get('/event_types', {
      params: { user: userUri }
    });

    const events = eventsResponse.data.collection;

    if (events.length === 0) {
      console.log("⚠️ No events found in this account.");
      return;
    }

    console.log("✅ Found the following Event URIs:\n");
    console.log("--------------------------------------------------");
    
    events.forEach(event => {
      console.log(`📌 Event Name: ${event.name}`);
      console.log(`🔗 USE THIS URI: ${event.uri}`);
      console.log(`🌐 Public Link: ${event.scheduling_url}`);
      console.log("--------------------------------------------------");
    });

    console.log("\n💡 Copy the 'USE THIS URI' link into your .env as CALENDLY_EVENT_URI");

  } catch (error) {
    console.error("❌ Failed to fetch events:", error.response?.data || error.message);
  }
}

findMyEventURIs();