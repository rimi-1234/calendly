// 1. Load your API keys first (CRITICAL)
require('dotenv').config(); 

// 2. Import the service you built
const calendlyService = require('./src/services/calendly');

// 3. Define the test data
const EVENT_URI = process.env.CALENDLY_EVENT_URI;
const TEST_DATE = '2026-01-26'; 
const TIME_TO_CHECK = '10:00';

async function runTests() {
  console.log("🚀 Starting Direct Function Tests...\n");

  try {
    // --- TEST 1: Check Availability ---
    console.log("--- 1. Testing checkAvailability() ---");
    const availability = await calendlyService.checkAvailability(EVENT_URI, TEST_DATE, TIME_TO_CHECK);
    
    console.log("Is Slot Available?", availability.is_specific_time_available);
    console.log("Total Slots Found:", availability.total_slots);
    
    // --- TEST 2: Get Booking Fields ---
    console.log("\n--- 2. Testing getBookingFields() ---");
    const fieldsData = await calendlyService.getBookingFields(EVENT_URI);
    console.log("Event Name:", fieldsData.event_name);
    
    // This helps you see the order of your questions!
    console.log("Fields Found:", fieldsData.fields.map(f => `${f.name} (${f.type})`).join(', '));

    // --- TEST 3: Create Booking Link ---
    console.log("\n--- 3. Testing createBookingLink() ---");
    
    // ✅ Define answers separately for clarity
    // Make sure these match the order of "Fields Found" above!
    const answer1 = "This is a text answer";       // Question 1
    const answer2 = "Option A";                    // Question 2 (Radio)
    const answer3 = ["Option 1", "Option 3"];      // Question 3 (Checkbox - Array)

    const bookingData = {
      name: "Direct Test User",
      email: "direct@test.com",
      guests: "", 
      date: TEST_DATE, 
      time: TIME_TO_CHECK,
      
      // Combine them into the list here
      customAnswers: [
        answer1, 
        answer2, 
        answer3
      ] 
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