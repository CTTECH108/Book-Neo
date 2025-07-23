import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { initiateRazorpayPayment, generateOrderId, loadRazorpayScript } from "@/lib/razorpay";
import type { Hotel } from "@shared/schema";

interface BookingForm {
  hotelId: number;
  roomType: string;
  guestName: string;
  guestContact: string;
  checkInDate: string;
  checkOutDate: string;
  specialRequests: string;
}

export default function Booking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [formData, setFormData] = useState<BookingForm>({
    hotelId: 0,
    roomType: "",
    guestName: "",
    guestContact: "",
    checkInDate: "",
    checkOutDate: "",
    specialRequests: "",
  });

  const { data: hotels, isLoading } = useQuery<Hotel[]>({
    queryKey: ["/api/hotels"],
  });

  useEffect(() => {
    loadRazorpayScript().catch(console.error);
  }, []);

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
      if (!response.ok) throw new Error("Failed to create booking");
      return response.json();
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setLocation(`/booking-success/${booking.bookingId}`);
    },
    onError: () => {
      setLocation("/booking-failure");
    },
  });

  const getRoomTypePrice = (baseRate: number, roomType: string): number => {
    let price = baseRate;
    switch (roomType) {
      case "suite":
        price += 1000;
        break;
      case "ac":
        price += 500;
        break;
      default:
        break;
    }
    return price;
  };

  const calculateTotal = (): number => {
    if (!selectedHotel || !formData.checkInDate || !formData.checkOutDate) return 0;
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;
    const roomPrice = getRoomTypePrice(selectedHotel.baseRate, selectedRoomType);
    return roomPrice * nights;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHotel || !selectedRoomType) {
      toast({
        title: "Error",
        description: "Please select a hotel and room type",
        variant: "destructive",
      });
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      toast({
        title: "Error",
        description: "Invalid dates selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderId = generateOrderId();

      const bookingData = {
        ...formData,
        hotelId: selectedHotel.id,
        roomType: selectedRoomType,
        totalAmount: total,
        razorpayOrderId: orderId,
      };

      const booking = await createBookingMutation.mutateAsync(bookingData);

      const paymentResult = await initiateRazorpayPayment({
        orderId,
        amount: total,
        customerName: formData.guestName,
        customerPhone: formData.guestContact,
        bookingId: booking.bookingId,
      });

      if (paymentResult.success) {
        setLocation(`/booking-success/${booking.bookingId}`);
      }

    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: "Failed to initiate payment",
        variant: "destructive",
      });
      setLocation("/booking-failure");
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-slate-900 px-6 py-8">
      <DarkModeToggle />

      <div className="max-w-md mx-auto">
        <div className="flex items-center mb-8 pt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/home')}
            className="mr-4"
          >
            <i className="fas fa-arrow-left"></i>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book Your Stay</h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Find the perfect room</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hotel Cards */}
          {/* Room Type Cards */}
          {/* Guest Input Fields */}
          {/* Booking Summary */}

          <Button
            type="submit"
            disabled={createBookingMutation.isPending || !selectedHotel || !selectedRoomType}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 animate-neon-pulse"
          >
            {createBookingMutation.isPending ? (
              <LoadingSpinner />
            ) : (
              <>
                <i className="fas fa-credit-card mr-2"></i>
                Pay ₹{calculateTotal()} via Razorpay
              </>
            )}
          </Button>
        </form>
      </div>
    </section>
  );
}
