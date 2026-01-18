const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking');

// POST http://localhost:3000/api/booking/availability
router.post('/availability', bookingController.checkSlot);

// GET http://localhost:3000/api/booking/fields
router.get('/fields', bookingController.getFields);

// POST http://localhost:3000/api/booking/create
router.post('/create', bookingController.createBooking);

module.exports = router;