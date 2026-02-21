"""
Video Processor for Desktop Session Recording

Accumulates frames from the desktop stream and encodes them into video files
for later analysis with VideoSurfer.

Usage:
    processor = VideoProcessor(output_dir="recordings")
    await processor.start_recording("session_001")
    # ... frames arrive via add_frame() ...
    video_path = await processor.stop_recording()
"""

import asyncio
import io
import os
import time
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class FrameData:
    """Single frame with metadata."""
    data: bytes  # Raw image bytes (PNG/JPEG)
    timestamp: float  # Unix timestamp
    monitor_id: int = 0
    frame_number: int = 0


@dataclass
class RecordingSession:
    """Metadata for a recording session."""
    filename: str
    start_time: float
    end_time: Optional[float] = None
    frame_count: int = 0
    output_path: Optional[str] = None
    status: str = "recording"  # recording, encoding, completed, failed
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class VideoProcessor:
    """
    Accumulates frames from desktop stream and exports to video file.

    Features:
    - Async frame accumulation during recording
    - Configurable codec and quality settings
    - Multi-monitor support (records from specified monitor)
    - Metadata preservation for analysis
    """

    def __init__(
        self,
        output_dir: str = "recordings",
        codec: str = "libx264",
        fps: int = 10,
        quality: int = 23,  # CRF value for x264 (lower = better, 18-28 typical)
        max_frames: int = 10000,  # Safety limit
    ):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.codec = codec
        self.fps = fps
        self.quality = quality
        self.max_frames = max_frames

        # Recording state
        self.frames: List[FrameData] = []
        self.current_session: Optional[RecordingSession] = None
        self.recording = False
        self._lock = asyncio.Lock()

        # Session history
        self.sessions: Dict[str, RecordingSession] = {}

    async def start_recording(
        self,
        filename: str,
        monitor_id: int = 0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RecordingSession:
        """
        Start recording frames to a new session.

        Args:
            filename: Base filename (without extension)
            monitor_id: Which monitor to record (0 = primary)
            metadata: Optional metadata to attach to recording

        Returns:
            RecordingSession with recording details
        """
        async with self._lock:
            if self.recording:
                raise RuntimeError("Recording already in progress")

            # Clean filename
            safe_filename = "".join(c for c in filename if c.isalnum() or c in "-_")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            full_filename = f"{safe_filename}_{timestamp}"

            self.current_session = RecordingSession(
                filename=full_filename,
                start_time=time.time(),
                metadata=metadata or {"monitor_id": monitor_id}
            )
            self.frames = []
            self.recording = True

            self.sessions[full_filename] = self.current_session
            logger.info(f"Started recording: {full_filename}")

            return self.current_session

    async def add_frame(
        self,
        frame_data: bytes,
        timestamp: Optional[float] = None,
        monitor_id: int = 0
    ) -> bool:
        """
        Add a frame to the current recording.

        Args:
            frame_data: Raw image bytes (PNG or JPEG)
            timestamp: Frame timestamp (defaults to now)
            monitor_id: Source monitor ID

        Returns:
            True if frame was added, False if not recording or limit reached
        """
        if not self.recording:
            return False

        if len(self.frames) >= self.max_frames:
            logger.warning(f"Max frames ({self.max_frames}) reached")
            return False

        frame = FrameData(
            data=frame_data,
            timestamp=timestamp or time.time(),
            monitor_id=monitor_id,
            frame_number=len(self.frames)
        )

        self.frames.append(frame)

        if self.current_session:
            self.current_session.frame_count = len(self.frames)

        return True

    async def stop_recording(self) -> Optional[str]:
        """
        Stop recording and encode frames to video file.

        Returns:
            Path to the encoded video file, or None on failure
        """
        async with self._lock:
            if not self.recording or not self.current_session:
                return None

            self.recording = False
            self.current_session.end_time = time.time()
            self.current_session.status = "encoding"

            if len(self.frames) == 0:
                self.current_session.status = "failed"
                self.current_session.error = "No frames captured"
                logger.warning("No frames to encode")
                return None

            try:
                output_path = await self._encode_video()
                self.current_session.output_path = output_path
                self.current_session.status = "completed"
                logger.info(f"Recording completed: {output_path}")
                return output_path

            except Exception as e:
                self.current_session.status = "failed"
                self.current_session.error = str(e)
                logger.error(f"Encoding failed: {e}")
                return None

    async def _encode_video(self) -> str:
        """Encode accumulated frames to video file using PyAV."""
        import av

        output_path = self.output_dir / f"{self.current_session.filename}.mp4"

        # Get frame dimensions from first frame
        first_frame = self.frames[0]
        img = Image.open(io.BytesIO(first_frame.data))
        width, height = img.size

        # Ensure even dimensions (required by most codecs)
        width = width if width % 2 == 0 else width - 1
        height = height if height % 2 == 0 else height - 1

        # Create output container
        container = av.open(str(output_path), mode='w')
        stream = container.add_stream(self.codec, rate=self.fps)
        stream.width = width
        stream.height = height
        stream.pix_fmt = 'yuv420p'

        # Set quality (CRF for x264)
        if self.codec == 'libx264':
            stream.options = {'crf': str(self.quality)}

        # Encode frames
        for frame_data in self.frames:
            img = Image.open(io.BytesIO(frame_data.data))
            img = img.convert('RGB')
            img = img.resize((width, height))

            frame = av.VideoFrame.from_image(img)
            for packet in stream.encode(frame):
                container.mux(packet)

        # Flush encoder
        for packet in stream.encode():
            container.mux(packet)

        container.close()

        # Save metadata alongside video
        await self._save_metadata(output_path)

        return str(output_path)

    async def _save_metadata(self, video_path: str) -> None:
        """Save recording metadata to JSON file."""
        import json

        metadata_path = Path(video_path).with_suffix('.json')

        metadata = {
            "filename": self.current_session.filename,
            "video_path": str(video_path),
            "start_time": self.current_session.start_time,
            "end_time": self.current_session.end_time,
            "duration_seconds": self.current_session.end_time - self.current_session.start_time,
            "frame_count": self.current_session.frame_count,
            "fps": self.fps,
            "codec": self.codec,
            "quality": self.quality,
            "custom_metadata": self.current_session.metadata
        }

        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

    def get_recording_status(self) -> Dict[str, Any]:
        """Get current recording status."""
        return {
            "recording": self.recording,
            "current_session": {
                "filename": self.current_session.filename if self.current_session else None,
                "frame_count": len(self.frames),
                "duration": time.time() - self.current_session.start_time if self.current_session else 0,
                "status": self.current_session.status if self.current_session else None
            } if self.current_session else None
        }

    def list_recordings(self) -> List[Dict[str, Any]]:
        """List all recording sessions."""
        recordings = []

        for session in self.sessions.values():
            recordings.append({
                "filename": session.filename,
                "status": session.status,
                "frame_count": session.frame_count,
                "output_path": session.output_path,
                "duration": (session.end_time - session.start_time) if session.end_time else None,
                "error": session.error
            })

        # Also scan output directory for existing files
        for video_file in self.output_dir.glob("*.mp4"):
            filename = video_file.stem
            if filename not in self.sessions:
                metadata_file = video_file.with_suffix('.json')
                if metadata_file.exists():
                    import json
                    with open(metadata_file) as f:
                        meta = json.load(f)
                    recordings.append({
                        "filename": filename,
                        "status": "completed",
                        "frame_count": meta.get("frame_count"),
                        "output_path": str(video_file),
                        "duration": meta.get("duration_seconds"),
                        "error": None
                    })
                else:
                    recordings.append({
                        "filename": filename,
                        "status": "completed",
                        "output_path": str(video_file),
                        "error": None
                    })

        return recordings


# Singleton instance
_video_processor: Optional[VideoProcessor] = None


def get_video_processor(output_dir: str = "recordings") -> VideoProcessor:
    """Get or create the video processor singleton."""
    global _video_processor
    if _video_processor is None:
        _video_processor = VideoProcessor(output_dir=output_dir)
    return _video_processor
