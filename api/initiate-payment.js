export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone_number, amount, loan_amount } = req.body;

    // Validate input
    if (!phone_number || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ============================================
    // SWIFTWALLET CONFIGURATION - DIRECT ENDPOINTS
    // ============================================
    const SWIFTWALLET_CONFIG = {
      apiUrl: 'https://swiftwallet.stkpush.co.ke/payments/api/stk-push/',
      platform: 'bdd8905fd40811b83bc1d6c626d7f587dad7fcc668b3cf215d16574734fea973', // ⚠️ CHANGE THIS: Your SwiftWallet platform ID
      account_id: '000358' // ⚠️ CHANGE THIS: Your SwiftWallet account ID
    };
    // ============================================

    // Generate a unique reference
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const payload = {
      amount: parseInt(amount),
      phone_number: phone_number,
      reference: `TYN-${timestamp}-${randomStr}`, // Unique transaction reference
      platform: SWIFTWALLET_CONFIG.platform,
      account_id: SWIFTWALLET_CONFIG.account_id
    };

    console.log('SwiftWallet STK Request:', payload);

    const response = await fetch(SWIFTWALLET_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SwiftWallet API Error:', response.status, errorText);
      throw new Error(`Payment initiation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('SwiftWallet STK Response:', result);

    // SwiftWallet returns checkout_request_id as payment reference
    const paymentReference = result?.checkout_request_id || result?.reference || result?.merchant_request_id;

    if (!paymentReference) {
      console.error('No payment reference found in response:', result);
      throw new Error('No payment reference received from SwiftWallet');
    }

    res.status(200).json({
      success: true,
      reference: paymentReference, // SwiftWallet payment reference
      external_reference: payload.reference, // Our internal reference
      response_data: result // Optional: include full response for debugging
    });

  } catch (error) {
    console.error('SwiftWallet initiation error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      success: false
    });
  }
}