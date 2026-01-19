// 1. Load keys
require('dotenv').config(); 
const calendlyService = require('./src/services/calendly');

const EVENT_URI = process.env.CALENDLY_EVENT_URI;

async function getBlankLink() {
  console.log("🚀 Generating a completely BLANK link...\n");

  try {
    const bookingData = {
      // 1. Leave everything EMPTY
      name: "", 
      email: "",
      guests: "",
      
      // 2. No Date/Time (User must pick from calendar)
      date: "", 
      time: "",
      
      // 3. No Answers
      customAnswers: [] 
    };

    const link = await calendlyService.createBookingLink(EVENT_URI, bookingData);
    
    console.log("✅ BLANK LINK GENERATED:");
    console.log(link);
    console.log("\n👉 This link will open the Calendar first. All fields will be empty.");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

getBlankLink();