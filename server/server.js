const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const QRCode = require("qrcode");

const app = express();

const PORT = process.env.PORT || 5000;

// ===============================
// FOLDERS
// ===============================

const ROOT_DIR = path.join(__dirname, "..");
const CLIENT_DIR = path.join(ROOT_DIR, "client");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATABASE_DIR = path.join(__dirname, "database");
const DATABASE_FILE = path.join(DATABASE_DIR, "files.json");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATABASE_DIR, { recursive: true });

// Create database file if it doesn't exist
if (!fs.existsSync(DATABASE_FILE)) {
    fs.writeFileSync(DATABASE_FILE, "[]");
}

// ===============================
// SETTINGS
// ===============================

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const FILE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// ===============================
// MULTER
// ===============================

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            crypto.randomBytes(6).toString("hex") +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

// ===============================
// HELPERS
// ===============================

function readDatabase() {
    try {
        return JSON.parse(fs.readFileSync(DATABASE_FILE, "utf8"));
    } catch {
        return [];
    }
}

function writeDatabase(data) {
    fs.writeFileSync(
        DATABASE_FILE,
        JSON.stringify(data, null, 2)
    );
}

function generateCode() {
    return crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();
}

function getBaseUrl(req) {
    if (process.env.BASE_URL) {
        return process.env.BASE_URL.replace(/\/$/, "");
    }

    return `${req.protocol}://${req.get("host")}`;
}

function createFileRecord(file, req) {
    const code = generateCode();

    const createdAt = Date.now();
    const expiresAt = createdAt + FILE_EXPIRY;

    const record = {
        id: crypto.randomUUID(),
        code,
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        mimeType: file.mimetype,
        createdAt,
        expiresAt
    };

    return {
        ...record,
        shareUrl: `${getBaseUrl(req)}/?code=${code}`
    };
}

function isExpired(file) {
    return Date.now() > file.expiresAt;
}

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());

app.use(express.static(CLIENT_DIR));

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "DropBox Local server is running",
        time: new Date().toISOString()
    });
});

// ===============================
// UPLOAD SINGLE FILE
// ===============================

app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file selected"
            });
        }

        const database = readDatabase();

        const record = createFileRecord(req.file, req);

        database.push(record);

        writeDatabase(database);

        res.json({
            success: true,
            message: "File uploaded successfully",
            file: record
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Upload failed"
        });
    }
});

// ===============================
// GET FILE INFORMATION
// ===============================

app.get("/api/file/:code", (req, res) => {
    const code = req.params.code.toUpperCase();

    const database = readDatabase();

    const file = database.find(item => item.code === code);

    if (!file) {
        return res.status(404).json({
            success: false,
            message: "File not found"
        });
    }

    if (isExpired(file)) {
        return res.status(410).json({
            success: false,
            message: "File has expired"
        });
    }

    res.json({
        success: true,
        file: {
            code: file.code,
            name: file.originalName,
            size: file.size,
            type: file.mimeType,
            createdAt: file.createdAt,
            expiresAt: file.expiresAt
        }
    });
});

// ===============================
// DOWNLOAD FILE
// ===============================

app.get("/api/download/:code", (req, res) => {
    const code = req.params.code.toUpperCase();

    const database = readDatabase();

    const file = database.find(item => item.code === code);

    if (!file) {
        return res.status(404).send("File not found");
    }

    if (isExpired(file)) {
        return res.status(410).send("File has expired");
    }

    const filePath = path.join(
        UPLOAD_DIR,
        file.storedName
    );

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("Physical file not found");
    }

    res.download(
        filePath,
        file.originalName
    );
});

// ===============================
// QR CODE
// ===============================

app.get("/api/qr/:code", async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const database = readDatabase();

        const file = database.find(item => item.code === code);

        if (!file) {
            return res.status(404).send("File not found");
        }

        if (isExpired(file)) {
            return res.status(410).send("File has expired");
        }

        const shareUrl =
            `${getBaseUrl(req)}/?code=${code}`;

        const qr = await QRCode.toDataURL(
            shareUrl,
            {
                width: 500,
                margin: 2,
                errorCorrectionLevel: "M"
            }
        );

        res.json({
            success: true,
            qr
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "QR generation failed"
        });
    }
});

// ===============================
// CLEAN EXPIRED FILES
// ===============================

function cleanupExpiredFiles() {
    const database = readDatabase();

    const remaining = [];

    for (const file of database) {

        if (isExpired(file)) {

            const filePath = path.join(
                UPLOAD_DIR,
                file.storedName
            );

            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (error) {
                    console.error(
                        "Could not delete:",
                        filePath
                    );
                }
            }

        } else {
            remaining.push(file);
        }
    }

    if (remaining.length !== database.length) {
        writeDatabase(remaining);
    }
}

setInterval(
    cleanupExpiredFiles,
    60 * 1000
);

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("=================================");
    console.log("       DROPBOX LOCAL");
    console.log("=================================");
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log("=================================");
    console.log("");
});