const express = require("express");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
require('dotenv').config(); // Add this line to load environment variables
const multer = require('multer'); // Add multer for file uploads

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads with .png extension
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads/'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// Middleware to block mobile users
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);

    if (isMobile) {
        return res.status(403).send(`
            <html>
                <head>
                    <title>Access Denied</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            margin: 0;
                            padding: 0;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            background-color: #f5f5f5;
                            color: #333;
                        }
                        h1 {
                            font-size: 2rem;
                            color: #e74c3c;
                        }
                        p {
                            font-size: 1rem;
                            margin-top: 10px;
                        }
                    </style>
                </head>
                <body>
                    <h1>Access Denied</h1>
                    <p>This site is designed for desktop devices only. Please access it from a desktop for the best experience.</p>
                </body>
            </html>
        `);
    }

    next();
});

// Serve static files (e.g., icons, CSS, JS)
app.use(express.static(path.join(__dirname)));
app.use(express.json({limit: '50mb'})); // Increase JSON size limit for base64 data

// Endpoint to get the list of icons
app.get("/api/icons", (req, res) => {
    const iconsDir = path.join(__dirname, "icons");
    fs.readdir(iconsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: "Failed to load icons" });
        }
        const icons = files
            .filter(file => /\.(png|jpg|jpeg|svg|ico)$/i.test(file))
            .map(file => ({ name: path.parse(file).name, src: `/icons/${file}` }));
        res.json(icons);
    });
});

// Endpoint to expose the webhook URL
app.get('/api/webhook-url', (req, res) => {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('WEBHOOK_URL is not defined in the environment variables.');
        return res.status(500).json({ error: 'Webhook URL is not configured.' });
    }
    res.json({ webhookUrl });
});

// Endpoint to download selected icons as a ZIP file
app.post("/api/download", async (req, res) => {
    const { coloredIcons } = req.body;
    
    if (!coloredIcons || coloredIcons.length === 0) {
        return res.status(400).json({ error: "No icons selected" });
    }

    const zip = archiver("zip", { zlib: { level: 9 } });
    res.attachment("selected-icons.zip");

    zip.on("error", (err) => res.status(500).send({ error: err.message }));

    try {
        // Add colored icons to the ZIP
        for (const icon of coloredIcons) {
            // Convert base64 to buffer
            const iconBuffer = Buffer.from(icon.data, 'base64');
            
            // Add to ZIP
            zip.append(iconBuffer, { name: `${icon.name}.ico` });
        }
        
        zip.pipe(res);
        zip.finalize();
    } catch (error) {
        console.error("Error processing icons:", error);
        res.status(500).send({ error: "Failed to process icons" });
    }
});

// Endpoint to handle image uploads
app.post('/api/upload-image', upload.single('icon-image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});