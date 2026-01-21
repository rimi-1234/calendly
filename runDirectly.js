require('dotenv').config();
const calendlyService = require('./src/services/calendly');

const EVENT_URI = process.env.CALENDLY_EVENT_URI;
const TEST_DATE = '2026-01-22'; 
const TEST_TIME = '12:00';      

async function runDirectly() {
  console.log("⚡️ Starting PhD Research Automated Workflow...\n");

  try {
    // --- STEP 1: VERIFY AVAILABILITY (F2) ---
    // Respects your EN 541, 506, and 571 course schedule
    console.log(`1️⃣ Checking if ${TEST_DATE} at ${TEST_TIME} is available...`);
    const availabilityData = await calendlyService.checkAvailability(EVENT_URI, TEST_DATE, TEST_TIME);
    
    if (!availabilityData.is_specific_time_available) {
      console.log("   ❌ Slot is busy or conflicts with your PhD lectures.");
      return;
    }
    console.log("   ✅ Slot is available!");

    // --- STEP 2: FETCH RESEARCH FIELDS (F3) ---
    // Loads the 9 questions for water quality mapping
    console.log("\n2️⃣ Fetching research fields...");
    const fieldsResponse = await calendlyService.getBookingFields(EVENT_URI);
    const fields = fieldsResponse.fields; 

    // Prepare the data structure
const bookingData = {
    name: "Rimi PhD Participant",
    email: "participant@example.com",
    date: TEST_DATE,
    time: TEST_TIME,
    timezone: 'Asia/Dhaka', 
    answers: fields.map((field) => {
        let testValue = "PhD Research: Dhaka Water Quality"; // Default for text

        // Handle Radio and Dropdown: Must match one of the 'options'
        if (field.type === 'radio' || field.type === 'dropdown') {
            testValue = field.options[0] || "Option 1"; 
        }

        // Handle Checkboxes: API expects a comma-separated string or specific format
        if (field.type === 'checkbox') {
            testValue = field.options.slice(0, 2).join(", "); // Selects first two options
        }

        // Handle Multiline: Can be a long string
        if (field.type === 'text_multiline') {
            testValue = "Analysis of water contaminants in Dhaka Division.\nFocusing on Physicochemical Processes.";
        }

        // Handle Phone
        if (field.type === 'phone') {
            testValue = "+8801700000000";
        }

        return {
            question: field.name,
            value: testValue
        };
    })
};

    // --- STEP 3: ATTEMPT ACTUAL BOOKING (F4) ---
    console.log("\n3️⃣ Attempting Direct API Booking...");
    try {
        const result = await calendlyService.createActualBooking(EVENT_URI, bookingData);
        
        if (result.success) {
            console.log("\n🎊 SUCCESS! ACTUAL BOOKING CONFIRMED.");
            console.log("🔗 Event Resource URI:", result.event_uri); //
            return; 
        }
    } catch (error) {
        // --- STEP 4: FALLBACK TO PREFILLED LINK ---
        // Triggered by 403 error on Free Plans
        if (error.response?.status === 403) {
            console.log("⚠️ Plan Limitation: Creating Pre-filled Link workaround...");
            
            const publicBaseUrl = "https://calendly.com/messagemind-europe/test-event";
            const params = new URLSearchParams({
                name: bookingData.name,
                email: bookingData.email,
                date: bookingData.date,
                time: bookingData.time
            });

            // Maps answers to a1, a2, etc. for the URL
            bookingData.answers.forEach((ans, index) => {
                params.append(`a${index + 1}`, ans.value);
            });

            const finalUrl = `${publicBaseUrl}?${params.toString()}`;
            console.log("\n🎊 SUCCESS! Pre-filled Link Generated.");
            console.log("🔗 Click to confirm (Data is already filled):");
            console.log("\x1b[36m%s\x1b[0m", finalUrl); 
        } else {
            throw error; 
        }
    }

  } catch (error) {
    console.error("\n❌ Workflow Failed.");
    console.error("Error Details:", error.response?.data || error.message);
  }
}

runDirectly();