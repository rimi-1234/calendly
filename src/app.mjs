import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRoutes from './routes/booking.mjs';

// 1. Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Global Middleware
app.use(cors());
app.use(express.json()); // Essential for parsing JSON booking data

// 3. Routes
app.use('/api/bookings', bookingRoutes);

// 4. Health Check
app.get('/', (req, res) => {
  res.send('🚀 MessageMind Server is running...');
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

export default app;