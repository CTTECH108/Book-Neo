// src/pages/booking-success.tsx
import { useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

export default function BookingSuccess() {
  const [match, params] = useRoute("/booking-success/:orderId");
  const orderId = params?.orderId;

  useEffect(() => {
    if (orderId) {
      console.log("Booking Success for order:", orderId);
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-green-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <DarkModeToggle />
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-check text-3xl text-white"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Payment Successful</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your booking was successful! Confirmation for order <strong>{orderId}</strong> has been sent to your email.
        </p>
        <Button onClick={() => (window.location.href = "/home")} className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white">
          <i className="fas fa-home mr-2"></i>Back to Home
        </Button>
      </div>
    </div>
  );
}
