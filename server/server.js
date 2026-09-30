const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

const ROOT_DIR = path.join(__dirname, "..");
const CLIENT_DIR = path.join(ROOT_DIR, "client");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATABASE_DIR = path.join(__dirname, "database");
const DATABASE_FILE = path.join(DATABASE_DIR, "files.json");

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_FILES = 50;
const EXPIRY_MINUTES = 10;

// --------------------------------------------------
// CREATE REQUIRED DIRECTORIES
// --------------------------------------------------

function ensureDirectories() {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(DATABASE_DIR, { recursive: true });

    if (!fs.existsSync(DATABASE_FILE)) {
        fs.writeFileSync(DATABASE_FILE, "[]", "utf8");
    }
}

ensureDirectories();

// --------------------------------------------------
// DATABASE HELPERS
// --------------------------------------------------

function readDatabase() {
    try {
        const data = fs.readFileSync(DATABASE_FILE, "utf8");

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);
    } catch (error) {
        console.error("Database read error:", error);
        return [];
    }
}

function writeDatabase(data) {
    fs.writeFileSync(
        DATABASE_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// --------------------------------------------------
// CODE GENERATOR
// --------------------------------------------------

function generateCode(length = 6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < length; i++) {
        code += chars[crypto.randomInt(0, chars.length)];
    }

    return code;
}

function generateUniqueCode() {
    const database = readDatabase();

    let code;

    do {
        code = generateCode();
    } while (database.some((item) => item.code === code));

    return code;
}

// --------------------------------------------------
// FILE NAME HELPER
// --------------------------------------------------

function safeFileName(fileName) {
    return path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

// --------------------------------------------------
// MULTER STORAGE
// --------------------------------------------------

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            crypto.randomBytes(8).toString("hex") +
            "-" +
            safeFileName(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES
    }
});

// --------------------------------------------------
// EXPRESS MIDDLEWARE
// --------------------------------------------------

app.use(express.json());

app.use(express.static(CLIENT_DIR));

// --------------------------------------------------
// HEALTH
// --------------------------------------------------

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "DropBox Local server is running",
        time: new Date().toISOString()
    });
});

// --------------------------------------------------
// UPLOAD
// --------------------------------------------------

app.post(
    "/api/upload",
    upload.array("files", MAX_FILES),
    (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please select at least one file."
                });
            }

            const database = readDatabase();

            const code = generateUniqueCode();

            const createdAt = Date.now();

            const expiresAt =
                createdAt +
                EXPIRY_MINUTES * 60 * 1000;

            const files = req.files.map((file) => {
                return {
                    id: crypto.randomBytes(8).toString("hex"),

                    originalName: file.originalname,

                    storedName: file.filename,

                    size: file.size,

                    mimeType: file.mimetype
                };
            });

            const record = {
                code,

                createdAt,

                expiresAt,

                files
            };

            database.push(record);

            writeDatabase(database);

            const baseUrl =
                `${req.protocol}://${req.get("host")}`;

            const shareUrl =
                `${baseUrl}/?code=${encodeURIComponent(code)}`;

            res.json({
                success: true,

                message: "Files uploaded successfully.",

                code,

                shareUrl,

                expiresAt,

                expiresInMinutes: EXPIRY_MINUTES,

                files: files.map((file) => ({
                    id: file.id,
                    name: file.originalName,
                    size: file.size
                }))
            });
        } catch (error) {
            console.error("Upload error:", error);

            res.status(500).json({
                success: false,
                message: "Upload failed."
            });
        }
    }
);

// --------------------------------------------------
// GET FILE INFORMATION
// --------------------------------------------------

app.get("/api/file/:code", (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const database = readDatabase();

        const record = database.find(
            (item) => item.code === code
        );

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Share code not found."
            });
        }

        if (Date.now() > record.expiresAt) {
            removeRecord(code);

            return res.status(410).json({
                success: false,
                message: "This share has expired."
            });
        }

        res.json({
            success: true,

            code: record.code,

            createdAt: record.createdAt,

            expiresAt: record.expiresAt,

            files: record.files.map((file) => ({
                id: file.id,

                name: file.originalName,

                size: file.size,

                mimeType: file.mimeType,

                downloadUrl:
                    `/api/download/${encodeURIComponent(code)}/${encodeURIComponent(file.id)}`
            }))
        });
    } catch (error) {
        console.error("File information error:", error);

        res.status(500).json({
            success: false,
            message: "Could not load file information."
        });
    }
});

// --------------------------------------------------
// DOWNLOAD INDIVIDUAL FILE
// --------------------------------------------------

