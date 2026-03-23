const axios = require('axios');

/**
 * Flaxxa WAPI Integration Service
 * Mocks the API structure expected by Flaxxa for sending templated messages with media.
 */
class FlaxxaService {
    constructor() {
        this.apiKey = process.env.FLAXXA_API_KEY || '92349896869a99fd142d59';
        this.apiUrl = process.env.FLAXXA_API_URL || 'https://wapi.flaxxa.com';
    }

    /**
     * Sends a personalized message with a QR code image to a devotee.
     * @param {string} phone - Cleaned E.164 phone number
     * @param {string} name - Devotee's Name
     * @param {string} eventName - Name of the festival/event
     * @param {string} qrUrl - Publicly accessible URL of their generated QR code
     * @returns {Promise<Object>} API Response
     */
    async sendPrasadamQR(phone, name, eventName, qrUrl) {
        // Prepare the personalized template
        const messageText = `Hare Krishna ${name}! 🙏\n\nThank you for your seva. Please present this QR code to receive prasadam during the ${eventName}.\n\nYour unreserved token is below:`;

        // We clean the "+" sign for standard WAPI gateways which usually expect "919876543210" instead of "+919876543210"
        const cleanPhone = phone.replace('+', '');

        const payload = {
            apikey: this.apiKey,
            mobile: cleanPhone,
            msg: messageText,
            mediaurl: qrUrl, // Ensure this QR is hosted publicly
            // Add Temple ID / Instance ID here later when provided
        };

        try {
            // Un-commented the physical integration to hit the real endpoint
            console.log(`[FLAXXA] Dialing WAPI gateway for ${cleanPhone}...`);
            const response = await axios.post(`${this.apiUrl}/api/sendImage`, payload, {
               headers: { 'Content-Type': 'application/json' }
            });
            
            console.log(`[FLAXXA] Message Sent! ID:`, response.data);
            return response.data;

        } catch (error) {
            console.error(`[FLAXXA ERROR] Failed to send to ${phone}`, error?.response?.data || error.message);
            throw error; // Let BullMQ catch this and handle the retry logic
        }
    }
}

module.exports = new FlaxxaService();
