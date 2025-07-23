declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayPayment {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  bookingId?: string;
}

export const RAZORPAY_CONFIG = {
  keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_uGpEIbyl9tXtTH",
  currency: "INR",
};

let sdkLoading = false;
let sdkLoaded = false;

export async function loadRazorpayScript(): Promise<void> {
  if (sdkLoaded) return;

  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      sdkLoaded = true;
      console.log("✅ Razorpay SDK already loaded");
      resolve();
      return;
    }

    if (sdkLoading) {
      const interval = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(interval);
          sdkLoaded = true;
          resolve();
        }
      }, 100);
      return;
    }

    sdkLoading = true;
    const existingScript = document.querySelector("script[src*='checkout.razorpay.com']");
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      sdkLoaded = true;
      console.log("✅ Razorpay SDK loaded");
      resolve();
    };

    script.onerror = () => {
      reject(new Error("❌ Failed to load Razorpay SDK"));
    };

    document.head.appendChild(script);
  });
}

export async function initiateRazorpayPayment(
  paymentData: RazorpayPayment
): Promise<{ success: boolean; orderId: string }> {
  await loadRazorpayScript();

  const orderPayload = {
    orderId: paymentData.orderId,
    amount: paymentData.amount,
    currency: RAZORPAY_CONFIG.currency,
    receipt: paymentData.orderId,
  };

  const orderRes = await fetch("/api/razorpay/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
  });

  if (!orderRes.ok) {
    const error = await orderRes.json();
    throw new Error(error.message || "Failed to create Razorpay order");
  }

  const { id: razorpayOrderId } = await orderRes.json();

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: RAZORPAY_CONFIG.keyId,
      amount: paymentData.amount * 100,
      currency: RAZORPAY_CONFIG.currency,
      name: "BookNeo",
      description: "Booking Payment",
      image: "/logo.png",
      order_id: razorpayOrderId,
      handler: async function (response: any) {
        console.log("✅ Payment success:", response);
        resolve({ success: true, orderId: razorpayOrderId });
      },
      prefill: {
        name: paymentData.customerName,
        email:
          paymentData.customerEmail ||
          `${paymentData.customerPhone.replace(/\D/g, "")}@bookneoapp.com`,
        contact: paymentData.customerPhone,
      },
      notes: {
        bookingId: paymentData.bookingId || "",
      },
      theme: {
        color: "#0f172a",
      },
    });

    razorpay.on("payment.failed", function (response: any) {
      console.error("❌ Razorpay Payment Failed:", response);
      reject(new Error(response.error.description || "Payment Failed"));
    });

    razorpay.open();
  });
}

export async function verifyPayment(orderId: string): Promise<any> {
  try {
    const res = await fetch(`/api/razorpay/order/${orderId}`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error("Failed to verify Razorpay order");
    }

    return await res.json();
  } catch (error) {
    console.error("❌ Razorpay verification error:", error);
    throw error;
  }
}

export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORDER_${timestamp}_${random}`;
}