app.get(
    "/api/download/:code/:fileId",
    (req, res) => {
        try {
            const code = req.params.code.toUpperCase();
            const fileId = req.params.fileId;

            const database = readDatabase();

            const record = database.find(
                (item) => item.code === code
            );

            if (!record) {
                return res.status(404).send(
                    "Share code not found."
                );
            }

            if (Date.now() > record.expiresAt) {
                removeRecord(code);

                return res.status(410).send(
                    "This share has expired."
                );
            }

            const file = record.files.find(
                (item) => item.id === fileId
            );

            if (!file) {
                return res.status(404).send(
                    "File not found."
                );
            }

            const filePath = path.join(
                UPLOAD_DIR,
                file.storedName
            );

            if (!fs.existsSync(filePath)) {
                return res.status(404).send(
                    "Stored file not found."
                );
            }

            res.download(
                filePath,
                file.originalName,
                (error) => {
                    if (error && !res.headersSent) {
                        console.error(
                            "Download error:",
                            error
                        );

                        res.status(500).send(
                            "Download failed."
                        );
                    }
                }
            );
        } catch (error) {
            console.error(
                "Individual download error:",
                error
            );

            if (!res.headersSent) {
                res.status(500).send(
                    "Download failed."
                );
            }
        }
    }
);

// --------------------------------------------------
// DOWNLOAD FIRST FILE
// --------------------------------------------------

app.get("/api/download/:code", (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const database = readDatabase();

        const record = database.find(
            (item) => item.code === code
        );

        if (!record) {
            return res.status(404).send(
                "Share code not found."
            );
        }

        if (Date.now() > record.expiresAt) {
            removeRecord(code);

            return res.status(410).send(
                "This share has expired."
            );
        }

        if (!record.files.length) {
            return res.status(404).send(
                "No files available."
            );
        }

        const file = record.files[0];

        const filePath = path.join(
            UPLOAD_DIR,
            file.storedName
        );

        if (!fs.existsSync(filePath)) {
            return res.status(404).send(
                "File not found."
            );
        }

        res.download(
            filePath,
            file.originalName
        );
    } catch (error) {
        console.error(
            "Download error:",
            error
        );

        if (!res.headersSent) {
            res.status(500).send(
                "Download failed."
            );
        }
    }
});

// --------------------------------------------------
// QR CODE
// --------------------------------------------------

app.get("/api/qr/:code", async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const database = readDatabase();

        const record = database.find(
            (item) => item.code === code
        );

        if (!record) {
            return res.status(404).send(
                "Share code not found."
            );
        }

        if (Date.now() > record.expiresAt) {
            removeRecord(code);

            return res.status(410).send(
                "This share has expired."
            );
        }

        const baseUrl =
            `${req.protocol}://${req.get("host")}`;

        let url =
            `${baseUrl}/?code=${encodeURIComponent(code)}`;

        if (
            typeof req.query.url === "string" &&
            req.query.url.startsWith("http")
        ) {
            url = req.query.url;
        }

        const qrBuffer = await QRCode.toBuffer(url, {
            width: 320,

            margin: 2,

            errorCorrectionLevel: "M"
        });

        res.setHeader(
            "Content-Type",
            "image/png"
        );

        res.send(qrBuffer);
    } catch (error) {
        console.error("QR error:", error);

        res.status(500).send(
            "Could not generate QR code."
        );
    }
});

// --------------------------------------------------
// REMOVE EXPIRED RECORD
// --------------------------------------------------

function removeRecord(code) {
    const database = readDatabase();

    const record = database.find(
        (item) => item.code === code
    );

    if (!record) {
        return;
    }

    for (const file of record.files) {
        const filePath = path.join(
            UPLOAD_DIR,
            file.storedName
        );

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(
                "Could not delete file:",
                filePath,
                error
            );
        }
    }

    const updatedDatabase =
        database.filter(
            (item) => item.code !== code
        );

    writeDatabase(updatedDatabase);
}

// --------------------------------------------------
// CLEANUP EXPIRED FILES
// --------------------------------------------------

function cleanupExpiredFiles() {
    try {
        const database = readDatabase();

        const activeRecords = [];

        for (const record of database) {
            if (Date.now() > record.expiresAt) {
                for (const file of record.files) {
                    const filePath = path.join(
                        UPLOAD_DIR,
                        file.storedName
                    );

                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (error) {
                        console.error(
                            "Cleanup file error:",
                            error
                        );
                    }
                }
            } else {
                activeRecords.push(record);
            }
        }

        if (activeRecords.length !== database.length) {
            writeDatabase(activeRecords);
        }
    } catch (error) {
        console.error(
            "Cleanup error:",
            error
        );
    }
}

setInterval(
    cleanupExpiredFiles,
    60 * 1000
);

cleanupExpiredFiles();

// --------------------------------------------------
// MULTER ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                success: false,
                message:
                    "File is too large. Maximum size is 500 MB."
            });
        }

        if (error.code === "LIMIT_FILE_COUNT") {
            return res.status(413).json({
                success: false,
                message:
                    "Too many files. Maximum is 50 files."
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next(error);
});

// --------------------------------------------------
// GENERAL ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
    console.error("Server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

// --------------------------------------------------
// SPA FALLBACK
// --------------------------------------------------

app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            message: "API endpoint not found."
        });
    }

    res.sendFile(
        path.join(CLIENT_DIR, "index.html")
    );
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, HOST, () => {
    console.log("");
    console.log("====================================");
    console.log("       DROPBOX LOCAL SERVER");
    console.log("====================================");
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    console.log("====================================");
    console.log("");
});