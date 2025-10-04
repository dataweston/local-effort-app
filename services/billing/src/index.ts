import { Client, PaymentsApi, InvoicesApi } from 'square';
import pino from 'pino';

const logger = pino({ name: 'billing-service' });

export interface PaymentRequest {
  amount: number;
  currency: string;
  customerId: string;
  sourceId: string;
  idempotencyKey: string;
}

export interface InvoiceRequest {
  orgId: string;
  period: 'WEEK' | 'MONTH';
  lineItems: Array<{ name: string; quantity: number; amount: number }>;
}

export class BillingService {
  private readonly payments: PaymentsApi;
  private readonly invoices: InvoicesApi;

  constructor(client?: Client) {
    const squareClient =
      client ??
      new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      });
    this.payments = squareClient.paymentsApi;
    this.invoices = squareClient.invoicesApi;
  }

  async createPayment(request: PaymentRequest) {
    logger.info({ request }, 'creating Square payment (stub)');
    return {
      id: `payment_${Date.now()}`,
      status: 'APPROVED',
      amount: request.amount,
      currency: request.currency
    };
  }

  async createInvoice(request: InvoiceRequest) {
    logger.info({ request }, 'creating Square invoice (stub)');
    return {
      id: `invoice_${Date.now()}`,
      status: 'DRAFT',
      totalAmount: request.lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0)
    };
  }
}
