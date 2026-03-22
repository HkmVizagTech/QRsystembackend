const { Worker } = require('bullmq');
const connection = require('../config/redis');
const flaxxaService = require('../services/flaxxaService');
const { QUEUE_NAME } = require('../queues/whatsappQueue');

// Throttle configuration to avoid WAPI ban flags or rate limits from WhatsApp natively
const RATE_LIMIT_JOBS = parseInt(process.env.WAPI_RATE_LIMIT_JOBS || 5);
const RATE_LIMIT_DURATION = parseInt(process.env.WAPI_RATE_LIMIT_DURATION || 1000); // Ms

// Initialize the Worker Node which processes messages asynchronously
const worker = new Worker(QUEUE_NAME, async (job) => {
    const { recipientId, phone, name, qrUrl, eventName } = job.data;
    
    // Simulate real database integration point:
    // 1. You could check if `Recipient.findById(recipientId)` hasn't explicitly un-registered / opted out.
    // 2. Otherwise send:
    await flaxxaService.sendPrasadamQR(phone, name, eventName, qrUrl);

    // 3. Mark the recipient `status` as "Sent".
    // await Recipient.findByIdAndUpdate(recipientId, { status: 'Sent' });

}, { 
    connection,
    // Concurrency means 5 messages are sent at a time
    concurrency: RATE_LIMIT_JOBS,
    
    // Rate limiter configuration is native to BullMQ Worker, automatically pauses until the token bucket replenishes
    limiter: {
        max: RATE_LIMIT_JOBS,
        duration: RATE_LIMIT_DURATION 
    }
});

worker.on('completed', (job) => {
  // Can be caught by a Socket or SSE architecture to live-update the "Sent" counter on the Dashboard
  // console.log(`[WORKER] Delivered msg for: ${job.data.phone}`);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER ERROR] Job ${job.id} failed delivery to ${job.data.phone}:`, err.message);
  // Mark the MongoDB document `status` as 'Failed'
});

// Handling termination smoothly for Cloud Run scale-down events
process.on('SIGTERM', async () => {
    console.log('[WORKER] Gracefully shutting down WAPI queue process...');
    await worker.close();
    process.exit(0);
});

module.exports = worker;
