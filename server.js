require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection with mongoose
mongoose.connect(process.env.MONGO_URI)
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
    clicks: Number,
    clickData: [Object],
});

const Url = mongoose.model('Url', urlSchema);

// Create short URL
app.post('/shorten', async (req, res) => {
    const { originalUrl } = req.body;
    const shortUrl = shortid.generate();

    const newUrl = new Url({
        originalUrl,
        shortUrl,
        clicks: 0,
        clickData: [],
    });

    await newUrl.save();
    res.send({ shortUrl: `http://localhost:${process.env.PORT}/${shortUrl}` });
});

// Handle URL redirection and collect data
app.get('/:shortUrl', async (req, res) => {
    const shortUrl = req.params.shortUrl;
    const urlData = await Url.findOne({ shortUrl });

    if (urlData) {
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
    } else {
        res.status(404).send('URL not found');
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
});
