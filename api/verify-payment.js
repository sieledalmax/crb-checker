export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    // ============================================
    // SWIFTWALLET CONFIGURATION - DIRECT ENDPOINTS
    // ============================================
    const SWIFTWALLET_CONFIG = {
      verifyUrl: 'https://swiftwallet.stkpush.co.ke/payments/api/verify-payment/'
    };
    // ============================================

    console.log('Verifying SwiftWallet payment with reference:', reference);

    const response = await fetch(
      `${SWIFTWALLET_CONFIG.verifyUrl}${encodeURIComponent(reference)}/`, 
      {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SwiftWallet verification API error:', response.status, errorText);
      throw new Error(`Payment verification failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('SwiftWallet verification response:', result);

    // SwiftWallet status checking - adapt to their response format
    const status = (result?.status || result?.data?.status || '').toString().toLowerCase();
    const isSuccess = ['completed', 'confirmed', 'success'].includes(status);

    res.status(200).json({
      success: true,
      status: isSuccess ? 'COMPLETED' : 'PENDING',
      data: result
    });

  } catch (error) {
    console.error('SwiftWallet verification error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      success: false
    });
  }
}