// run_integration.js
require('dotenv').config();

// 1. Import your functions directly
const calendlyService = require('./src/services/calendly');

// Settings
const EVENT_URI = process.env.CALENDLY_EVENT_URI;
const TEST_DATE = '2026-01-27';
const TEST_TIME = '10:00';

async function runDirectly() {
  console.log("⚡️ Running Calendly Functions Directly (No Autofill)...\n");

  try {
    // --- FUNCTION 2: Check Availability ---
    console.log(`1️⃣ Calling checkAvailability('${TEST_DATE}', '${TEST_TIME}')...`);
    const availability = await calendlyService.checkAvailability(EVENT_URI, TEST_DATE, TEST_TIME);
    
    if (!availability.is_specific_time_available) {
      console.log("   ❌ Slot is not available. Stopping.");
      return;
    }
    console.log("   ✅ Slot is available!");

    // --- FUNCTION 3: Get Booking Fields ---
    console.log("\n2️⃣ Calling getBookingFields() (Just to verify structure)...");
    const fieldsData = await calendlyService.getBookingFields(EVENT_URI);
    console.log(`   ✅ Event has ${fieldsData.fields.length} fields.`);

    // --- FUNCTION 4: Create Booking Link ---
    console.log("\n3️⃣ Calling createBookingLink()...");
    
    const bookingData = {
      // ✅ LEFT EMPTY (User must type these manually)
      name: "", 
      email: "",
      guests: "",
      
      // Keep Date/Time so the link points to this specific slot
      date: TEST_DATE,
      time: TEST_TIME,

      // ✅ NO CUSTOM ANSWERS (Form will be blank)
      customAnswers: [] 
    };

    const link = await calendlyService.createBookingLink(EVENT_URI, bookingData);
    console.log("\n✅ SUCCESS! Here is your blank link:");
    console.log(link);

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run it immediately
runDirectly();