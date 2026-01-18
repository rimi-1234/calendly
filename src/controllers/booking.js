const calendlyService = require('../services/calendly');
const EVENT_URI = process.env.CALENDLY_EVENT_URI;

// Handle /availability (Function 2)
exports.checkSlot = async (req, res) => {
  try {
    const { date, time } = req.body;
    if (!date || !time) return res.status(400).json({ error: "Date and Time required" });

    const result = await calendlyService.checkAvailability(EVENT_URI, date, time);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Handle /fields (Function 3)
exports.getFields = async (req, res) => {
  try {
    const result = await calendlyService.getBookingFields(EVENT_URI);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Handle /create (Function 4)
exports.createBooking = async (req, res) => {
  try {
    // Expects: { name, email, date, customAnswers: [...] }
    const bookingData = req.body;
    
    const link = await calendlyService.createBookingLink(EVENT_URI, bookingData);
    
    res.json({ 
      success: true, 
      action_url: link,
      message: "Please redirect user to this URL to complete booking."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};