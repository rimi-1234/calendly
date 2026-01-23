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
  // These are standard invitee fields, usually handled separately from custom_questions
  { name: "full_name", type: "name", label: "Name *", required: true },
  { name: "email", type: "email", label: "Email *", required: true },
  
  // Custom Questions
  { 
    name: "question_0", 
    type: "text", // Changed from textarea
    label: "Please share anything that will help prepare for our meeting.", 
    required: false 
  },
  { 
    name: "question_1", 
    type: "single_select", // Changed from dropdown
    label: "This is a dropdown", 
    required: false,
    answer_choices: ["Option 1", "Option 2"] // Required for select types
  },
  { 
    name: "question_2", 
    type: "multi_select", // Changed from checkbox
    label: "Checkbozes", 
    required: false,
    answer_choices: ["Check1", "Check2"] // Required for select types
  },
  { 
    name: "question_3", 
    type: "single_select", // Changed from radio
    label: "Radio", 
    required: false,
    answer_choices: ["radio1", "radio2"]
  },
  { 
    name: "question_4", 
    type: "text", // Changed from textarea
    label: "Multiple lines", 
    required: true 
  },
  { 
    name: "question_5", 
    type: "phone_number", // Changed from phone
    label: "Phone Number input fields", 
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
  targetDate: "2026-01-29",
  time: "14:00",
  checkWithRange: {
    from: "2026-01-01",
    to: "2026-02-01",
  },
  bookingInformation: {
    full_name: "John Doe",
    email: "john.doe@example.com",
    
    // This array must match the 'Invitee Question and Answer' schema
    questions_and_answers: [
      {
        // Use the actual Question text, not 'question_0'
        question: "Please share anything that will help prepare for our meeting.",
        answer: "Integration test.",
        position: 0
      },
      {
        question: "This is a dropdown",
        answer: "Option1",
        position: 1
      },
      {
        question: "Checkbozes",
        answer: "Check1",
        position: 2
      },
      {
        question: "Radio",
        answer: "radio1",
        position: 3
      },
      {
        // Must match the exact string including the newline and asterisk
        question: "Multiple lines", 
        answer: "Detailed research notes.",
        position: 4
      },
      {
        question: "Phone Number input fields",
        answer: "+8801711111111",
        position: 5
      }
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