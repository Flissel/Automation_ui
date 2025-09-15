/**
 * Media API für TRAE Unity AI Platform
 * Bietet REST-Endpunkte für FFmpeg-Operationen
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpegService from '../services/ffmpeg-service.js';

const router = express.Router();

// Multer-Konfiguration für File-Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB Limit
    },
    fileFilter: (req, file, cb) => {
        // Erlaubte Dateitypen
        const allowedTypes = /\.(mp4|avi|mov|mkv|webm|mp3|wav|aac|flac|ogg|jpg|jpeg|png|gif)$/i;
        if (allowedTypes.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Nicht unterstützter Dateityp'), false);
        }
    }
});

/**
 * GET /api/media/status
 * Überprüft FFmpeg-Verfügbarkeit
 */
router.get('/status', (req, res) => {
    try {
        const isAvailable = ffmpegService.checkAvailability();
        res.json({
            success: true,
            ffmpegAvailable: isAvailable,
            message: isAvailable 
                ? 'FFmpeg ist verfügbar' 
                : 'FFmpeg ist nicht installiert. Führen Sie scripts/setup/setup-ffmpeg.bat (oder .ps1) aus.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/media/upload
 * Lädt Medien-Dateien hoch
 */
router.post('/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Keine Dateien hochgeladen'
            });
        }

        const uploadedFiles = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
        }));

        res.json({
            success: true,
            files: uploadedFiles,
            message: `${uploadedFiles.length} Datei(en) erfolgreich hochgeladen`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/media/convert
 * Konvertiert Video zu anderem Format
 */
router.post('/convert', async (req, res) => {
    try {
        const { inputFile, outputFormat, options = {} } = req.body;

        if (!inputFile || !outputFormat) {
            return res.status(400).json({
                success: false,
                error: 'inputFile und outputFormat sind erforderlich'
            });
        }

        const inputPath = path.join(process.cwd(), 'uploads', inputFile);
        const outputPath = path.join(
            process.cwd(), 
            'uploads', 
            `converted_${Date.now()}.${outputFormat}`
        );

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({
                success: false,
                error: 'Eingabedatei nicht gefunden'
            });
        }

        const result = await ffmpegService.convertVideo(inputPath, outputPath, {
            videoCodec: options.videoCodec,
            audioCodec: options.audioCodec,
            videoBitrate: options.videoBitrate,
            resolution: options.resolution,
            framerate: options.framerate,
            silent: true
        });

        res.json({
            success: true,
            outputFile: path.basename(outputPath),
            outputPath: outputPath,
            message: 'Video erfolgreich konvertiert'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || error.error
        });
    }
});

/**
 * POST /api/media/extract-audio
 * Extrahiert Audio aus Video
 */
router.post('/extract-audio', async (req, res) => {
    try {
        const { inputFile, options = {} } = req.body;

        if (!inputFile) {
            return res.status(400).json({
                success: false,
                error: 'inputFile ist erforderlich'
            });
        }

        const inputPath = path.join(process.cwd(), 'uploads', inputFile);
        const outputPath = path.join(
            process.cwd(), 
            'uploads', 
            `audio_${Date.now()}.mp3`
        );

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({
                success: false,
                error: 'Eingabedatei nicht gefunden'
            });
        }

        const result = await ffmpegService.extractAudio(inputPath, outputPath, {
            codec: options.codec || 'mp3',
            bitrate: options.bitrate,
            silent: true
        });

        res.json({
            success: true,
            outputFile: path.basename(outputPath),
            outputPath: outputPath,
            message: 'Audio erfolgreich extrahiert'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || error.error
        });
    }
});

/**
 * POST /api/media/thumbnail
 * Erstellt Thumbnail aus Video
 */
router.post('/thumbnail', async (req, res) => {
    try {
        const { inputFile, options = {} } = req.body;

        if (!inputFile) {
            return res.status(400).json({
                success: false,
                error: 'inputFile ist erforderlich'
            });
        }

        const inputPath = path.join(process.cwd(), 'uploads', inputFile);
        const outputPath = path.join(
            process.cwd(), 
            'uploads', 
            `thumb_${Date.now()}.jpg`
        );

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({
                success: false,
                error: 'Eingabedatei nicht gefunden'
            });
        }

        const result = await ffmpegService.createThumbnail(inputPath, outputPath, {
            timestamp: options.timestamp || '00:00:01',
            size: options.size,
            silent: true
        });

        res.json({
            success: true,
            outputFile: path.basename(outputPath),
            outputPath: outputPath,
            message: 'Thumbnail erfolgreich erstellt'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || error.error
        });
    }
});

/**
 * POST /api/media/compress
 * Komprimiert Video
 */
router.post('/compress', async (req, res) => {
    try {
        const { inputFile, options = {} } = req.body;

        if (!inputFile) {
            return res.status(400).json({
                success: false,
                error: 'inputFile ist erforderlich'
            });
        }

        const inputPath = path.join(process.cwd(), 'uploads', inputFile);
        const outputPath = path.join(
            process.cwd(), 
            'uploads', 
            `compressed_${Date.now()}.mp4`
        );

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({
                success: false,
                error: 'Eingabedatei nicht gefunden'
            });
        }

        const result = await ffmpegService.compressVideo(inputPath, outputPath, {
            quality: options.quality || '23',
            preset: options.preset || 'medium',
            silent: true
        });

        res.json({
            success: true,
            outputFile: path.basename(outputPath),
            outputPath: outputPath,
            message: 'Video erfolgreich komprimiert'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || error.error
        });
    }
});

/**
 * POST /api/media/info
 * Holt Video-Informationen
 */
router.post('/info', async (req, res) => {
    try {
        const { inputFile } = req.body;

        if (!inputFile) {
            return res.status(400).json({
                success: false,
                error: 'inputFile ist erforderlich'
            });
        }

        const inputPath = path.join(process.cwd(), 'uploads', inputFile);

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({
                success: false,
                error: 'Eingabedatei nicht gefunden'
            });
        }

        const info = await ffmpegService.getVideoInfo(inputPath);

        res.json({
            success: true,
            info: info,
            message: 'Video-Informationen erfolgreich abgerufen'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || error.error
        });
    }
});

/**
 * GET /api/media/download/:filename
 * Lädt verarbeitete Datei herunter
 */
router.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(process.cwd(), 'uploads', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Datei nicht gefunden'
            });
        }

        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Download-Fehler:', err);
                res.status(500).json({
                    success: false,
                    error: 'Download fehlgeschlagen'
                });
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/media/cleanup
 * Löscht temporäre Dateien
 */
router.delete('/cleanup', (req, res) => {
    try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            return res.json({
                success: true,
                message: 'Uploads-Verzeichnis existiert nicht'
            });
        }

        const files = fs.readdirSync(uploadsDir);
        let deletedCount = 0;

        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            
            // Lösche Dateien älter als 1 Stunde
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            if (stats.mtime.getTime() < oneHourAgo) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        });

        res.json({
            success: true,
            deletedFiles: deletedCount,
            message: `${deletedCount} temporäre Datei(en) gelöscht`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;