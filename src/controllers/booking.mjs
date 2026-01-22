import * as calendlyService from '../services/calendly.mjs';
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

exports.createBooking = async (req, res) => {
    const { eventUri, date, time, participant } = req.body;

    try {
        console.log("🚀 Attempting actual server-side booking...");

        // Execute the direct run of Function 4
        const booking = await calendlyService.createActualBooking(eventUri, {
            date,
            time,
            name: participant.name,
            email: participant.email,
            timezone: 'Asia/Dhaka', // Set to your current location
            // Map the 9 research questions from Function 3
            answers: participant.answers 
        });

        // Technical Proof: API returns 201 Created and a URI
        res.status(201).json({
            message: "Actual Booking Successful!",
            bookingUri: booking.uri,
            status: "Scheduled"
        });

    } catch (error) {
        // Handle Plan Limitation (Free Plan returns 403)
        if (error.response?.status === 403) {
            console.warn("⚠️ Free Plan detected. Use the link workaround instead.");
            return res.status(403).json({
                error: "Actual Booking failed",
                details: "Direct API bookings require a paid Calendly plan."
            });
        }

        res.status(500).json({ error: error.message });
    }
};