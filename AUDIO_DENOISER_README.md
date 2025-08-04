# Audio Denoiser and Enhancer for Video Transcription

A powerful command-line tool that extracts, denoises, and enhances audio from video files to improve AI transcription accuracy.

## Features

- **Video Audio Extraction**: Automatically extracts audio from common video formats (MP4, AVI, MOV, MKV, etc.)
- **AI-Based Noise Reduction**: Uses advanced machine learning algorithms to remove background noise
- **Speech Enhancement**: Applies EQ and compression optimized for human speech
- **Multiple Processing Modes**: Choose between fast (Sox-only) or thorough (AI-enhanced) processing
- **Free and Open Source**: No subscription or API keys required

## Installation

The tool has been installed on your system with the following components:

1. **Sox** - Sound processing tool (installed via Homebrew)
2. **Python libraries** - AI-based audio processing libraries:
   - noisereduce - AI noise reduction
   - librosa - Audio analysis and processing
   - scipy - Signal processing
   - pydub - Audio manipulation
   - soundfile - Audio I/O

## Usage

### Basic Usage

To denoise a video or audio file:

```bash
./denoise input_video.mp4
```

This will create a file named `input_video_denoised.wav` with cleaned audio.

### Command Options

```bash
./denoise [OPTIONS] input_file

Options:
  -o, --output FILE     Specify output filename (default: input_denoised.wav)
  -a, --aggressive      Use aggressive noise reduction (may affect voice quality)
  -s, --sox-only       Use only Sox for faster but less effective denoising
  -h, --help           Show help message
```

### Examples

1. **Basic video denoising:**
   ```bash
   ./denoise my_video.mp4
   ```

2. **Specify output file:**
   ```bash
   ./denoise my_video.mp4 -o clean_audio.wav
   ```

3. **Aggressive noise reduction for very noisy videos:**
   ```bash
   ./denoise noisy_video.mp4 -a
   ```

4. **Fast processing using Sox only:**
   ```bash
   ./denoise my_video.mp4 -s
   ```

## How It Works

The denoiser applies multiple stages of audio processing:

1. **Audio Extraction**: Extracts audio from video files at 44.1kHz mono
2. **Sox Pre-processing**: Initial noise reduction using spectral analysis
3. **AI Noise Reduction**: Machine learning-based stationary noise removal
4. **Low-Frequency Filtering**: Removes rumble and low-frequency noise
5. **Speech Enhancement**: Boosts speech frequencies (1-4 kHz)
6. **Dynamic Range Compression**: Normalizes volume levels
7. **Final Limiting**: Prevents clipping and distortion

## Transcription Workflow

After denoising your audio, you can use the clean audio file with any transcription service:

1. **Online Services** (free tiers available):
   - Google Cloud Speech-to-Text
   - AWS Transcribe
   - Azure Speech Services
   - AssemblyAI

2. **Local/Offline Tools**:
   - OpenAI Whisper (can be installed separately)
   - Mozilla DeepSpeech
   - Vosk

3. **Built-in macOS**:
   - You can use macOS's built-in dictation features with the cleaned audio

## Tips for Best Results

1. **Noise Profile**: The tool analyzes the first 0.5 seconds for noise profiling. Ensure this section contains typical background noise but no speech.

2. **Audio Quality**: While the tool can significantly improve audio quality, extremely poor recordings may still be challenging for transcription.

3. **Processing Time**: AI-enhanced processing takes longer but provides better results. Use `-s` flag for faster processing when needed.

4. **File Formats**: The tool outputs WAV files for maximum compatibility with transcription services.

## Troubleshooting

- **"Command not found"**: Make sure you're in the correct directory or add the script to your PATH
- **Python errors**: Ensure Python 3.12+ is installed and packages are up to date
- **Memory issues**: For very long videos, consider splitting them into smaller segments

## Technical Details

- **Input Formats**: MP4, AVI, MOV, MKV, FLV, WMV, M4V, WAV, MP3, M4A, etc.
- **Output Format**: WAV (PCM 16-bit)
- **Sample Rate**: Preserves original or standardizes to 44.1kHz
- **Processing**: Mono audio (combines stereo to mono for speech optimization)

## Future Enhancements

Potential improvements that could be added:
- Batch processing for multiple files
- GPU acceleration for faster processing
- Real-time processing mode
- Custom noise profiles for specific environments
- Integration with transcription APIs

---

For issues or questions, the tool provides detailed console output to help diagnose any problems.
