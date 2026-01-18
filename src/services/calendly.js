const getCalendlyClient = require('../config/client');

class CalendlyService {
  constructor() {
    this.client = getCalendlyClient(); // Function 1 usage
  }

  /**
   * [Function 2] Check Availability
   * Input: eventTypeUri, date (YYYY-MM-DD), time (HH:MM)
   * Output: Availability status (true/false) and list of all slots for that day (UTC)
   */
  async checkAvailability(eventTypeUri, date, time) {
    try {
      // 1. Define the search window (The full day in UTC)
      // We search from the start of the requested date to the start of the next day
      const startTime = new Date(date);
      startTime.setUTCHours(0, 0, 0, 0); // Start of day UTC
      
      const endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + 1); // End of day UTC

      // 2. Call Calendly API
      // Endpoint: GET /event_type_available_times
      const response = await this.client.get('/event_type_available_times', {
        params: {
          event_type: eventTypeUri,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        },
      });

      const availableSlots = response.data.collection;

      // 3. (Optional) Check for exact string match if a time was provided
      // Note: This matches strictly on the string returned by Calendly (usually UTC).
      let exactMatch = null;
      if (time) {
        // We look for the time string inside the full ISO string
        exactMatch = availableSlots.find(slot => slot.start_time.includes(time));
      }

      return {
        date_checked: date,
        total_slots: availableSlots.length,
        is_specific_time_available: !!exactMatch,
        // We return ALL slots so you can see exactly what Calendly offers (in UTC)
        available_slots: availableSlots 
      };

    } catch (error) {
      console.error("Error checking availability:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * [Function 3] Get Booking Fields
   * Matches video requirement: Name, Email, Guests, Checkbox, Radio, Dropdown, Multiline, Phone
   */
  async getBookingFields(eventTypeUri) {
    try {
      const uuid = eventTypeUri.split('/').pop();
      const response = await this.client.get(`/event_types/${uuid}`);
      const resource = response.data.resource;

      // --- 1. Standard Fields (Always required/available) ---
      const standardFields = [
        { 
          name: 'name', 
          type: 'name', 
          required: true, 
          label: 'Name',
          position: -3 
        },
        { 
          name: 'email', 
          type: 'email', 
          required: true, 
          label: 'Email',
          position: -2
        },
        // "Add Guests" Field (Standard Calendly feature)
        {
          name: 'guests',
          type: 'email_list', 
          required: false,    
          label: 'Add Guests',
          position: -1
        }
      ];

      // --- 2. Custom Fields (Mapping API types to your specific UI types) ---
      const customFields = resource.custom_questions.map((q, index) => {
        let uiType = q.type;

        // Map Calendly API types to your desired "UI Types"
        if (q.type === 'string')        uiType = 'text_single_line';
        if (q.type === 'text')          uiType = 'text_multiline';   
        if (q.type === 'multi_select')  uiType = 'checkbox';         
        if (q.type === 'phone_number')  uiType = 'phone';            

        // SPLIT LOGIC: Distinguish Dropdown vs Radio
        if (q.type === 'single_select') {
          // If there are 4 or fewer options, show as RADIO buttons (easier to click)
          // If there are 5 or more options, show as DROPDOWN (saves space)
          if (q.answer_choices.length <= 4) {
             uiType = 'radio';
          } else {
             uiType = 'dropdown';
          }
        }

        return {
          name: q.name,
          type: uiType,               // Now returns 'radio' or 'dropdown' correctly
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
  }

  /**
   * [Function 4] Create Booking Link
   * Handles Name, Email, Guests, Date, Time, and Custom Answers
   */
  async createBookingLink(eventTypeUri, bookingData) {
    try {
      // 1. Create a Single-Use Scheduling Link
      const linkResponse = await this.client.post('/scheduling_links', {
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
      
      // Optional "Guests" (comma separated emails)
      if (bookingData.guests) {
        params.append('guests', bookingData.guests);
      }

      // Pre-select date and time (if allowed by your Calendly plan)
      // format: &date=2026-01-23&time=09:30
      if (bookingData.date) params.append('date', bookingData.date); 
      if (bookingData.time) params.append('time', bookingData.time); 

      // Custom Answers (using 'customAnswers' array from input)
      // Expects data like: ["DropdownValue", "RadioValue", "TextValue"]
      if (bookingData.customAnswers && Array.isArray(bookingData.customAnswers)) {
        bookingData.customAnswers.forEach((ans, index) => {
          // Only append if there is an answer provided
          if(ans) {
             params.append(`a${index + 1}`, ans);
          }
        });
      }

      return `${bookingUrl}?${params.toString()}`;

    } catch (error) {
      console.error("Error in createBookingLink:", error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new CalendlyService();