"""
VideoSurfer Agent Wrapper

Provides a high-level interface to AutoGen's VideoSurfer agent for analyzing
recorded desktop sessions.

Usage:
    agent = VideoSurferAgent()
    result = await agent.analyze_video(
        video_path="recordings/session_001.mp4",
        question="What error messages appeared?"
    )
"""

import asyncio
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Try to import AutoGen VideoSurfer
try:
    from autogen_ext.agents.video_surfer import VideoSurfer
    from autogen_agentchat.messages import TextMessage
    from autogen_ext.models.openai import OpenAIChatCompletionClient
    HAS_VIDEO_SURFER = True
except ImportError:
    HAS_VIDEO_SURFER = False
    logger.warning("VideoSurfer not available. Install with: pip install 'autogen-ext[video-surfer]'")


class VideoSurferAgent:
    """
    Wrapper for AutoGen's VideoSurfer agent.

    Provides methods for:
    - Analyzing video content with natural language questions
    - Extracting transcriptions
    - Getting screenshots at specific timestamps
    - Listing video metadata
    """

    def __init__(
        self,
        model: str = "gpt-4o",
        api_key: Optional[str] = None
    ):
        """
        Initialize VideoSurfer agent.

        Args:
            model: OpenAI model to use (default: gpt-4o for vision)
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
        """
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self._agent: Optional[VideoSurfer] = None

    def is_available(self) -> bool:
        """Check if VideoSurfer is available."""
        return HAS_VIDEO_SURFER and self.api_key is not None

    async def _get_agent(self, video_path: str) -> Optional[VideoSurfer]:
        """Get or create VideoSurfer agent for a video."""
        if not self.is_available():
            return None

        # Validate video path
        if not Path(video_path).exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        # Create model client
        model_client = OpenAIChatCompletionClient(
            model=self.model,
            api_key=self.api_key
        )

        # Create VideoSurfer agent
        agent = VideoSurfer(
            name="video_analyzer",
            model_client=model_client,
            video_path=video_path
        )

        return agent

    async def analyze_video(
        self,
        video_path: str,
        question: str
    ) -> Dict[str, Any]:
        """
        Analyze a video with a natural language question.

        Args:
            video_path: Path to the video file
            question: Question about the video content

        Returns:
            Dict with answer and metadata
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "VideoSurfer not available. Check dependencies and API key."
            }

        try:
            agent = await self._get_agent(video_path)
            if not agent:
                return {"success": False, "error": "Failed to create agent"}

            # Create task message
            task = TextMessage(content=question, source="user")

            # Run agent
            response = await agent.on_messages([task], cancellation_token=None)

            return {
                "success": True,
                "video_path": video_path,
                "question": question,
                "answer": response.chat_message.content if response.chat_message else "No response",
                "inner_messages": [
                    {"content": str(msg), "type": type(msg).__name__}
                    for msg in (response.inner_messages or [])
                ]
            }

        except Exception as e:
            logger.error(f"Video analysis failed: {e}")
            return {
                "success": False,
                "video_path": video_path,
                "question": question,
                "error": str(e)
            }

    async def get_video_duration(self, video_path: str) -> Dict[str, Any]:
        """Get the duration of a video file."""
        try:
            import av
            container = av.open(video_path)
            duration = container.duration / 1000000.0  # Convert to seconds
            container.close()

            return {
                "success": True,
                "video_path": video_path,
                "duration_seconds": duration
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_screenshot(
        self,
        video_path: str,
        timestamp_seconds: float,
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract a screenshot from a video at a specific timestamp.

        Args:
            video_path: Path to the video file
            timestamp_seconds: Timestamp in seconds
            output_path: Optional path to save the screenshot

        Returns:
            Dict with screenshot data or path
        """
        try:
            import av
            from PIL import Image
            import io
            import base64

            container = av.open(video_path)
            stream = container.streams.video[0]

            # Seek to timestamp
            target_pts = int(timestamp_seconds * stream.time_base.denominator / stream.time_base.numerator)
            container.seek(target_pts, stream=stream)

            # Get frame
            for frame in container.decode(video=0):
                img = frame.to_image()

                if output_path:
                    img.save(output_path)
                    return {
                        "success": True,
                        "output_path": output_path,
                        "timestamp": timestamp_seconds
                    }
                else:
                    # Return as base64
                    buffer = io.BytesIO()
                    img.save(buffer, format='PNG')
                    base64_data = base64.b64encode(buffer.getvalue()).decode()

                    return {
                        "success": True,
                        "timestamp": timestamp_seconds,
                        "image_base64": base64_data,
                        "width": img.width,
                        "height": img.height
                    }

            container.close()
            return {"success": False, "error": "No frame found at timestamp"}

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def extract_frames(
        self,
        video_path: str,
        interval_seconds: float = 1.0,
        max_frames: int = 100
    ) -> Dict[str, Any]:
        """
        Extract frames at regular intervals from a video.

        Args:
            video_path: Path to the video file
            interval_seconds: Time between frames
            max_frames: Maximum number of frames to extract

        Returns:
            Dict with frame information
        """
        try:
            import av

            container = av.open(video_path)
            stream = container.streams.video[0]
            duration = container.duration / 1000000.0

            frames = []
            current_time = 0.0

            while current_time < duration and len(frames) < max_frames:
                result = await self.get_screenshot(video_path, current_time)
                if result.get("success"):
                    frames.append({
                        "timestamp": current_time,
                        "image_base64": result.get("image_base64")
                    })
                current_time += interval_seconds

            container.close()

            return {
                "success": True,
                "video_path": video_path,
                "frame_count": len(frames),
                "interval_seconds": interval_seconds,
                "frames": frames
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def batch_analyze(
        self,
        video_path: str,
        questions: List[str]
    ) -> Dict[str, Any]:
        """
        Analyze a video with multiple questions.

        Args:
            video_path: Path to the video file
            questions: List of questions to ask

        Returns:
            Dict with answers for each question
        """
        results = []

        for question in questions:
            result = await self.analyze_video(video_path, question)
            results.append({
                "question": question,
                "answer": result.get("answer"),
                "success": result.get("success"),
                "error": result.get("error")
            })

        return {
            "success": all(r["success"] for r in results),
            "video_path": video_path,
            "results": results
        }


# Singleton instance
_video_surfer_agent: Optional[VideoSurferAgent] = None


def get_video_surfer_agent() -> VideoSurferAgent:
    """Get or create the VideoSurfer agent singleton."""
    global _video_surfer_agent
    if _video_surfer_agent is None:
        _video_surfer_agent = VideoSurferAgent()
    return _video_surfer_agent
