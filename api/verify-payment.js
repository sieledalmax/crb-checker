// Update verify-payment.js with better response handling
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
      
      // Return a more specific error
      if (response.status === 404) {
        return res.status(200).json({
          success: true,
          status: 'PENDING',
          message: 'Payment still processing',
          data: null
        });
      }
      
      // For other errors, we'll continue checking
      return res.status(200).json({
        success: true,
        status: 'PENDING',
        message: 'Payment verification in progress',
        data: null
      });
    }

    const result = await response.json();
    console.log('SwiftWallet verification response:', JSON.stringify(result, null, 2));

    // Enhanced SwiftWallet status checking
    let status = '';
    
    // Check different possible response formats
    if (result?.status) {
      status = result.status;
    } else if (result?.data?.status) {
      status = result.data.status;
    } else if (result?.ResultCode === '0') {
      status = 'COMPLETED';
    } else if (result?.ResultCode) {
      status = 'FAILED';
    }
    
    // Normalize status to lowercase for consistent checking
    const normalizedStatus = status.toString().toLowerCase();
    
    console.log('Normalized status:', normalizedStatus);
    
    // Determine if payment is successful
    const isSuccess = ['completed', 'confirmed', 'success', 'successful', 'paid'].includes(normalizedStatus);
    const isFailed = ['failed', 'cancelled', 'rejected', 'declined', 'error'].includes(normalizedStatus);
    
    // Return appropriate status
    if (isSuccess) {
      return res.status(200).json({
        success: true,
        status: 'COMPLETED',
        data: result,
        message: 'Payment successful'
      });
    } else if (isFailed) {
      return res.status(200).json({
        success: true,
        status: 'FAILED',
        data: result,
        message: 'Payment failed'
      });
    } else {
      // Still pending or unknown status
      return res.status(200).json({
        success: true,
        status: 'PENDING',
        data: result,
        message: 'Payment still processing'
      });
    }

  } catch (error) {
    console.error('SwiftWallet verification error:', error);
    
    // Don't fail on errors, just return pending status
    res.status(200).json({ 
      success: true,
      status: 'PENDING',
      message: 'Verification in progress',
      error: error.message
    });
  }
}