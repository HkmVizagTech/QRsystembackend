const fs = require('fs');
const csv = require('csv-parser');
const { cleanPhoneNumber } = require('../utils/phoneSanitizer');
// const Recipient = require('../models/Recipient'); // Mongoose model (omitted mock since DB isn't wired yet)

/**
 * Standardizes categories to match predefined ENUMs (e.g., VIP, Donor, General)
 */
const normalizeCategory = (rawCategory) => {
    if (!rawCategory) return 'General';
    const cat = rawCategory.toLowerCase().trim();
    if (cat.includes('vip') || cat.includes('chief') || cat.includes('guest')) return 'VIP';
    if (cat.includes('donor') || cat.includes('patron') || cat.includes('sponsor')) return 'Donor';
    return 'General';
};

/**
 * Intelligent Auto-Tagging heuristic
 */
const determineTags = (name, category, rawRow) => {
    const tags = [];
    const n = (name || '').toLowerCase();
    
    if (n.includes('prabhu') || n.includes('mataji') || n.includes('das')) tags.push('Devotee');
    if (n.includes('dr') || n.includes('dr.')) tags.push('Doctor');
    if (category === 'VIP' && (n.includes('shri') || n.includes('sri'))) tags.push('High VIP');
    
    // Check for repeat donor logic from other columns
    if (rawRow && rawRow['Donation Amount'] && parseInt(rawRow['Donation Amount']) > 10000) {
        tags.push('High Donor');
    }
    
    return tags;
};

/**
 * Handles CSV Uploads, validation, deduplication, and parsing
 */
exports.uploadCSV = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded.' });
    }

    const results = [];
    const failed = [];
    // We'll use a Set to keep track of unique phones _within this upload_ to prevent immediate duplicates
    const uniquePhonesInUpload = new Set(); 

    // The stream processes row by row (efficient for large files)
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            const rawName = data['Name'] || data['name'] || data['Full Name'];
            const rawPhone = data['Phone'] || data['phone'] || data['Mobile'] || data['Contact'];
            const rawCategory = data['Category'] || data['category'] || data['Type'];

            if (!rawName || !rawPhone) {
                failed.push({ row: data, error: 'Missing Name or Phone' });
                return;
            }

            const cleanPhone = cleanPhoneNumber(rawPhone);
            if (!cleanPhone) {
                failed.push({ row: data, error: 'Invalid Phone Number Format' });
                return;
            }

            // Deduplication Check
            if (uniquePhonesInUpload.has(cleanPhone)) {
                failed.push({ row: data, error: 'Duplicate entry in CSV' });
                return;
            }
            uniquePhonesInUpload.add(cleanPhone);

            const category = normalizeCategory(rawCategory);
            const tags = determineTags(rawName, category, data);

            // Construct valid payload
            results.push({
                name: rawName.trim(),
                phone: cleanPhone,
                category: category,
                tags: tags,
                // rawData: data // optional audit trail
            });
        })
        .on('end', async () => {
            // Memory cleanup: Delete file from temp storage after parsing
            fs.unlinkSync(req.file.path);

            /**
             * MONGODB INTEGRATION (Future Step)
             * using bulkWrite for huge datasets to insert ignoring existing keys
             * 
             * const ops = results.map(r => ({
             *   updateOne: {
             *      filter: { phone: r.phone, eventId: req.body.eventId },
             *      update: { $setOnInsert: r },
             *      upsert: true
             *   }
             * }));
             * await Recipient.bulkWrite(ops);
             */

            return res.json({
                status: 'success',
                message: `Parsed ${results.length} valid entries. Found ${failed.length} failures.`,
                summary: {
                    totalValid: results.length,
                    totalFailed: failed.length,
                    failedLog: failed.slice(0, 10), // only send top 10 errors to client
                    sampleData: results.slice(0, 2) // preview sample for the Dashboard
                }
            });
        });
};
