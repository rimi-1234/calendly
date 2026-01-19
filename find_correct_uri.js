const axios = require('axios');
require('dotenv').config();

const token = process.env.CALENDLY_TOKEN;

const client = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

async function findCorrectUri() {
  console.log("🔍 Scanning your Token's permissions...\n");

  try {
    // 1. Who owns this token?
    const me = await client.get('/users/me');
    const userUri = me.data.resource.uri;
    console.log(`✅ Token belongs to: ${me.data.resource.name}`);

    // 2. What events does this user own?
    const events = await client.get('/event_types', {
      params: { user: userUri }
    });

    const myEvents = events.data.collection;

    if (myEvents.length === 0) {
      console.log("❌ This user has NO active events. Please go to Calendly.com and create one.");
    } else {
      console.log("\n✅ FOUND VALID EVENTS (Copy one of these URIs to your .env file):");
      console.log("---------------------------------------------------------------");
      myEvents.forEach((event, index) => {
        if (event.active) {
            console.log(`Event Name:  "${event.name}"`);
            console.log(`CORRECT URI: ${event.uri}`); // <--- COPY THIS
            console.log("---------------------------------------------------------------");
        }
      });
    }

  } catch (error) {
    console.error("❌ Token Error:", error.response?.data?.message || error.message);
  }
}

findCorrectUri();