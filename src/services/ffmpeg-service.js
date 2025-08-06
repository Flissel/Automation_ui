/**
 * FFmpeg Service für TRAE Unity AI Platform
 * Bietet Video- und Audio-Verarbeitungsfunktionen
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

class FFmpegService {
    constructor() {
        // FFmpeg-Pfad relativ zum Projektroot
        this.ffmpegPath = path.join(process.cwd(), 'tools', 'ffmpeg', 'ffmpeg.exe');
        this.isAvailable = this.checkAvailability();
    }

    /**
     * Überprüft ob FFmpeg verfügbar ist
     * @returns {boolean} True wenn FFmpeg verfügbar ist
     */
    checkAvailability() {
        try {
            return fs.existsSync(this.ffmpegPath);
        } catch (error) {
            console.error('❌ FFmpeg Verfügbarkeitsprüfung fehlgeschlagen:', error);
            return false;
        }
    }

    /**
     * Führt FFmpeg-Befehl aus
     * @param {string[]} args - FFmpeg-Argumente
     * @param {Object} options - Optionen für den Prozess
     * @returns {Promise<Object>} Ergebnis der Ausführung
     */
    async execute(args, options = {}) {
        if (!this.isAvailable) {
            throw new Error('FFmpeg ist nicht verfügbar. Bitte führen Sie setup-ffmpeg.bat aus.');
        }

        return new Promise((resolve, reject) => {
            const process = spawn(this.ffmpegPath, args, {
                stdio: options.silent ? 'pipe' : 'inherit',
                ...options
            });

            let stdout = '';
            let stderr = '';

            if (options.silent) {
                process.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });

                process.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        code,
                        stdout,
                        stderr
                    });
                } else {
                    reject({
                        success: false,
                        code,
                        stdout,
                        stderr,
                        error: `FFmpeg beendet mit Code ${code}`
                    });
                }
            });

            process.on('error', (error) => {
                reject({
                    success: false,
                    error: error.message,
                    stdout,
                    stderr
                });
            });
        });
    }

    /**
     * Konvertiert Video zu verschiedenen Formaten
     * @param {string} inputPath - Eingabedatei
     * @param {string} outputPath - Ausgabedatei
     * @param {Object} options - Konvertierungsoptionen
     * @returns {Promise<Object>} Konvertierungsergebnis
     */
    async convertVideo(inputPath, outputPath, options = {}) {
        const args = [
            '-i', inputPath,
            '-y' // Überschreibe Ausgabedatei
        ];

        // Video-Codec
        if (options.videoCodec) {
            args.push('-c:v', options.videoCodec);
        }

        // Audio-Codec
        if (options.audioCodec) {
            args.push('-c:a', options.audioCodec);
        }

        // Bitrate
        if (options.videoBitrate) {
            args.push('-b:v', options.videoBitrate);
        }

        // Auflösung
        if (options.resolution) {
            args.push('-s', options.resolution);
        }

        // Framerate
        if (options.framerate) {
            args.push('-r', options.framerate.toString());
        }

        args.push(outputPath);

        console.log(`🎬 Konvertiere Video: ${inputPath} → ${outputPath}`);
        return await this.execute(args, { silent: options.silent });
    }

    /**
     * Erstellt Thumbnail aus Video
     * @param {string} videoPath - Video-Pfad
     * @param {string} thumbnailPath - Thumbnail-Pfad
     * @param {Object} options - Thumbnail-Optionen
     * @returns {Promise<Object>} Thumbnail-Ergebnis
     */
    async createThumbnail(videoPath, thumbnailPath, options = {}) {
        const args = [
            '-i', videoPath,
            '-ss', options.timestamp || '00:00:01', // Zeitstempel
            '-vframes', '1', // Ein Frame
            '-y' // Überschreibe Ausgabedatei
        ];

        // Auflösung für Thumbnail
        if (options.size) {
            args.push('-s', options.size);
        }

        args.push(thumbnailPath);

        console.log(`📸 Erstelle Thumbnail: ${videoPath} → ${thumbnailPath}`);
        return await this.execute(args, { silent: options.silent });
    }

    /**
     * Extrahiert Audio aus Video
     * @param {string} videoPath - Video-Pfad
     * @param {string} audioPath - Audio-Pfad
     * @param {Object} options - Audio-Optionen
     * @returns {Promise<Object>} Audio-Extraktionsergebnis
     */
    async extractAudio(videoPath, audioPath, options = {}) {
        const args = [
            '-i', videoPath,
            '-vn', // Kein Video
            '-acodec', options.codec || 'mp3',
            '-y' // Überschreibe Ausgabedatei
        ];

        // Audio-Bitrate
        if (options.bitrate) {
            args.push('-ab', options.bitrate);
        }

        args.push(audioPath);

        console.log(`🎵 Extrahiere Audio: ${videoPath} → ${audioPath}`);
        return await this.execute(args, { silent: options.silent });
    }

    /**
     * Kombiniert mehrere Videos
     * @param {string[]} videoPaths - Array von Video-Pfaden
     * @param {string} outputPath - Ausgabe-Pfad
     * @param {Object} options - Kombinationsoptionen
     * @returns {Promise<Object>} Kombinationsergebnis
     */
    async concatenateVideos(videoPaths, outputPath, options = {}) {
        // Erstelle temporäre Dateiliste
        const listPath = path.join(process.cwd(), 'temp_video_list.txt');
        const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
        
        fs.writeFileSync(listPath, listContent);

        const args = [
            '-f', 'concat',
            '-safe', '0',
            '-i', listPath,
            '-c', 'copy',
            '-y'
        ];

        args.push(outputPath);

        try {
            console.log(`🔗 Kombiniere Videos: ${videoPaths.length} Dateien → ${outputPath}`);
            const result = await this.execute(args, { silent: options.silent });
            
            // Aufräumen
            if (fs.existsSync(listPath)) {
                fs.unlinkSync(listPath);
            }
            
            return result;
        } catch (error) {
            // Aufräumen bei Fehler
            if (fs.existsSync(listPath)) {
                fs.unlinkSync(listPath);
            }
            throw error;
        }
    }

    /**
     * Komprimiert Video
     * @param {string} inputPath - Eingabe-Pfad
     * @param {string} outputPath - Ausgabe-Pfad
     * @param {Object} options - Komprimierungsoptionen
     * @returns {Promise<Object>} Komprimierungsergebnis
     */
    async compressVideo(inputPath, outputPath, options = {}) {
        const args = [
            '-i', inputPath,
            '-c:v', 'libx264',
            '-crf', options.quality || '23', // 0-51, niedriger = bessere Qualität
            '-preset', options.preset || 'medium', // ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y'
        ];

        args.push(outputPath);

        console.log(`🗜️ Komprimiere Video: ${inputPath} → ${outputPath}`);
        return await this.execute(args, { silent: options.silent });
    }

    /**
     * Holt Video-Informationen
     * @param {string} videoPath - Video-Pfad
     * @returns {Promise<Object>} Video-Informationen
     */
    async getVideoInfo(videoPath) {
        const args = [
            '-i', videoPath,
            '-f', 'null',
            '-'
        ];

        try {
            const result = await this.execute(args, { silent: true });
            return this.parseVideoInfo(result.stderr);
        } catch (error) {
            return this.parseVideoInfo(error.stderr);
        }
    }

    /**
     * Parst FFmpeg-Ausgabe für Video-Informationen
     * @param {string} output - FFmpeg-Ausgabe
     * @returns {Object} Geparste Video-Informationen
     */
    parseVideoInfo(output) {
        const info = {
            duration: null,
            resolution: null,
            fps: null,
            videoCodec: null,
            audioCodec: null,
            bitrate: null
        };

        if (!output) return info;

        // Duration
        const durationMatch = output.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (durationMatch) {
            info.duration = durationMatch[1];
        }

        // Resolution und FPS
        const videoMatch = output.match(/Video: (\w+).*?(\d{3,4}x\d{3,4}).*?(\d+(?:\.\d+)?) fps/);
        if (videoMatch) {
            info.videoCodec = videoMatch[1];
            info.resolution = videoMatch[2];
            info.fps = parseFloat(videoMatch[3]);
        }

        // Audio-Codec
        const audioMatch = output.match(/Audio: (\w+)/);
        if (audioMatch) {
            info.audioCodec = audioMatch[1];
        }

        // Bitrate
        const bitrateMatch = output.match(/bitrate: (\d+) kb\/s/);
        if (bitrateMatch) {
            info.bitrate = `${bitrateMatch[1]} kb/s`;
        }

        return info;
    }
}

// Singleton-Instanz
const ffmpegService = new FFmpegService();

export default ffmpegService;
export { FFmpegService };