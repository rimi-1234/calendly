const getCalendlyClient = require('../config/client');

// Initialize the client once
const client = getCalendlyClient();

/**
 * [Function 2] Check Availability
 * Input: eventTypeUri, date (YYYY-MM-DD), time (HH:MM)
 * Output: Availability status (true/false) and list of all slots for that day (UTC)
 */
const checkAvailability = async (eventTypeUri, date, time) => {
  try {
    // 1. Define the search window (The full day in UTC)
    const startTime = new Date(date);
    startTime.setUTCHours(0, 0, 0, 0); // Start of day UTC
    
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 1); // End of day UTC

    // 2. Call Calendly API
    const response = await client.get('/event_type_available_times', {
      params: {
        event_type: eventTypeUri,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      },
    });

    const availableSlots = response.data.collection;

    // 3. Check for exact string match if a time was provided
    let exactMatch = null;
    if (time) {
      exactMatch = availableSlots.find(slot => slot.start_time.includes(time));
    }

    return {
      date_checked: date,
      total_slots: availableSlots.length,
      is_specific_time_available: !!exactMatch,
      available_slots: availableSlots 
    };

  } catch (error) {
    console.error("Error checking availability:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * [Function 3] Get Booking Fields
 * Matches video requirement: Name, Email, Guests, Checkbox, Radio, Dropdown, Multiline, Phone
 */
const getBookingFields = async (eventTypeUri) => {
  try {
    const uuid = eventTypeUri.split('/').pop();
    const response = await client.get(`/event_types/${uuid}`);
    const resource = response.data.resource;

    // --- 1. Standard Fields ---
    const standardFields = [
      { name: 'name', type: 'name', required: true, label: 'Name', position: -3 },
      { name: 'email', type: 'email', required: true, label: 'Email', position: -2 },
      { name: 'guests', type: 'email_list', required: false, label: 'Add Guests', position: -1 }
    ];

    // --- 2. Custom Fields (Mapping API types to UI types) ---
    const customFields = resource.custom_questions.map((q, index) => {
      let uiType = q.type;

      // Map Calendly API types to your desired "UI Types"
      if (q.type === 'string')        uiType = 'text_single_line';
      if (q.type === 'text')          uiType = 'text_multiline';   
      if (q.type === 'multi_select')  uiType = 'checkbox';         
      if (q.type === 'phone_number')  uiType = 'phone';            

      // SPLIT LOGIC: Distinguish Dropdown vs Radio
      if (q.type === 'single_select') {
        if (q.answer_choices.length <= 4) {
             uiType = 'radio';
        } else {
             uiType = 'dropdown';
        }
      }

      return {
        name: q.name,
        type: uiType,              
        original_type: q.type,
        required: q.required,
        options: q.answer_choices,
        position: index,
        answer_key: `a${index + 1}` // Key for Function 4 mapping
      };
    });

    return {
      event_name: resource.name,
      fields: [...standardFields, ...customFields]
    };

  } catch (error) {
    console.error("Error in getBookingFields:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * [Function 4] Create Booking Link
 * Handles Name, Email, Guests, Date, Time, and Custom Answers
 * ✅ UPDATED: Now handles Arrays (Checkboxes) correctly!
 */
const createBookingLink = async (eventTypeUri, bookingData) => {
  try {
    // 1. Create a Single-Use Scheduling Link
    const linkResponse = await client.post('/scheduling_links', {
      max_event_count: 1,
      owner: eventTypeUri,
      owner_type: 'EventType'
    });

    const bookingUrl = linkResponse.data.resource.booking_url;

    // 2. Map the data to URL parameters
    const params = new URLSearchParams();

    // Standard params
    params.append('name', bookingData.name);
    params.append('email', bookingData.email);
    
    if (bookingData.guests) {
      params.append('guests', bookingData.guests);
    }

    if (bookingData.date) params.append('date', bookingData.date); 
    if (bookingData.time) params.append('time', bookingData.time); 

    // Custom Answers
    if (bookingData.customAnswers && Array.isArray(bookingData.customAnswers)) {
      bookingData.customAnswers.forEach((ans, index) => {
        if (ans) {
          // ✅ FIX: If the answer is an Array (like checkboxes), add each option separately
          if (Array.isArray(ans)) {
            ans.forEach(option => params.append(`a${index + 1}`, option));
          } else {
            // If it's just a single string (Text or Radio), add it once
            params.append(`a${index + 1}`, ans);
          }
        }
      });
    }

    return `${bookingUrl}?${params.toString()}`;

  } catch (error) {
    console.error("Error in createBookingLink:", error.response?.data || error.message);
    throw error;
  }
};

// Export the functions as an object
module.exports = {
  checkAvailability,
  getBookingFields,
  createBookingLink
};