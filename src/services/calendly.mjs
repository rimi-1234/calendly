import getCalendlyClient from "../config/client.mjs";
import dotenv from "dotenv";

dotenv.config();

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
    console.log(`🌍 Timezone:   ${timezone || "Asia/Dhaka"}`);
    console.log(`📅 Target Date: ${targetDate || "Not Provided"}`);
    console.log(`⏰ Target Time: ${time || "Not Provided"}`);
    if (checkWithRange) {
      console.log(`📏 Range:       From ${checkWithRange.from} to ${checkWithRange.to}`);
    }

    onStream?.(`🎬 Initializing availability check for: ${eventName}`);

    const event = integration?.keys?.events?.find((e) => e.eventName === eventName);
    if (!event) {
      onStream?.("❌ Error: Event not found in your configuration.");
      return { success: false, error: "Event mismatch" };
    }

    let startSearch = targetDate ? new Date(targetDate) : new Date(checkWithRange && checkWithRange.from);
    let endSearch = targetDate ? new Date(targetDate) : new Date(checkWithRange && checkWithRange.to);

    startSearch.setUTCHours(0, 0, 0, 0);
    endSearch.setUTCHours(23, 59, 59, 999);

    onStream?.(
      `📅 Searching from ${startSearch.toISOString().split("T")[0]} to ${endSearch.toISOString().split("T")[0]}`
    );

    const response = await client.get("/event_type_available_times", {
      params: {
        event_type: event.eventUri,
        start_time: startSearch.toISOString(),
        end_time: endSearch.toISOString(),
        timezone: timezone || "Asia/Dhaka",
      },
    });

    const availableSlots = response.data.collection || [];

    let isAvailable = false;
    if (time && targetDate) {
      isAvailable = availableSlots.some((slot) => slot.start_time?.includes(time));
      onStream?.(isAvailable ? `✅ Slot ${time} is available!` : `❌ Slot ${time} is occupied.`);
    } else {
      onStream?.(`📊 Found ${availableSlots.length} available slots across the range.`);
    }

    return {
      success: true,
      is_specific_time_available: isAvailable,
      available_slots: availableSlots,
      range_checked: { from: startSearch, to: endSearch },
    };
  } catch (error) {
    onStream?.(`❌ System Error: ${error.message}`);
    throw error;
  }
};

/**
 * ✅ Helper: Detect if a Calendly field is invitee identity (Name/Email)
 * so it should NOT be part of questions_and_answers.
 */
const isInviteeField = (field) => {
  if (!field) return false;

  const name = String(field.name || "").toLowerCase().trim();
  const label = String(field.label || "")
    .replace(/\r?\n/g, " ")
    .replace(/\*/g, "")
    .toLowerCase()
    .trim();

  // Internal name keys
  const isNameKey = ["full_name", "name", "fullname"].includes(name);
  const isEmailKey = ["email", "email_address", "emailaddress"].includes(name);

  // Human-readable labels
  const isNameLabel = ["name", "full name"].includes(label);
  const isEmailLabel = ["email", "email address"].includes(label);

  return isNameKey || isEmailKey || isNameLabel || isEmailLabel;
};

/**
 * [Function 3] Get Booking Fields
 * ✅ Normalized event matching
 */
