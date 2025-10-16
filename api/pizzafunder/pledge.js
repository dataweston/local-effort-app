/**
 * POST /api/pizzafunder/pledge
 * Processes pizza pledge with Square payment and saves to Supabase
 * 
 * ⚠️ IMPORTANT - DO NOT REVERT TO FIREBASE
 * This endpoint uses SUPABASE PostgreSQL (migrated Oct 15, 2025)
 * See: docs/DO-NOT-REVERT-TO-FIREBASE.md
 * Database: public.crowdfund_pledges table (with auto-aggregate trigger)
 * DO NOT change to Firebase without explicit user request
 */

const { Client: SquareClient, Environment } = require('square');
const { getSupabase } = require('../../backend/api/supabaseClient');
const { addPizzaBackerToBrevo } = require('../_lib/brevo');
const { sendPizzafunderReceipts } = require('./_lib/sendReceipt');

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
      totalCents, // Alternative name from frontend
      discountCode,
      baseTotalCents,
    } = req.body;

    // Accept either amountCents or totalCents from frontend
    const requestedAmount = totalCents || amountCents;

    // Validation
    if (!sourceId || !funderName || !email || !pizzaCount) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceId, funderName, email, pizzaCount' 
      });
    }

    // Validate discount code
    const validDiscountCode = 'since2022';
    const isDiscountValid = discountCode && discountCode.toLowerCase().trim() === validDiscountCode;
    
    // Calculate final amount (handle 100% discount)
    const finalAmountCents = isDiscountValid ? 0 : (requestedAmount || 0);

    if (pizzaCount < 1 || (finalAmountCents < 0)) {
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

    let payment = null;
    let paymentId = null;

    // Only process payment through Square if amount > 0
    // For 100% discount, skip Square payment but still record pledge
    if (finalAmountCents > 0) {
      const paymentResponse = await squareClient.paymentsApi.createPayment({
        sourceId,
        amountMoney: {
          amount: BigInt(finalAmountCents),
          currency: 'USD',
        },
        idempotencyKey: `pledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        locationId: process.env.SQUARE_LOCATION_ID,
        referenceId: `PIZZAFUNDER_${Date.now()}`,
        note: `Pizza Pledge - ${pizzaCount} pizza${pizzaCount > 1 ? 's' : ''} from ${funderName}${isDiscountValid ? ` (Discount: ${discountCode})` : ''}`,
        buyerEmailAddress: email,
      });

      payment = paymentResponse.result.payment;
      paymentId = payment.id;

      if (!payment || payment.status !== 'COMPLETED') {
        return res.status(400).json({ 
          error: 'Payment failed',
          details: payment?.status || 'Unknown status'
        });
      }
    } else {
      // For $0 (100% discount), generate a reference ID without Square payment
      paymentId = `DISCOUNT_${discountCode.toUpperCase()}_${Date.now()}`;
    }

    // Save pledge to Supabase
    const pledgeBaseAmount = baseTotalCents || requestedAmount || 0;
    const pledgeDiscountAmount = isDiscountValid ? pledgeBaseAmount : 0;
    
    const { data: pledgeData, error: pledgeError } = await supabase
      .from('crowdfund_pledges')
      .insert({
        funder_name: funderName.trim().substring(0, 200),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim().substring(0, 50) : null,
        notes: notes ? notes.trim().substring(0, 1000) : null,
        reward_preference: rewardPreference || null,
        pizza_count: pizzaCount,
        amount_cents: finalAmountCents,
        payment_id: paymentId,
        status: 'completed',
        discount_code: isDiscountValid ? discountCode.trim() : null,
        discount_amount_cents: pledgeDiscountAmount,
      })
      .select()
      .single();

    if (pledgeError) {
      // Payment succeeded but DB failed - log for manual reconciliation
      console.error('[pizzafunder.pledge] CRITICAL - Payment succeeded but DB failed:', {
        paymentId: paymentId,
        error: pledgeError.message,
        funderName,
        email,
        pizzaCount,
        amountCents: finalAmountCents,
        discountCode: isDiscountValid ? discountCode : null,
      });

      return res.status(201).json({
        success: true,
        warning: 'Payment succeeded but record may not be saved',
        payment: {
          id: paymentId,
          status: payment?.status || 'completed',
          amount: finalAmountCents,
          discountApplied: isDiscountValid,
        },
      });
    }

    // Add to Brevo email list (async, don't block response)
    // This runs in background - failures won't affect pledge success
    addPizzaBackerToBrevo(pledgeData).catch((brevoError) => {
      console.error('[pizzafunder.pledge] Brevo sync failed (non-critical):', {
        error: brevoError.message,
        email: pledgeData.email,
        pledgeId: pledgeData.id,
      });
    });

    // Send transactional emails to customer and admin (async, don't block response)
    // This runs in background - failures won't affect pledge success
    sendPizzafunderReceipts({
      funderName,
      email,
      phone,
      pizzaCount,
      totalCents: finalAmountCents,
      rewardPreference,
      notes,
      discountCode: isDiscountValid ? discountCode : null,
      discountLabel: isDiscountValid && pledgeDiscountAmount > 0 ? `100% off (${discountCode})` : null,
      paymentId,
      isComplimentary: finalAmountCents === 0,
      pledgeId: pledgeData.id,
      timestamp: pledgeData.created_at,
    }).catch((emailError) => {
      console.error('[pizzafunder.pledge] Email send failed (non-critical):', {
        error: emailError.message,
        email: pledgeData.email,
        pledgeId: pledgeData.id,
      });
    });

    // Success response
    return res.status(201).json({
      success: true,
      payment: {
        id: paymentId,
        status: payment?.status || 'completed',
        amount: finalAmountCents,
        discountApplied: isDiscountValid,
        discountCode: isDiscountValid ? discountCode : null,
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
