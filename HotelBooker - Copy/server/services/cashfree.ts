import fetch from 'node-fetch';
import base64 from 'base-64';

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  baseUrl: string;
}

interface CreateOrderRequest {
  amount: number; // in paise
  currency: string;
  receipt: string;
  payment_capture?: number; // 1 for auto capture
  notes?: Record<string, string>;
}

interface CreateOrderResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
}

export class RazorpayService {
  private config: RazorpayConfig;

  constructor() {
    this.config = {
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_uGpEIbyl9tXtTH",
      keySecret: process.env.RAZORPAY_KEY_SECRET || "Ui7CXnrutIKk0Ufrp9dM1NzH",
      baseUrl: "https://api.razorpay.com/v1",
    };
  }

  private getHeaders(): Record<string, string> {
    const credentials = base64.encode(`${this.config.keyId}:${this.config.keySecret}`);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    };
  }

  async createOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
    const response = await fetch(`${this.config.baseUrl}/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(orderData),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error("Razorpay error:", json);
      throw new Error(json.error?.description || 'Failed to create order');
    }

    return json;
  }

  async getOrderDetails(orderId: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error?.description || 'Failed to get order details');
    }

    return json;
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error?.description || 'Failed to get payment details');
    }

    return json;
  }

  async refundPayment(paymentId: string, amount: number): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ amount }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error?.description || 'Failed to process refund');
    }

    return json;
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return expectedSignature === signature;
  }
}
