require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const cors = require('cors');
const app = express();

// CORS setup to allow all origins
const corsOptions = {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'], // Allow specific methods
    allowedHeaders: ['Content-Type'], // Allow specific headers
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions)); // Apply CORS middleware with options

// MongoDB connection with mongoose
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true, 
    useUnifiedTopology: true
})
  .then(() => {
    console.log("Connected to MongoDB Atlas successfully.");
  })
  .catch(err => {
    console.error("Error connecting to MongoDB Atlas:", err);
  });

// Schema and Model
const urlSchema = new mongoose.Schema({
    originalUrl: String,
    shortUrl: String,
    clicks: {
        type: Number,
        default: 0
    },
    clickData: {
        type: [Object],
        default: []
    }
});

const Url = mongoose.model('Url', urlSchema);

// Create short URL
app.post('/shorten', async (req, res) => {
    const { originalUrl } = req.body;

    if (!originalUrl) {
        return res.status(400).send({ error: "Original URL is required." });
    }

    const shortUrl = shortid.generate();
    const newUrl = new Url({
        originalUrl,
        shortUrl,
    });

    await newUrl.save();
    res.send({ shortUrl: `${req.protocol}://${req.get('host')}/${shortUrl}` });
});

// Handle URL redirection and collect data
app.get('/:shortUrl', async (req, res) => {
    const { shortUrl } = req.params;
    const urlData = await Url.findOne({ shortUrl });

    if (!urlData) {
        return res.status(404).send('URL not found');
    }

    // Increment click count and record click data
    urlData.clicks++;
    urlData.clickData.push({
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.get('Referrer') || 'Direct',
        language: req.headers['accept-language'],
        timestamp: new Date(),
    });

    await urlData.save();
    res.redirect(urlData.originalUrl);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
