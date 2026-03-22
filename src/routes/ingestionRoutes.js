const express = require('express');
const multer = require('multer');
const { uploadCSV } = require('../controllers/ingestionController');

const router = express.Router();

// Define multer storage strategy (tmp dir to save memory until parsed)
const upload = multer({ dest: 'uploads/' });

// POST endpoint for CSV ingestion
router.post('/upload', upload.single('file'), uploadCSV);

module.exports = router;
