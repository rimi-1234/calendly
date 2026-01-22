import axios from 'axios';

export async function initializeGhlApi(integration, eventName) {
  try {
    // 1. Validation of the integration document
    if (!integration) {
      throw new Error('❌ No enabled GHL integration found for user');
    }

    // 2. Extract API Key dynamically or provide as a quoted string
    // FIX: Wrap the token in quotes to avoid "not defined" error
    const apiKey = integration?.keys?.accessToken ;
    console.log(apiKey);
    
    
    if (!apiKey) {
      throw new Error('❌ API key not found in integration keys');
    }

    // 3. Find the matching calendar/event
    const calendars = integration?.keys?.calendars || integration?.keys?.events;
    let calendarId = null;
    let calendarFields = null;

    if (calendars && Array.isArray(calendars)) {
      const matchingCalendar = calendars.find(calendar => 
        (calendar.calendarName || calendar.eventName)?.toLowerCase() === eventName.toLowerCase()
      );

      if (matchingCalendar) {
        calendarId = matchingCalendar.calendarId || matchingCalendar.eventUri;
        calendarFields = matchingCalendar.calendarFields || matchingCalendar.customFields;
      }
    }
    console.log( calendarId);
      console.log( calendarId);
    

    // 4. Create the pre-configured Axios client
    // FIX: Use 'apiKey' variable in the Authorization header
    const baseURL = 'https://api.calendly.com';
    const client1 = axios.create({
      baseURL: baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(client1);
    

    return { apiKey, calendarId, calendarFields, baseURL, client1 };

  } catch (err) {
    console.error('❌ Error initializing API:', err.message);
    throw err;
  }
}