const express = require("express");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
require('dotenv').config();
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const useCDN = process.env.USE_CDN === 'true'; // Use CDN if set to true in .env

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

app.use('/icons', express.static(path.join(__dirname, 'icons'), {
    setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=31536000');
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '50mb' }));

app.get("/api/icons", (req, res) => {
    const iconsDir = path.join(__dirname, "icons");
    const list = require('./IconList.json');
    const cdnBaseUrl = "https://cdn.desktopicon.net/icons";

    fs.readdir(iconsDir, (err, files) => {
        if (err) return res.status(500).json({ error: "Failed to load icons" });

        const icons = list
            .filter(icon => !icon.disabled)
            .map(icon => ({
                name: icon.name,
                src: useCDN ? `${cdnBaseUrl}/${path.basename(icon.src)}` : icon.src
            }));

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
        // // Add the setShortcutIcons.bat file to the ZIP
        // const batFilePath = path.join(__dirname, "setShortcutIcons.bat");
        // if (fs.existsSync(batFilePath)) {
        //     zip.file(batFilePath, { name: "setShortcutIcons.bat" });
        // }

        for (const icon of coloredIcons) {
            // Validate that the icon data has proper ICO format
            const iconBuffer = Buffer.from(icon.data, 'base64');

            // Check if the buffer starts with proper ICO header (00 00 01 00)
            const hasValidHeader = iconBuffer.length >= 4 &&
                iconBuffer[0] === 0 &&
                iconBuffer[1] === 0 &&
                iconBuffer[2] === 1 &&
                iconBuffer[3] === 0;

            if (!hasValidHeader) {
                // If data doesn't have a proper ICO header, we need to add it
                // Create a proper ICO format buffer
                const iconCount = 1; // We're adding one icon image

                // ICO header (6 bytes)
                const header = Buffer.alloc(6);
                header.writeUInt16LE(0, 0);     // Reserved, must be 0
                header.writeUInt16LE(1, 2);     // ICO file type (1)
                header.writeUInt16LE(iconCount, 4); // Number of images

                // Icon directory entry (16 bytes per entry)
                const dirEntry = Buffer.alloc(16);
                const width = 32;  // Assuming 32x32 icon - adjust as needed
                const height = 32; // Assuming 32x32 icon - adjust as needed

                dirEntry.writeUInt8(width === 256 ? 0 : width, 0);  // Width
                dirEntry.writeUInt8(height === 256 ? 0 : height, 1); // Height
                dirEntry.writeUInt8(0, 2);      // Color palette size (0 for no palette)
                dirEntry.writeUInt8(0, 3);      // Reserved, must be 0
                dirEntry.writeUInt16LE(1, 4);   // Color planes (1 for ICO)
                dirEntry.writeUInt16LE(32, 6);  // Bits per pixel (32 for RGBA)
                dirEntry.writeUInt32LE(iconBuffer.length, 8); // Size of image data
                dirEntry.writeUInt32LE(22, 12); // Offset of image data (6 + 16)

                // Combine all parts into a proper ICO file
                const properIconBuffer = Buffer.concat([
                    header,
                    dirEntry,
                    iconBuffer
                ]);

                zip.append(properIconBuffer, { name: `${icon.name}.ico` });
            } else {
                // If it already has a valid header, use it as is
                zip.append(iconBuffer, { name: `${icon.name}.ico` });
            }
        }

        zip.pipe(res);
        zip.finalize();
    } catch (error) {
        console.error("Error processing icons:", error);
        res.status(500).send({ error: "Failed to process icons" });
    }
});

// New endpoint that handles the request submission
app.post('/api/submit-request', (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    console.log(`[DEBUG] Incoming request from IP: ${ip} at ${new Date(now).toISOString()}`);

    if (cooldowns[ip] && now - cooldowns[ip] < COOLDOWN_MS) {
        const mins = Math.ceil((COOLDOWN_MS - (now - cooldowns[ip])) / 60000);
        console.log(`[DEBUG] Cooldown active for IP: ${ip}. Remaining time: ${mins} minute(s).`);
        return res.status(429).json({ error: `You're on cooldown. Try again in ${mins} minute(s).` });
    }

    cooldowns[ip] = now;
    console.log(`[DEBUG] Cooldown set for IP: ${ip}.`);
    next();
}, upload.single('icon-image'), async (req, res) => {
    try {
        if (!req.file) {
            console.error(`[ERROR] No file uploaded for IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Create image URL
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        console.log(`[DEBUG] File uploaded successfully. Image URL: ${imageUrl}`);

        const webhookUrl = process.env.WEBHOOK_URL;
        if (!webhookUrl) {
            console.error(`[ERROR] Webhook URL not configured.`);
            throw new Error('Webhook URL not configured');
        }

        // Prepare the Discord webhook payload
        const payload = {
            username: "Icon Request",
            avatar_url: "https://i.imgur.com/yMDfzco.png",
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

        console.log(`[DEBUG] Sending payload to Discord webhook:`, payload);

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ERROR] Discord webhook error: ${response.status} ${errorText}`);
            throw new Error(`Discord webhook error: ${response.status} ${errorText}`);
        }

        console.log(`[DEBUG] Payload successfully sent to Discord webhook.`);
        res.status(200).json({ success: true, message: 'Request submitted successfully' });
    } catch (error) {
        console.error(`[ERROR] Failed to process request:`, error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve request.html without .html extension
app.get('/request', (req, res) => {
    res.sendFile(path.join(__dirname, 'request.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});