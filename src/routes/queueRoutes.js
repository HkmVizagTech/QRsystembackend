const express = require('express');
const { waQueue, enqueueMessagesBulk } = require('../queues/whatsappQueue');

const router = express.Router();

/**
 * Endpoint to Launch the Campaign via WAPI Queue
 * Usually called right after the CSV ingestion finishes and admins verify the Dataset.
 */
router.post('/launch', async (req, res) => {
    try {
        const { eventName, recipientsList } = req.body;
        // Assume recipientsList is passed in from the UI after confirming the validated upload payload
        if (!recipientsList || recipientsList.length === 0) {
            return res.status(400).json({ error: 'No recipients provided to launch.' });
        }
        
        // This instantly pushes 1000s of rows to Redis via the highly optimized Bulk Add feature
        await enqueueMessagesBulk(recipientsList, eventName || 'Upcoming Festival');
        
        return res.json({ status: 'success', message: `Queued ${recipientsList.length} messages smoothly.` });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to launch background queue.' });
    }
});

/**
 * Returns Queue metrics (Pending, Processing, Failed, Successes)
 * Polled by the UI Dashboard
 */
router.get('/metrics', async (req, res) => {
    try {
        const waiting = await waQueue.getWaitingCount();
        const active = await waQueue.getActiveCount();
        const delayed = await waQueue.getDelayedCount();
        const failed = await waQueue.getFailedCount();
        const completed = await waQueue.getCompletedCount();

        return res.json({
            status: 'operational',
            queueSize: waiting + delayed,
            active,
            failed,
            completed
        });
    } catch (e) {
        return res.status(500).json({ error: 'Telemetry unreachable' });
    }
});

module.exports = router;
