const express = require("express");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
require('dotenv').config();
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Cooldown settings
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const cooldowns = {}; // { ip: timestamp }

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
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

// Delete old files every 24 hours
const deleteOldFiles = (directory, maxAgeMs) => {
    setInterval(() => {
        fs.readdir(directory, (err, files) => {
            if (err) return console.error(`Error reading directory ${directory}:`, err);

            const now = Date.now();
            files.forEach(file => {
                const filePath = path.join(directory, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return console.error(`Error getting stats for file ${filePath}:`, err);

                    if (now - stats.mtimeMs > maxAgeMs) {
                        fs.unlink(filePath, err => {
                            if (err) {
                                console.error(`Error deleting file ${filePath}:`, err);
                            } else {
                                console.log(`Deleted old file: ${filePath}`);
                            }
                        });
                    }
                });
            });
        });
    }, maxAgeMs);
};
deleteOldFiles(uploadsDir, 86400000); // 24 hours in milliseconds

// Block mobile users
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

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '50mb' }));

// List available icons
app.get("/api/icons", (req, res) => {
    const iconsDir = path.join(__dirname, "icons");
    fs.readdir(iconsDir, (err, files) => {
        if (err) return res.status(500).json({ error: "Failed to load icons" });

        const icons = files
            .filter(file => /\.(png|jpg|jpeg|svg|ico)$/i.test(file))
            .map(file => ({ name: path.parse(file).name, src: `/icons/${file}` }));
        res.json(icons);
    });
});

// Download selected icons as ZIP
app.post("/api/download", async (req, res) => {
    const { coloredIcons } = req.body;

    if (!coloredIcons || coloredIcons.length === 0) {
        return res.status(400).json({ error: "No icons selected" });
    }

    const zip = archiver("zip", { zlib: { level: 9 } });
    res.attachment("selected-icons.zip");

    zip.on("error", err => res.status(500).send({ error: err.message }));

    try {
        for (const icon of coloredIcons) {
            const iconBuffer = Buffer.from(icon.data, 'base64');
            zip.append(iconBuffer, { name: `${icon.name}.ico` });
        }
        zip.pipe(res);
        zip.finalize();
    } catch (error) {
        console.error("Error processing icons:", error);
        res.status(500).send({ error: "Failed to process icons" });
    }
});

// Add this code to server.js

// Helper function to forward requests to Discord
async function sendToDiscordWebhook(payload) {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
    }

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord webhook error: ${response.status} ${errorText}`);
    }

    return response;
}

// New endpoint that handles the request submission
app.post('/api/submit-request', (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    if (cooldowns[ip] && now - cooldowns[ip] < COOLDOWN_MS) {
        const mins = Math.ceil((COOLDOWN_MS - (now - cooldowns[ip])) / 60000);
        return res.status(429).json({ error: `You're on cooldown. Try again in ${mins} minute(s).` });
    }

    cooldowns[ip] = now;
    next();
}, upload.single('icon-image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Create image URL
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        // Prepare the Discord webhook payload
        const payload = {
            username: "Icon Request",
            embeds: [
                {
                    title: "New Icon Request",
                    fields: [
                        { name: "Icon Name:", value: req.body["icon-name"] || "N/A" },
                        { name: "Requester Email:", value: req.body["requester-email"] || "N/A" },
                        { name: "Image URL:", value: imageUrl || "N/A" }
                    ],
                    image: { url: imageUrl },
                    color: 3447003
                }
            ]
        };

        // Forward the request to Discord
        await sendToDiscordWebhook(payload);

        // Respond to the client
        res.status(200).json({ success: true, message: 'Request submitted successfully' });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});


// Upload icon image with 1-hour cooldown
app.post('/api/upload-image', (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    if (cooldowns[ip] && now - cooldowns[ip] < COOLDOWN_MS) {
        const mins = Math.ceil((COOLDOWN_MS - (now - cooldowns[ip])) / 60000);
        return res.status(429).json({ error: `You're on cooldown. Try again in ${mins} minute(s).` });
    }

    cooldowns[ip] = now;
    next();
}, upload.single('icon-image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});