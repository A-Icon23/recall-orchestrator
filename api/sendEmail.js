const sgMail = require('@sendgrid/mail');

// Configure SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.SENDER_EMAIL || 'test@example.com';
const BCC_EMAIL = process.env.SENDGRID_BCC_EMAIL || '';
const MOCK_EMAIL = process.env.MOCK_EMAIL === 'true';

if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
} else {
    console.warn('SENDGRID_API_KEY is not set. Email sending will run in mock mode.');
}

/**
 * API handler for sending email via SendGrid.
 * Expects JSON body with { to, subject, html }.
 */
module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    // Validate request body
    if (!req.body) {
        return res.status(400).json({ ok: false, error: 'Request body missing' });
    }
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: to, subject, html' });
    }

    const msg = {
        to,
        from: FROM_EMAIL,
        subject,
        html,
    };
    if (BCC_EMAIL) {
        msg.bcc = BCC_EMAIL;
    }

    // If mock mode or missing API key, skip real send
    if (MOCK_EMAIL || !SENDGRID_API_KEY) {
        console.log('Mock email mode: would send email to', to);
        return res.status(200).json({ ok: true, note: 'Mock email sent (no real email dispatched)' });
    }

    try {
        await sgMail.send(msg);
        console.log('Email sent successfully to:', to);
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('SendGrid Error:', error);
        if (error.response && error.response.body) {
            console.error('SendGrid response body:', error.response.body);
        }
        return res.status(500).json({ ok: false, error: 'Failed to send email', details: error.message });
    }
};
