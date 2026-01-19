require('dotenv').config(); 
const calendlyService = require('./src/services/calendly');
const EVENT_URI = process.env.CALENDLY_EVENT_URI;

async function getFreshLink() {
  console.log("🔄 Generating a FRESH Test Link...");

  try {
    // 1. Get Questions to ensure we use valid options
    const fields = await calendlyService.getBookingFields(EVENT_URI);
    
    // 2. Auto-Select VALID answers (First option for everything)
    const answers = fields.fields
      .filter(f => f.position >= 0) // Only custom questions
      .map(f => {
         if(f.options && f.options.length > 0) return f.options[0]; // Pick 1st Option
         if(f.type === 'phone') return "+15550199";
         return "Test Answer";
      });

    // 3. Create Link
    const link = await calendlyService.createBookingLink(EVENT_URI, {
      name: "Fresh Test",
      email: "fresh@test.com",
      date: "2026-01-26",
      time: "10:00",
      customAnswers: answers
    });

    console.log("\n✅ NEW LINK CREATED (Copy this carefully):");
    console.log(link);

  } catch (error) { console.error(error.message); }
}

getFreshLink();