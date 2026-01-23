import getCalendlyClient from '../config/client.mjs';
import dotenv from 'dotenv';
// Initialize the client once
const client = getCalendlyClient();

/**
 * [Function 2] Check Availability
 */
const checkAvailability = async (integration, params, onStream) => {
  try {
    const p = params || {};
    const eventName = p.eventName;
    const timezone = p.timezone;
    const targetDate = p.targetDate;
    const time = p.time;
    const checkWithRange = p.checkWithRange;

    console.log("------------------------------------------");
    console.log("📥 RECEIVED PARAMS DATA:");
    console.log(`📌 Event Name: ${eventName}`);
    console.log(`🌍 Timezone:   ${timezone || 'Asia/Dhaka'}`);
    console.log(`📅 Target Date: ${targetDate || 'Not Provided'}`);
    console.log(`⏰ Target Time: ${time || 'Not Provided'}`);
    if (checkWithRange) {
      console.log(`📏 Range:       From ${checkWithRange.from} to ${checkWithRange.to}`);
    }

    if (onStream) onStream(`🎬 Initializing availability check for: ${eventName}`);

    const event = integration.keys.events.find(e => e.eventName === eventName);
    if (!event) {
      if (onStream) onStream("❌ Error: Event not found in your configuration.");
      return { success: false, error: "Event mismatch" };
    }

    let startSearch = targetDate ? new Date(targetDate) : new Date(checkWithRange && checkWithRange.from);
    let endSearch = targetDate ? new Date(targetDate) : new Date(checkWithRange && checkWithRange.to);

    startSearch.setUTCHours(0, 0, 0, 0);
    endSearch.setUTCHours(23, 59, 59, 999);

    if (onStream) {
      onStream(
        `📅 Searching from ${startSearch.toISOString().split('T')[0]} to ${endSearch.toISOString().split('T')[0]}`
      );
    }

    const response = await client.get('/event_type_available_times', {
      params: {
        event_type: event.eventUri,
        start_time: startSearch.toISOString(),
        end_time: endSearch.toISOString(),
        timezone: timezone || 'Asia/Dhaka'
      },
    });

    const availableSlots = response.data.collection;

    let isAvailable = false;
    if (time && targetDate) {
      isAvailable = availableSlots.some(slot => slot.start_time.includes(time));
      if (onStream) onStream(isAvailable ? `✅ Slot ${time} is available!` : `❌ Slot ${time} is occupied.`);
    } else {
      if (onStream) onStream(`📊 Found ${availableSlots.length} available slots across the range.`);
    }

    return {
      success: true,
      is_specific_time_available: isAvailable,
      available_slots: availableSlots,
      range_checked: { from: startSearch, to: endSearch }
    };

  } catch (error) {
    if (onStream) onStream(`❌ System Error: ${error.message}`);
    throw error;
  }
};

/**
 * ✅ ADD THIS HELPER (FIXES isInviteeField is not defined)
 * Detect if a Calendly custom field is actually invitee info (Name/Email),
 * so it should NOT be part of questions_and_answers.
 */

const isInviteeField = (field) => {
  if (!field) return false;

  const name = String(field.name || '').toLowerCase().trim();
  const label = String(field.label || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\*/g, '')
    .toLowerCase()
    .trim();

  // Check internal name keys
  const isNameKey = ['full_name', 'name', 'fullname', 'full_name'].includes(name);
  const isEmailKey = ['email', 'email_address', 'emailaddress'].includes(name);

  // Check human-readable labels
  const isNameLabel = ['name', 'full name'].includes(label);
  const isEmailLabel = ['email', 'email address'].includes(label);

  return isNameKey || isEmailKey || isNameLabel || isEmailLabel;
};

/**
 * [Function 3] Get Booking Fields
 * ✅ FIXED: Removed hardcoded "30 Minute Meeting"
 * ✅ ADDED: Normalization for robust event matching
 */
// Helper to identify standard identity fields vs custom questions



const getBookingFields = async (integration, params = {}) => { // Default params to empty object
  try {
    // 1. Safety check: Ensure params exists before destructuring
    if (!params) {
      throw new Error("Parameters object is missing.");
    }

    const {
      eventName,
      timezone,
      targetDate,
      time,
      checkWithRange
    } = params;

    // Normalization helper for event names
    const normalize = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

    // Fallback to "Test Event" if eventName is null/undefined
    const targetEventName = eventName || "Test Event";

    // 2. Safety check: Ensure integration and events list exist
    if (!integration?.keys?.events) {
      throw new Error("Integration configuration or events list is missing.");
    }

    const event = integration.keys.events.find(e => 
      normalize(e.eventName) === normalize(targetEventName)
    );

    if (!event || !event.customFields) {
      throw new Error(`Event configuration for "${targetEventName}" missing.`);
    }

    // 3. Filter out Name/Email (Standard invitee fields)
    const questionFields = event.customFields.filter(f => !isInviteeField(f));

    const mappedFields = questionFields.map((field, index) => {
      const cleanLabel = String(field.label || '').replace(/\\n|\n|\*/g, '').trim();

      return {
        name: field.name,
        label: cleanLabel || "Field",
        type: field.type,
        required: !!field.required,
        options: field.options ? field.options.map(opt => typeof opt === 'string' ? opt : (opt.label || opt)) : [],
        answer_key: `a${index + 1}`, 
        position: index
      };
    });

    return {
      success: true,
      event_details: {
        name: event.eventName,
        uri: event.eventUri,
        scheduling_url: event.scheduling_url
      },
      booking_context: {
        timezone: timezone || "UTC", // Default timezone if missing
        targetDate: targetDate || null,
        time: time || null,
        checkWithRange: checkWithRange || null
      },
      fields: mappedFields
    };
  } catch (error) {
    // This catches the "undefined" error and returns a clean message instead of crashing
    console.error("❌ Error mapping fields:", error.message);
    return { success: false, error: error.message };
  }
};



