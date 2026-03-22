const libphonenumber = require('google-libphonenumber');
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

/**
 * Normalizes a phone number to standard E.164 (International) format.
 * Defaults to IN (India) if no country code is found.
 */
exports.cleanPhoneNumber = (rawNumber, defaultRegion = 'IN') => {
    if (!rawNumber) return null;
    
    // Remove all non-numeric characters except '+'
    let cleaned = rawNumber.toString().replace(/[^\d+]/g, '');
    
    // If it starts with '0', assume it's a local number and remove the 0
    if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
        cleaned = cleaned.substring(1);
    }
    
    try {
        const number = phoneUtil.parseAndKeepRawInput(cleaned, defaultRegion);
        if (phoneUtil.isValidNumber(number)) {
            return phoneUtil.format(number, libphonenumber.PhoneNumberFormat.E164);
        }
    } catch (e) {
        // Fallback: If parsing fails, just prepend the India code if it's 10 digits
        if (cleaned.length === 10) return `+91${cleaned}`;
    }
    
    return null; // Invalid number
};
