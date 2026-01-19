// 1. Load your API keys first (CRITICAL)
require('dotenv').config(); 

// 2. Import the service you built
const calendlyService = require('./src/services/calendly');

// 3. Define the test data
const EVENT_URI = process.env.CALENDLY_EVENT_URI;
const DATE_TO_CHECK = '2026-01-25'; // Change to a future date
const TIME_TO_CHECK = '10:00';

async function runTests() {
  console.log("🚀 Starting Direct Function Tests...\n");

  try {
    // --- TEST 1: Check Availability ---
    console.log("--- 1. Testing checkAvailability() ---");
    const availability = await calendlyService.checkAvailability(EVENT_URI, DATE_TO_CHECK, TIME_TO_CHECK);
    console.log("Is Slot Available?", availability.is_specific_time_available);
    console.log("Total Slots Found:", availability.total_slots);
    
    // --- TEST 2: Get Booking Fields ---
    console.log("\n--- 2. Testing getBookingFields() ---");
    const fieldsData = await calendlyService.getBookingFields(EVENT_URI);
    console.log("Event Name:", fieldsData.event_name);
    console.log("Fields Found:", fieldsData.fields.map(f => f.name).join(', '));

    // --- TEST 3: Create Booking Link ---
    console.log("\n--- 3. Testing createBookingLink() ---");
    const bookingData = {
      name: "Direct Test User",
      email: "direct@test.com",
      guests: "",
      date: DATE_TO_CHECK,
      time: TIME_TO_CHECK,
      customAnswers: ["Answer 1", "Answer 2"] // Mock answers
    };

    const link = await calendlyService.createBookingLink(EVENT_URI, bookingData);
    console.log("✅ Generated Link:", link);

  } catch (error) {
    console.error("❌ Error during test:", error.message);
    if(error.response) console.error("API Details:", error.response.data);
  }
}

// Run the function
runTests();