/**
 * [Function 4] Create Booking Link
 * ✅ UPDATED: supports answers passed as:
 *   { name: "question_2", value: "Raido1" }   (best)
 *   { answer_key: "a2", value: "Raido1" }
 *   { question: "radio quesiton", value: "Raido1" }  (fallback)
 */
const createActualBooking = async (integration, params, onStream) => {
  try {
    // 1. Setup variables and extract core data
    const { eventName, timezone, targetDate, time, bookingInformation } = params || {};
    const startTime = `${targetDate}T${time}:00Z`;

 
   

   

    // 2. Locate the specific event from integration
    const event = integration?.keys?.events?.find(e => e.eventName === eventName);
      const eventTypeUri = event.eventUri.startsWith('http') 
        ? event.eventUri 
        : `https://api.calendly.com/event_types/${event.eventUri}`;



    if (!event) throw new Error("Event configuration not found in integration");

    const calendarFields = event.customFields || [];



    // Helper: Strips non-alphanumeric chars for matching (bridges "Name" and "Name\n*")
    const normalize = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');



    const values = {};
    const missing = [];

    // 3. VALIDATION & MAPPING LOOP

    for (const field of calendarFields) {
      const { name, required, label } = field;
     console.log(name, required, label );
     


      let val = undefined;

      // Identity logic: Extract Name/Email from top-level or answers array
      if (normalize(name) === 'fullname' || normalize(label) === 'name') {
        val = bookingInformation.name;

        console.log( val);
        
      



      } else if (normalize(name) === 'email' || normalize(label) === 'email') {
        val = bookingInformation.email;
        console.log( val);
        
       

      } else {
        // Custom question logic: Search by key name or matching label
        const userAns = (bookingInformation.answers || []).find(a =>
          a.name === name || normalize(a.question) === normalize(label)
        );
        val = userAns?.value;
     

      }
     

      // Check if a required field is missing
      if (required && (val === undefined || String(val).trim() === '')) {
        const cleanLabel = label.replace(/\\n|\n|\*/g, '').trim();
        missing.push(cleanLabel);
      }

      if (val !== undefined) values[name] = val;
    }

    // 4. Return early if required fields are missing
    if (missing.length > 0) {
      const errorMsg = `❌ Missing required fields: ${missing.join(', ')}`;
      onStream?.(errorMsg);
      return { success: false, error: errorMsg };
    }

    // 5. TRANSFORM FOR CALENDLY API
    // Filter out Name/Email from custom questions (they belong in the invitee object)

    // This creates the array Calendly expects
// 5. TRANSFORM FOR CALENDLY API
// 5. TRANSFORM FOR CALENDLY API
// 5. TRANSFORM FOR CALENDLY API
// 1. IMPROVED FILTER: Strictly remove Name and Email
    const questions_and_answers = calendarFields
      .filter(f => {
        const n = normalize(f.name);
        const l = normalize(f.label);
        return !n.includes('name') && !n.includes('email') && !l.includes('name') && !l.includes('email');
      })
      .map((f, index) => {
        // Find answer by matching normalized labels
        const userAns = (bookingInformation.answers || []).find(a => 
          normalize(a.name) === normalize(f.name) || 
          normalize(a.question) === normalize(f.label)
        );

        const processedAnswer = String(userAns?.value || "").trim();

        return {
          question: f.label, // ✅ Sends exact label (e.g., "radio quesiton *")
          answer: processedAnswer, 
          position: index
        };
      });
    // 6. CONSTRUCT FINAL PAYLOAD
    const payload = {
      event_type: eventTypeUri,
      start_time: startTime,
      invitee: {
        name: bookingInformation.name,
        email: bookingInformation.email,
        timezone: bookingInformation.timezone || 'Asia/Dhaka',
      },
      // ✅ FIX: Match the location kind to the one set in your dashboard
      location: {
        kind: "physical",
        location: "Via durazzo 28"
      },
      questions_and_answers: questions_and_answers
    };
    console.log("--- Payload Questions ---");
    console.log(payload);
    // Validation check
payload.questions_and_answers.forEach(qa => {
  if (!qa.answer || qa.answer.trim() === "") {
    console.error(`ERROR: Question "${qa.question}" is being sent with a blank answer!`);
  }
});
    const response = await client.post('/invitees', payload);

    return {
      success: true,
      uri: response.data.resource.uri,
      status: 'booked'
    };

  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    onStream?.(`❌ Booking Failed: ${errorMsg}`);
    throw error;
  }
};

export {
  checkAvailability,
  getBookingFields,
  createActualBooking
};