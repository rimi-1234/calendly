import dotenv from 'dotenv';
import * as calendlyService from './src/services/calendly.mjs';

dotenv.config();
console.log(process.env.CALENDLY_EVENT_URI);
 const integration = {
  user: { "$oid": "690a5cb12f4318c6c9ace775" },
  platform: "Calendly",
  keys: {
    accessToken: process.env.CALENDLY_TOKEN,
    events: [
      {
        eventName: "Test Event",
        eventUri: process.env.CALENDLY_EVENT_URI,
        scheduling_url: "https://calendly.com/messagemind/test-event",
        customFields: [
          { name: "full_name", type: "text", label: "Name *", required: true },
          { name: "email", type: "email", label: "Email *", required: true },
          { 
            name: "question_0", 
            type: "textarea", 
            label: "Please share anything that will help prepare for our meeting.", 
            required: false 
          },
          { 
            name: "question_1", 
            type: "dropdown", 
            label: "This is a dropdown", 
            required: false 
          },
          { 
            name: "question_2", 
            type: "checkbox", 
            label: "Checkbozes", // Match dashboard spelling
            required: false 
          },
          { 
            name: "question_3", 
            type: "radio", 
            label: "Radio", 
            required: false 
          },
          { 
            name: "question_4", 
            type: "textarea", 
            label: "Multiple lines\n*", // Match newline asterisk
            required: true 
          },
          { 
            name: "question_5", 
            type: "phone", 
            label: "Phone Number input fields\n*", // Match newline asterisk
            required: true 
          }
        ]
      }
    ]
  },
  status: "Enabled"
};
 const params = {
  eventName: "Test Event",
  timezone: "Asia/Dhaka",
  targetDate: "2026-01-30",
  time: "14:00",

  checkWithRange: {

    from: "2025-09-28",

    to: "2025-10-28",

  },
  bookingInformation: {
    name: "John Doe",
    email: "john.doe@example.com",
    answers: [
      { name: "question_0", question: "Please share anything that will help prepare for our meeting.", value: "Integration test." },
      { name: "question_1", question: "This is a dropdown", value: "Option 1" },
      { name: "question_2", question: "Checkbozes", value: "Check1" },
      { name: "question_3", question: "Radio", value: "radio1" }, // Match case-sensitivity
      { name: "question_4", question: "Multiple lines\n*", value: "Detailed research notes." },
      { name: "question_5", question: "Phone Number input fields\n*", value: "+8801711111111" }
    ]
  }
};
const onStream = (msg) => console.log(`[STREAM]: ${msg}`);

async function runDirectly() {
  try {
    console.log("1️⃣ Checking Availability...");
    const availability = await calendlyService.checkAvailability(integration, params, onStream);
    if (!availability.is_specific_time_available) return console.log("❌ Unavailable.");

    console.log("\n2️⃣ Mapping Configuration Fields...");
    const fieldConfig = await calendlyService.getBookingFields(integration);
    console.log(`✅ Mapped ${fieldConfig.fields.length} fields.`);

    console.log("\n3️⃣ Attempting Direct API Booking...");
    try {
      const result = await calendlyService.createActualBooking(integration, params, onStream);
      if (result.success) {
        console.log("\n🎊 SUCCESS! ACTUAL BOOKING CONFIRMED.");
        console.log("🔗 URI:", result.uri);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        console.log("⚠️ Plan Limitation: Generating Pre-filled Link...");

        const event = integration.keys.events[0];
        const urlParams = new URLSearchParams({
          name: params.bookingInformation.name,
          email: params.bookingInformation.email
        });

        // Use the mapped answer keys (a1, a2, etc.) for the URL
        params.bookingInformation.answers.forEach((ans, index) => {
          urlParams.append(`a${index + 1}`, ans.value);
        });

        const finalUrl = `${event.scheduling_url}/${params.time}?date=${params.targetDate}&${urlParams.toString()}`;
        console.log("\n🎊 SUCCESS! Pre-filled Link Generated.");
        console.log("\x1b[36m%s\x1b[0m", finalUrl);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("\n❌ Workflow Failed.");
    console.error("Error:", error.response?.data || error.message);
  }
}

runDirectly();