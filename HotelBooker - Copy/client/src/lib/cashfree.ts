declare global {
  interface Window {
    Cashfree: any;
  }
}

export interface CashfreePayment {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  bookingId?: string;
}

export const CASHFREE_CONFIG = {
  appId: import.meta.env.VITE_CASHFREE_APP_ID,
  secretKey: import.meta.env.VITE_CASHFREE_SECRET_KEY,
  environment: "PRODUCTION", // Change to "SANDBOX" for testing
};

// ✅ Load SDK dynamically before every payment attempt
export async function loadCashfreeSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree?.init) {
      console.log("✅ Cashfree SDK already loaded");
      resolve();
      return;
    }

    // Remove previously broken/partial script (if any)
    const existingScript = document.querySelector("script[src*='cashfree.prod.js']");
    if (existingScript) {
      console.warn("⚠️ Removing existing Cashfree SDK script and reloading...");
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js"; // Production SDK
    script.async = true;

    script.onload = () => {
      // Wait briefly to ensure window.Cashfree.init is registered
      setTimeout(() => {
        if (typeof window.Cashfree?.init === "function") {
          console.log("✅ Cashfree SDK loaded and init() available");
          resolve();
        } else {
          console.error("❌ SDK loaded but init() is not a function");
          reject(new Error("Cashfree SDK loaded but init() is not a function"));
        }
      }, 100);
    };

    script.onerror = () => {
      reject(new Error("❌ Failed to load Cashfree SDK"));
    };

    document.head.appendChild(script);
  });
}

export async function initiateCashfreePayment(
  paymentData: CashfreePayment
): Promise<{ success: boolean; orderId: string }> {
  try {
    await loadCashfreeSDK();

    if (!window.Cashfree?.init) {
      throw new Error("Cashfree SDK not initialized properly");
    }

    const orderData = {
      order_id: paymentData.orderId,
      order_amount: paymentData.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: paymentData.customerPhone,
        customer_name: paymentData.customerName,
        customer_email:
          paymentData.customerEmail ||
          `${paymentData.customerPhone.replace(/\D/g, "")}@bookneoapp.com`,
        customer_phone: paymentData.customerPhone,
      },
      order_meta: {
        return_url: `${window.location.origin}/booking-success/${
          paymentData.bookingId || paymentData.orderId
        }`,
        notify_url: `${window.location.origin}/api/webhooks/cashfree`,
      },
    };

    console.log("📦 Creating Cashfree order:", orderData);

    const response = await fetch("/api/cashfree/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create payment order");
    }

    const { payment_session_id } = await response.json();

    if (!payment_session_id) {
      throw new Error("Invalid payment session ID received from server");
    }

    const cashfree = window.Cashfree.init({
      mode: CASHFREE_CONFIG.environment,
    });

    console.log("💳 Launching Cashfree checkout with session:", payment_session_id);

    return new Promise((resolve, reject) => {
      cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: "_modal",
        onSuccess: (data: any) => {
          console.log("✅ Payment successful:", data);
          resolve({ success: true, orderId: paymentData.orderId });
        },
        onFailure: (error: any) => {
          console.error("❌ Payment failed:", error);
          reject(new Error(error.message || "Payment failed"));
        },
        onCancel: () => {
          console.warn("⚠️ Payment cancelled by user");
          reject(new Error("Payment cancelled by user"));
        },
      });
    });
  } catch (error) {
    console.error("❌ Cashfree payment error:", error);
    throw error;
  }
}

export async function verifyPayment(orderId: string): Promise<any> {
  try {
    const response = await fetch(`/api/cashfree/order/${orderId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to verify payment");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Payment verification error:", error);
    throw error;
  }
}

export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORDER_${timestamp}_${random}`;
}
