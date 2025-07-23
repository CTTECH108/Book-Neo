import express from "express";
import { insertHotelSchema } from "./schemas/hotelSchema";
import { insertBookingSchema } from "./schemas/bookingSchema";
import { HotelService } from "./services/hotel";
import { BookingService } from "./services/booking";
import { EmailService } from "./services/email";
import { RazorpayService } from "./services/razorpay";

const router = express.Router();

const hotelService = new HotelService();
const bookingService = new BookingService();
const emailService = new EmailService();
const razorpayService = new RazorpayService();

/* -------------------- HOTEL ROUTES -------------------- */

// Get all hotels
router.get("/api/hotels", async (_req, res) => {
  const hotels = await hotelService.getAllHotels();
  res.json(hotels);
});

// Get hotel by ID
router.get("/api/hotels/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid hotel ID" });

  const hotel = await hotelService.getHotelById(id);
  if (!hotel) return res.status(404).json({ message: "Hotel not found" });

  res.json(hotel);
});

// Create new hotel
router.post("/api/hotels", async (req, res) => {
  const parsed = insertHotelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });

  const hotel = await hotelService.createHotel(parsed.data);
  res.status(201).json(hotel);
});

/* -------------------- BOOKING ROUTES -------------------- */

// Create booking
router.post("/api/bookings", async (req, res) => {
  const parsed = insertBookingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });

  const booking = await bookingService.createBooking(parsed.data);
  res.status(201).json(booking);
});

// Get all bookings
router.get("/api/bookings", async (_req, res) => {
  const bookings = await bookingService.getAllBookings();
  res.json(bookings);
});

// Get booking by ID
router.get("/api/bookings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid booking ID" });

  const booking = await bookingService.getBookingById(id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  res.json(booking);
});

/* -------------------- EMAIL ROUTE -------------------- */

// Send booking confirmation email
router.post("/api/bookings/:id/send-confirmation", async (req, res) => {
  const booking = await bookingService.getBookingById(parseInt(req.params.id));
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  try {
    await emailService.sendBookingConfirmation({
      guestEmail: booking.email,
      guestName: booking.guestName,
      hotelName: booking.hotelName,
      hotelAddress: booking.hotelAddress,
      checkInDate: new Date(booking.checkInDate).toISOString(),
      checkOutDate: new Date(booking.checkOutDate).toISOString(),
      totalAmount: booking.totalAmount,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

/* -------------------- QR CODE EMAIL -------------------- */

// Send QR code
router.post("/api/bookings/:id/qr", async (req, res) => {
  const booking = await bookingService.getBookingById(parseInt(req.params.id));
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  try {
    await emailService.sendQRCodeEmail({
      email: booking.email,
      guestName: booking.guestName,
      hotelName: booking.hotelName,
      hotelAddress: booking.hotelAddress,
      checkInDate: new Date(booking.checkInDate).toISOString(),
      checkOutDate: new Date(booking.checkOutDate).toISOString(),
      totalAmount: booking.totalAmount,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error sending QR code:", error);
    res.status(500).json({ success: false, message: "Failed to send QR code" });
  }
});

/* -------------------- RAZORPAY PAYMENT ROUTES -------------------- */

// Create Razorpay Order
router.post("/api/cashfree/create-order", async (req, res) => {
  try {
    const paymentSession = await razorpayService.createOrder(req.body);
    res.json(paymentSession);
  } catch (error: any) {
    console.error("❌ Razorpay create-order error:", error);
    res.status(500).json({ message: error.message || "Payment order creation failed" });
  }
});

// Webhook for order status (Razorpay equivalent)
router.post("/api/webhooks/cashfree", async (req, res) => {
  try {
    await razorpayService.handleWebhook(req.body);
    res.sendStatus(200);
  } catch (error: any) {
    console.error("❌ Razorpay webhook error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Verify Order
router.get("/api/cashfree/order/:orderId", async (req, res) => {
  try {
    const order = await razorpayService.getOrder(req.params.orderId);
    res.json(order);
  } catch (error: any) {
    console.error("❌ Razorpay get-order error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
