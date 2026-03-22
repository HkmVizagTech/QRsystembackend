const axios = require('axios');

/**
 * Flaxxa WAPI Integration Service
 * Mocks the API structure expected by Flaxxa for sending templated messages with media.
 */
class FlaxxaService {
    constructor() {
        this.apiKey = process.env.FLAXXA_API_KEY || 'MOCK_KEY_FOR_DEV';
        this.apiUrl = process.env.FLAXXA_API_URL || 'https://api.flaxxa.com/v1/messages';
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

        const payload = {
            apikey: this.apiKey,
            mobile: phone,
            msg: messageText,
            mediaurl: qrUrl, // Assuming Flaxxa accepts 'mediaurl' for image attachments
            type: 'image'
        };

        try {
            // In a real environment, uncomment the axios post.
            // const response = await axios.post(`${this.apiUrl}/send-media`, payload);
            
            // For safety in this test environment, we mock successful API responses:
            // return response.data;
            
            console.log(`[FLAXXA MOCK] Sending WhatsApp to ${phone}...`);
            return { status: 'success', message_id: `msg_${Math.floor(Math.random() * 1000000)}` };

        } catch (error) {
            console.error(`[FLAXXA MOCK] Failed to send to ${phone}`, error?.response?.data || error.message);
            throw error; // Let BullMQ catch this and handle the retry logic
        }
    }
}

module.exports = new FlaxxaService();
