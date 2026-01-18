const express = require('express');
const cors = require('cors');
const bookingRoutes = require('./routes/booking');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors()); // Allow requests from other domains
app.use(express.json()); // Parse incoming JSON data

// Routes
app.use('/api/booking', bookingRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});