import sharp from 'sharp';
import { spawn } from 'child_process';
import path from 'path';
import { mkdir, access } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { Job, Thumbnail } from '../../server/models';
import { ThumbnailJobData } from '../types';
import { CONFIG } from '../../server/config/config';

export async function processThumbnailJob(
  jobData: ThumbnailJobData,
  updateProgress: (progress: number) => Promise<void>
): Promise<{ thumbnails: string[] }> {
  const { jobId, fileId, userId, filePath, fileType, outputDir } = jobData;

  try {
    // Update progress
    await updateProgress(20);

    // Ensure output directory exists
    await ensureDirectory(outputDir);

    // Update job status in database
    await Job.findByIdAndUpdate(jobId, {
      status: 'processing',
      startedAt: new Date()
    });

    await updateProgress(30);

    let thumbnailPath: string;

    if (fileType === 'image') {
      thumbnailPath = await processImageThumbnail(filePath, outputDir, updateProgress);
    } else if (fileType === 'video') {
      thumbnailPath = await processVideoThumbnail(filePath, outputDir, updateProgress);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    await updateProgress(90);

    // Save thumbnail info to database
    const thumbnailFilename = path.basename(thumbnailPath);
    const thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;

    const thumbnail = new Thumbnail({
      jobId,
      fileId,
      size: `${CONFIG.THUMBNAIL_SIZE}x${CONFIG.THUMBNAIL_SIZE}`,
      width: CONFIG.THUMBNAIL_SIZE,
      height: CONFIG.THUMBNAIL_SIZE,
      filename: thumbnailFilename,
      path: thumbnailPath,
      url: thumbnailUrl
    });

    await thumbnail.save();

    // Update job with thumbnail reference
    await Job.findByIdAndUpdate(jobId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      $push: { thumbnails: thumbnail._id }
    });

    await updateProgress(100);

    console.log(`✅ Thumbnail generated successfully: ${thumbnailPath}`);
    return { thumbnails: [thumbnailUrl] };

  } catch (error) {
    console.error(`❌ Error processing thumbnail job ${jobId}:`, error);

    // Update job status to failed
    await Job.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date()
    });

    throw error;
  }
}

async function processImageThumbnail(
  inputPath: string,
  outputDir: string,
  updateProgress: (progress: number) => Promise<void>
): Promise<string> {
  try {
    await updateProgress(40);

    // Validate input file exists
    const fs = await import('fs');
    if (!(await fs.promises.access(inputPath).then(() => true).catch(() => false))) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Use Sharp to create thumbnail with better error handling
    const sharpInstance = sharp(inputPath);
    
    // Get image metadata for validation
    const metadata = await sharpInstance.metadata();
    console.log(`📸 Image metadata:`, {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      hasProfile: metadata.hasProfile,
      hasAlpha: metadata.hasAlpha
    });

    // Determine output format based on input
    const outputFormat = metadata.format === 'jpeg' || metadata.format === 'jpg' ? 'jpeg' : 'png';
    const outputFilename = `thumb_${uuidv4()}.${outputFormat === 'jpeg' ? 'jpg' : 'png'}`;
    const outputPath = path.join(outputDir, outputFilename);

    let processedImage = sharpInstance
      .resize(CONFIG.THUMBNAIL_SIZE, CONFIG.THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      });

    // Apply format-specific processing
    if (outputFormat === 'jpeg') {
      processedImage = processedImage.jpeg({
        quality: CONFIG.THUMBNAIL_QUALITY,
        progressive: true,
        mozjpeg: true  // Better compression
      });
    } else {
      processedImage = processedImage.png({
        compressionLevel: 9,
        progressive: true
      });
    }

    await processedImage.toFile(outputPath);

    await updateProgress(80);

    // Validate output file was created
    const outputStats = await fs.promises.stat(outputPath);
    if (outputStats.size === 0) {
      throw new Error('Generated thumbnail file is empty');
    }

    console.log(`📸 Image thumbnail created: ${outputPath} (${outputStats.size} bytes)`);
    return outputPath;

  } catch (error) {
    console.error('Error processing image thumbnail:', error);
    throw new Error(`Failed to process image thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processVideoThumbnail(
  inputPath: string,
  outputDir: string,
  updateProgress: (progress: number) => Promise<void>
): Promise<string> {
  try {
    await updateProgress(40);

    const tempFilename = `temp_${uuidv4()}.jpg`;
    const tempPath = path.join(outputDir, tempFilename);
    
    const outputFilename = `thumb_${uuidv4()}.jpg`;
    const outputPath = path.join(outputDir, outputFilename);

    // Extract frame from video using FFmpeg
    await extractVideoFrame(inputPath, tempPath);
    
    await updateProgress(60);

    // Resize the extracted frame using Sharp
    await sharp(tempPath)
      .resize(CONFIG.THUMBNAIL_SIZE, CONFIG.THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: CONFIG.THUMBNAIL_QUALITY,
        progressive: true
      })
      .toFile(outputPath);

    await updateProgress(80);

    // Clean up temporary file with better error handling
    try {
      const fs = await import('fs');
      if (await fs.promises.access(tempPath).then(() => true).catch(() => false)) {
        await fs.promises.unlink(tempPath);
        console.log(`🧹 Temporary file cleaned up: ${tempPath}`);
      }
    } catch (cleanupError) {
      console.warn('Warning: Could not clean up temporary file:', tempPath, cleanupError);
    }

    console.log(`🎬 Video thumbnail created: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('Error processing video thumbnail:', error);
    throw new Error(`Failed to process video thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractVideoFrame(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎬 Starting FFmpeg extraction: ${CONFIG.FFMPEG_PATH}`);
    console.log(`📁 Input: ${inputPath}`);
    console.log(`📁 Output: ${outputPath}`);

    const ffmpegArgs = [
      '-i', inputPath,
      '-ss', CONFIG.VIDEO_THUMBNAIL_TIME,
      '-vframes', '1',
      '-f', 'image2',  // Force image2 format
      '-y', // Overwrite output file
      outputPath
    ];

    console.log(`🔧 FFmpeg command: ${CONFIG.FFMPEG_PATH} ${ffmpegArgs.join(' ')}`);

    const ffmpeg = spawn(CONFIG.FFMPEG_PATH, ffmpegArgs);

    let stderr = '';
    let stdout = '';

    ffmpeg.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      console.log(`🎬 FFmpeg process finished with code: ${code}`);
      if (stderr) console.log(`FFmpeg stderr: ${stderr}`);
      if (stdout) console.log(`FFmpeg stdout: ${stdout}`);

      if (code === 0) {
        console.log(`✅ FFmpeg extraction successful: ${outputPath}`);
        resolve();
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      console.error(`❌ FFmpeg spawn error:`, error);
      reject(new Error(`FFmpeg spawn error: ${error.message}. Make sure FFmpeg is installed and accessible.`));
    });

    // Set timeout for FFmpeg process
    const timeoutId = setTimeout(() => {
      console.log(`⏰ FFmpeg process timed out, killing...`);
      ffmpeg.kill('SIGKILL');
      reject(new Error('FFmpeg process timed out after 60 seconds'));
    }, 60000); // 60 second timeout for video processing

    // Clear timeout if process completes normally
    ffmpeg.on('close', () => clearTimeout(timeoutId));
  });
}

async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}
