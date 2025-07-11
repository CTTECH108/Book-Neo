// src/lib/cashfree.ts
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
  appId: import.meta.env.VITE_CASHFREE_APP_ID || "9932874f93878c209926363eb3782399",
  environment: "PRODUCTION", // SANDBOX or PRODUCTION
};

export async function loadCashfreeSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree?.init) return resolve();

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js";
    script.async = true;
    script.onload = () => {
      if (window.Cashfree?.init) resolve();
      else reject(new Error("Cashfree SDK failed to initialize"));
    };
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.head.appendChild(script);
  });
}

export async function initiateCashfreePayment(paymentData: CashfreePayment): Promise<{ success: boolean; orderId: string }> {
  await loadCashfreeSDK();

  const response = await fetch("/api/cashfree/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: paymentData.orderId,
      order_amount: paymentData.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: paymentData.customerPhone,
        customer_name: paymentData.customerName,
        customer_email: paymentData.customerEmail || `${paymentData.customerPhone}@bookneoapp.com`,
        customer_phone: paymentData.customerPhone,
      },
      order_meta: {
        return_url: `${window.location.origin}/booking-success/${paymentData.bookingId || paymentData.orderId}`,
        notify_url: `${window.location.origin}/api/webhooks/cashfree`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create order");
  }

  const { payment_session_id } = await response.json();
  const cashfree = window.Cashfree.init({ mode: CASHFREE_CONFIG.environment });

  return new Promise((resolve, reject) => {
    cashfree.checkout({
      paymentSessionId: payment_session_id,
      redirectTarget: "_modal",
      onSuccess: () => resolve({ success: true, orderId: paymentData.orderId }),
      onFailure: (error: any) => reject(new Error(error.message || "Payment failed")),
      onCancel: () => reject(new Error("Payment cancelled")),
    });
  });
}
