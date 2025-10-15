/**
 * POST /api/pizzafunder/pledge
 * Processes pizza pledge with Square payment and saves to Supabase
 * Replaces Firebase Firestore with Supabase Postgres
 */

const { Client: SquareClient, Environment } = require('square');
const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({ error: 'Database temporarily unavailable' });
  }

  try {
    const {
      sourceId,
      funderName,
      email,
      phone,
      notes,
      rewardPreference,
      pizzaCount,
      amountCents,
    } = req.body;

    // Validation
    if (!sourceId || !funderName || !email || !pizzaCount || !amountCents) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceId, funderName, email, pizzaCount, amountCents' 
      });
    }

    if (pizzaCount < 1 || amountCents < 100) {
      return res.status(400).json({ 
        error: 'Invalid pledge amount' 
      });
    }

    // Initialize Square client
    const squareClient = new SquareClient({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' 
        ? Environment.Production 
        : Environment.Sandbox,
    });

    // Create payment with Square
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
      idempotencyKey: `pledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      locationId: process.env.SQUARE_LOCATION_ID,
      referenceId: `PIZZAFUNDER_${Date.now()}`,
      note: `Pizza Pledge - ${pizzaCount} pizza${pizzaCount > 1 ? 's' : ''} from ${funderName}`,
      buyerEmailAddress: email,
    });

    const payment = paymentResponse.result.payment;

    if (!payment || payment.status !== 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Payment failed',
        details: payment?.status || 'Unknown status'
      });
    }

    // Save pledge to Supabase
    const { data: pledgeData, error: pledgeError } = await supabase
      .from('crowdfund_pledges')
      .insert({
        funder_name: funderName.trim().substring(0, 200),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim().substring(0, 50) : null,
        notes: notes ? notes.trim().substring(0, 1000) : null,
        reward_preference: rewardPreference || null,
        pizza_count: pizzaCount,
        amount_cents: amountCents,
        payment_id: payment.id,
        status: 'completed',
      })
      .select()
      .single();

    if (pledgeError) {
      // Payment succeeded but DB failed - log for manual reconciliation
      console.error('[pizzafunder.pledge] CRITICAL - Payment succeeded but DB failed:', {
        paymentId: payment.id,
        error: pledgeError.message,
        funderName,
        email,
        pizzaCount,
        amountCents,
      });

      return res.status(201).json({
        success: true,
        warning: 'Payment succeeded but record may not be saved',
        payment: {
          id: payment.id,
          status: payment.status,
          amount: amountCents,
        },
      });
    }

    // Success response
    return res.status(201).json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: amountCents,
      },
      pledge: {
        id: pledgeData.id,
        pizzaCount,
        timestamp: pledgeData.created_at,
      },
    });
  } catch (error) {
    console.error('[pizzafunder.pledge] Error:', error.message);
    
    // Distinguish between Square errors and other errors
    if (error.errors && error.statusCode) {
      return res.status(error.statusCode || 400).json({
        error: 'Payment processing failed',
        details: error.errors,
      });
    }

    return res.status(500).json({
      error: 'Failed to process pledge',
      details: error.message,
    });
  }
};
