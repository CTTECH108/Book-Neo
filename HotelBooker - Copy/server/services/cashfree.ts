import fetch from 'node-fetch';

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  baseUrl: string;
}

interface CreateOrderRequest {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  order_meta: {
    return_url: string;
    notify_url: string;
  };
}

interface CreateOrderResponse {
  payment_session_id: string;
  order_id: string;
  order_status: string;
}

export class CashfreeService {
  private config: CashfreeConfig;

  constructor() {
    this.config = {
      appId: process.env.CASHFREE_APP_ID || "9932874f93878c209926363eb3782399",
      secretKey: process.env.CASHFREE_SECRET_KEY || "cfsk_ma_prod_ecee2e35c6aee2ed204a5aa421aed9df_4aaad1e2",
      baseUrl: "https://api.cashfree.com/pg",
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': this.config.appId,
      'x-client-secret': this.config.secretKey,
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
      console.error("Cashfree error:", json);
      throw new Error(json.message || 'Failed to create order');
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
      throw new Error(json.message || 'Failed to get order details');
    }

    return json;
  }

  async getPaymentDetails(orderId: string, paymentId: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/orders/${orderId}/payments/${paymentId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || 'Failed to get payment details');
    }

    return json;
  }

  async refundPayment(orderId: string, refundAmount: number, refundId: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/orders/${orderId}/refunds`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        refund_amount: refundAmount,
        refund_id: refundId,
        refund_note: 'Refund initiated by system',
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || 'Failed to process refund');
    }

    return json;
  }

  verifyWebhookSignature(payload: any, headers: Record<string, string>): boolean {
    const signature = headers['x-webhook-signature'];
    const timestamp = headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      return false;
    }

    // In production, implement real HMAC verification using your webhook secret.
    return true;
  }
}