const getBookingFields = async (integration, params = {}) => {
  try {
    if (!params) throw new Error("Parameters object is missing.");

    const { eventName, timezone, targetDate, time, checkWithRange } = params;

    const normalize = (s) => (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetEventName = eventName || "Test Event";

    if (!integration?.keys?.events) {
      throw new Error("Integration configuration or events list is missing.");
    }

    const event = integration.keys.events.find((e) => normalize(e.eventName) === normalize(targetEventName));

    if (!event || !event.customFields) {
      throw new Error(`Event configuration for "${targetEventName}" missing.`);
    }

    // filter out invitee fields
    const questionFields = event.customFields.filter((f) => !isInviteeField(f));

    const mappedFields = questionFields.map((field, index) => {
      const cleanLabel = String(field.label || "").replace(/\\n|\n|\*/g, "").trim();

      return {
        name: field.name,
        label: cleanLabel || "Field",
        type: field.type,
        required: !!field.required,
        options: field.options
          ? field.options.map((opt) => (typeof opt === "string" ? opt : opt.label || opt))
          : [],
        answer_key: `a${index + 1}`,
        position: index,
      };
    });

    return {
      success: true,
      event_details: {
        name: event.eventName,
        uri: event.eventUri,
        scheduling_url: event.scheduling_url,
      },
      booking_context: {
        timezone: timezone || "UTC",
        targetDate: targetDate || null,
        time: time || null,
        checkWithRange: checkWithRange || null,
      },
      fields: mappedFields,
    };
  } catch (error) {
    console.error("❌ Error mapping fields:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * [Function 4] Create Booking (Actual API call)
 * ✅ FIX: Supports bookingInformation.answers OR bookingInformation.questions_and_answers
 * ✅ FIX: Uses isInviteeField instead of risky "includes('name')"
 * ✅ FIX: Robust answer matching + required validation
 */
const createActualBooking = async (integration, params, onStream) => {
  try {
    const { eventName, timezone, targetDate, time, bookingInformation } = params || {};

    if (!bookingInformation) throw new Error("bookingInformation is required.");
    if (!targetDate || !time) throw new Error("targetDate and time are required.");

    // 1) Find event
    const event = integration?.keys?.events?.find((e) => e.eventName === eventName);
    if (!event) throw new Error("Event configuration not found in integration");

    const eventTypeUri = event.eventUri.startsWith("http")
      ? event.eventUri
      : `https://api.calendly.com/event_types/${event.eventUri}`;

    // 2) Invitee identity
    const inviteeName = bookingInformation.full_name || bookingInformation.name;
    const inviteeEmail = bookingInformation.email;

    if (!inviteeName || !inviteeEmail) {
      throw new Error("Invitee Name and Email are required.");
    }

    // ⚠️ NOTE:
    // This assumes `targetDate` + `time` is already UTC time since it appends "Z".
    // If your `time` is local Dhaka time, you should convert to UTC first.
    const startTime = `${targetDate}T${time}:00Z`;

    // 3) Normalize helper
    const normalize = (s) => (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");

    // 4) Accept BOTH formats:
    // - bookingInformation.answers: [{ name/question/answer_key, value }]
    // - bookingInformation.questions_and_answers: [{ question, answer, position }]
    const answers =
      (Array.isArray(bookingInformation.answers) && bookingInformation.answers) ||
      (Array.isArray(bookingInformation.questions_and_answers) &&
        bookingInformation.questions_and_answers.map((q) => ({
          // convert to internal format expected by matcher
          name: q.name, // optional
          question: q.question,
          value: q.answer, // IMPORTANT conversion
          answer_key: q.answer_key, // optional
          position: q.position,
        }))) ||
      [];

    // 5) Only custom question fields (exclude invitee fields via helper)
    const customFields = (event.customFields || []).filter((f) => !isInviteeField(f));

    // Build indexes for matching
    const answerByName = new Map();
    const answerByQuestionExact = new Map();
    const answerByQuestionNorm = new Map();
    const answerByAnswerKey = new Map();

    for (const a of answers) {
      if (!a) continue;
      if (a.name) answerByName.set(a.name, a);
      if (a.question) answerByQuestionExact.set(a.question, a);
      if (a.question) answerByQuestionNorm.set(normalize(a.question), a);
      if (a.answer_key) answerByAnswerKey.set(String(a.answer_key).toLowerCase(), a);

      // allow a1/a2 mistakenly sent in "name"
      if (a.name && /^a\d+$/i.test(a.name)) {
        answerByAnswerKey.set(String(a.name).toLowerCase(), a);
      }
    }

    const missing = [];

    const questions_and_answers = customFields.map((field, index) => {
      const ak = `a${index + 1}`;

      // priority: answer_key -> name -> question exact -> question normalized
      let userAns =
        answerByAnswerKey.get(ak) ||
        answerByName.get(field.name) ||
        answerByQuestionExact.get(field.label) ||
        answerByQuestionNorm.get(normalize(field.label)) ||
        null;

      const rawVal = userAns?.value;

      // treat 0 as valid but empty string as missing
      const valStr = rawVal === 0 ? "0" : rawVal == null ? "" : String(rawVal);
      const trimmed = valStr.trim();

      if (field.required && trimmed === "") {
        const cleanLabel = String(field.label || "").replace(/\\n|\n|\*/g, "").trim();
        missing.push(cleanLabel || field.name || `Field ${index + 1}`);
      }

      return {
        question: field.label, // MUST be exact label string Calendly expects
        answer: trimmed,
        position: index,
      };
    });


    console.log("text here:", questions_and_answers)

    if (missing.length > 0) {
      const errorMsg = `❌ Missing required fields: ${missing.join(", ")}`;
      onStream?.(errorMsg);
      return { success: false, error: errorMsg };
    }

    const payload = {
      event_type: eventTypeUri,
      start_time: startTime,
      invitee: {
        name: inviteeName,
        email: inviteeEmail,
        timezone: timezone || "Asia/Dhaka",
      },
      location: {
        kind: "physical",
        location: "Via durazzo 28",
      },
      questions_and_answers,
    };

    console.log("--- Sending Payload ---", JSON.stringify(payload, null, 2));

    const response = await client.post("/invitees", payload);

    return {
      success: true,
      uri: response.data?.resource?.uri,
      status: "booked",
    };
  } catch (error) {
    onStream?.(`❌ Booking Failed: ${error}`);
    throw error;
  }
};

export { checkAvailability, getBookingFields, createActualBooking };