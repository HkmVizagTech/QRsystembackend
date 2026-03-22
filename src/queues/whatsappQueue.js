const { Queue } = require('bullmq');
const connection = require('../config/redis');

// Centralize the WAPI message queue name
const QUEUE_NAME = 'whatsapp-messages';

const waQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3, // Smart retry
    backoff: {
      type: 'exponential', // Exponential backoff for rate limits or api disconnections
      delay: 5000 // Start with 5 seconds
    },
    removeOnComplete: true, // Auto clean the queue UI upon sending
    removeOnFail: false // Keep failed jobs so the admin can retry "Failed" statuses manually
  }
});

/**
 * Intelligent Batching function
 * Receives the valid list from ingestion and batches them into Redis.
 * This is incredibly performant compared to looping `queue.add()` sequentially.
 */
const enqueueMessagesBulk = async (recipients, eventName) => {
    try {
        const jobs = recipients.map(r => ({
            name: 'send-qr',
            data: { 
                recipientId: r._id, // Assume Mongoose _id
                phone: r.phone, 
                name: r.name, 
                qrUrl: r.qrImageUrl || 'https://assets.prasadam.example.com/placeholder-qr.png',
                eventName: eventName 
            }
        }));

        const result = await waQueue.addBulk(jobs);
        console.log(`[QUEUE] Safely enqueued ${result.length} WhatsApp messages.`);
        return result;
    } catch (e) {
        console.error('[QUEUE] Failed to bulk queue items', e);
        throw e;
    }
};

/**
 * Interface actions for the Admin Dashboard (Pause / Resume / Clean)
 */
const pauseQueue = async () => await waQueue.pause();
const resumeQueue = async () => await waQueue.resume();

module.exports = {
  waQueue,
  QUEUE_NAME,
  enqueueMessagesBulk,
  pauseQueue,
  resumeQueue
};
