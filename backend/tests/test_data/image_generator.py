#!/usr/bin/env python3
"""
Image Generator for OCR Testing
Provides utilities to generate test images with various characteristics
"""

import base64
import io
import random
import string
from typing import Dict, List, Tuple, Optional, Union
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import numpy as np

class ImageGenerator:
    """Generates test images for OCR testing with various characteristics"""
    
    def __init__(self):
        self.default_font_size = 20
        self.default_width = 400
        self.default_height = 200
        
    def create_text_image(
        self,
        text: str,
        width: int = None,
        height: int = None,
        font_size: int = None,
        background_color: Union[str, Tuple[int, int, int]] = "white",
        text_color: Union[str, Tuple[int, int, int]] = "black",
        font_family: str = None,
        alignment: str = "center"
    ) -> Image.Image:
        """Create an image with specified text
        
        Args:
            text: Text to render
            width: Image width (default: 400)
            height: Image height (default: 200)
            font_size: Font size (default: 20)
            background_color: Background color
            text_color: Text color
            font_family: Font family name
            alignment: Text alignment ('left', 'center', 'right')
            
        Returns:
            PIL Image with rendered text
        """
        width = width or self.default_width
        height = height or self.default_height
        font_size = font_size or self.default_font_size
        
        # Create image
        img = Image.new('RGB', (width, height), color=background_color)
        draw = ImageDraw.Draw(img)
        
        # Load font
        font = self._get_font(font_family, font_size)
        
        # Calculate text position
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        if alignment == "center":
            x = (width - text_width) // 2
        elif alignment == "right":
            x = width - text_width - 10
        else:  # left
            x = 10
            
        y = (height - text_height) // 2
        
        # Draw text
        draw.text((x, y), text, fill=text_color, font=font)
        
        return img
    
    def create_multiline_text_image(
        self,
        lines: List[str],
        width: int = None,
        height: int = None,
        font_size: int = None,
        line_spacing: int = 5,
        **kwargs
    ) -> Image.Image:
        """Create an image with multiple lines of text
        
        Args:
            lines: List of text lines
            width: Image width
            height: Image height
            font_size: Font size
            line_spacing: Spacing between lines
            **kwargs: Additional arguments for create_text_image
            
        Returns:
            PIL Image with multiline text
        """
        width = width or self.default_width
        height = height or self.default_height
        font_size = font_size or self.default_font_size
        
        background_color = kwargs.get('background_color', 'white')
        text_color = kwargs.get('text_color', 'black')
        font_family = kwargs.get('font_family')
        
        # Create image
        img = Image.new('RGB', (width, height), color=background_color)
        draw = ImageDraw.Draw(img)
        
        # Load font
        font = self._get_font(font_family, font_size)
        
        # Calculate total text height
        total_height = 0
        line_heights = []
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_height = bbox[3] - bbox[1]
            line_heights.append(line_height)
            total_height += line_height
        
        total_height += line_spacing * (len(lines) - 1)
        
        # Start position
        start_y = (height - total_height) // 2
        current_y = start_y
        
        # Draw each line
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            
            draw.text((x, current_y), line, fill=text_color, font=font)
            current_y += line_heights[i] + line_spacing
        
        return img
    
    def create_noisy_image(
        self,
        text: str,
        noise_level: float = 0.1,
        blur_radius: float = 0.5,
        **kwargs
    ) -> Image.Image:
        """Create an image with noise and blur to test OCR robustness
        
        Args:
            text: Text to render
            noise_level: Amount of noise (0.0 to 1.0)
            blur_radius: Blur radius
            **kwargs: Additional arguments for create_text_image
            
        Returns:
            PIL Image with noise and blur
        """
        # Create base image
        img = self.create_text_image(text, **kwargs)
        
        # Add noise
        if noise_level > 0:
            img = self._add_noise(img, noise_level)
        
        # Add blur
        if blur_radius > 0:
            img = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
        
        return img
    
    def create_rotated_image(
        self,
        text: str,
        angle: float,
        expand: bool = True,
        **kwargs
    ) -> Image.Image:
        """Create a rotated text image
        
        Args:
            text: Text to render
            angle: Rotation angle in degrees
            expand: Whether to expand image to fit rotated content
            **kwargs: Additional arguments for create_text_image
            
        Returns:
            Rotated PIL Image
        """
        img = self.create_text_image(text, **kwargs)
        return img.rotate(angle, expand=expand, fillcolor='white')
    
    def create_skewed_image(
        self,
        text: str,
        skew_x: float = 0,
        skew_y: float = 0,
        **kwargs
    ) -> Image.Image:
        """Create a skewed text image
        
        Args:
            text: Text to render
            skew_x: Horizontal skew factor
            skew_y: Vertical skew factor
            **kwargs: Additional arguments for create_text_image
            
        Returns:
            Skewed PIL Image
        """
        img = self.create_text_image(text, **kwargs)
        
        # Apply skew transformation
        width, height = img.size
        transform_matrix = (
            1, skew_x, 0,
            skew_y, 1, 0
        )
        
        return img.transform(
            (width, height),
            Image.AFFINE,
            transform_matrix,
            fillcolor='white'
        )
    
    def create_contrast_variations(
        self,
        text: str,
        contrast_levels: List[float] = None,
        **kwargs
    ) -> List[Image.Image]:
        """Create images with different contrast levels
        
        Args:
            text: Text to render
            contrast_levels: List of contrast factors (1.0 = normal)
            **kwargs: Additional arguments for create_text_image
            
        Returns:
            List of images with different contrast levels
        """
        if contrast_levels is None:
            contrast_levels = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0]
        
        base_img = self.create_text_image(text, **kwargs)
        images = []
        
        for contrast in contrast_levels:
            enhancer = ImageEnhance.Contrast(base_img)
            enhanced_img = enhancer.enhance(contrast)
            images.append(enhanced_img)
        
        return images
    
    def create_brightness_variations(
        self,
        text: str,
        brightness_levels: List[float] = None,
        **kwargs
    ) -> List[Image.Image]:
        """Create images with different brightness levels
        
        Args:
            text: Text to render
            brightness_levels: List of brightness factors (1.0 = normal)
            **kwargs: Additional arguments for create_text_image
            
        Returns:
            List of images with different brightness levels
        """
        if brightness_levels is None:
            brightness_levels = [0.3, 0.6, 0.8, 1.0, 1.2, 1.5]
        
        base_img = self.create_text_image(text, **kwargs)
        images = []
        
        for brightness in brightness_levels:
            enhancer = ImageEnhance.Brightness(base_img)
            enhanced_img = enhancer.enhance(brightness)
            images.append(enhanced_img)
        
        return images
    
    def create_font_size_variations(
        self,
        text: str,
        font_sizes: List[int] = None,
        **kwargs
    ) -> List[Image.Image]:
        """Create images with different font sizes
        
        Args:
            text: Text to render
            font_sizes: List of font sizes
            **kwargs: Additional arguments for create_text_image
            
        Returns:
            List of images with different font sizes
        """
        if font_sizes is None:
            font_sizes = [10, 12, 16, 20, 24, 32, 48]
        
        images = []
        for size in font_sizes:
            img = self.create_text_image(text, font_size=size, **kwargs)
            images.append(img)
        
        return images
    
    def create_random_text_image(
        self,
        length: int = 10,
        character_set: str = None,
        **kwargs
    ) -> Tuple[Image.Image, str]:
        """Create an image with random text
        
        Args:
            length: Length of random text
            character_set: Characters to choose from
            **kwargs: Additional arguments for create_text_image
            
        Returns:
            Tuple of (PIL Image, generated text)
        """
        if character_set is None:
            character_set = string.ascii_letters + string.digits + ' '
        
        text = ''.join(random.choices(character_set, k=length))
        img = self.create_text_image(text, **kwargs)
        
        return img, text
    
    def create_table_image(
        self,
        data: List[List[str]],
        cell_width: int = 100,
        cell_height: int = 30,
        border_width: int = 1,
        **kwargs
    ) -> Image.Image:
        """Create an image of a table
        
        Args:
            data: 2D list of cell contents
            cell_width: Width of each cell
            cell_height: Height of each cell
            border_width: Width of cell borders
            **kwargs: Additional styling arguments
            
        Returns:
            PIL Image of the table
        """
        rows = len(data)
        cols = len(data[0]) if data else 0
        
        width = cols * cell_width + (cols + 1) * border_width
        height = rows * cell_height + (rows + 1) * border_width
        
        background_color = kwargs.get('background_color', 'white')
        text_color = kwargs.get('text_color', 'black')
        border_color = kwargs.get('border_color', 'black')
        font_size = kwargs.get('font_size', 12)
        
        # Create image
        img = Image.new('RGB', (width, height), color=background_color)
        draw = ImageDraw.Draw(img)
        
        # Load font
        font = self._get_font(None, font_size)
        
        # Draw borders
        for i in range(rows + 1):
            y = i * (cell_height + border_width)
            draw.rectangle(
                [(0, y), (width, y + border_width)],
                fill=border_color
            )
        
        for j in range(cols + 1):
            x = j * (cell_width + border_width)
            draw.rectangle(
                [(x, 0), (x + border_width, height)],
                fill=border_color
            )
        
        # Draw cell contents
        for i, row in enumerate(data):
            for j, cell_text in enumerate(row):
                if cell_text:
                    cell_x = j * (cell_width + border_width) + border_width
                    cell_y = i * (cell_height + border_width) + border_width
                    
                    # Calculate text position within cell
                    bbox = draw.textbbox((0, 0), cell_text, font=font)
                    text_width = bbox[2] - bbox[0]
                    text_height = bbox[3] - bbox[1]
                    
                    text_x = cell_x + (cell_width - text_width) // 2
                    text_y = cell_y + (cell_height - text_height) // 2
                    
                    draw.text((text_x, text_y), cell_text, fill=text_color, font=font)
        
        return img
    
    def create_document_image(
        self,
        title: str,
        paragraphs: List[str],
        width: int = 600,
        height: int = 800,
        margin: int = 50,
        **kwargs
    ) -> Image.Image:
        """Create a document-style image with title and paragraphs
        
        Args:
            title: Document title
            paragraphs: List of paragraph texts
            width: Image width
            height: Image height
            margin: Margin around content
            **kwargs: Additional styling arguments
            
        Returns:
            PIL Image of the document
        """
        background_color = kwargs.get('background_color', 'white')
        text_color = kwargs.get('text_color', 'black')
        title_font_size = kwargs.get('title_font_size', 24)
        body_font_size = kwargs.get('body_font_size', 12)
        line_spacing = kwargs.get('line_spacing', 5)
        
        # Create image
        img = Image.new('RGB', (width, height), color=background_color)
        draw = ImageDraw.Draw(img)
        
        # Load fonts
        title_font = self._get_font(None, title_font_size)
        body_font = self._get_font(None, body_font_size)
        
        current_y = margin
        
        # Draw title
        if title:
            bbox = draw.textbbox((0, 0), title, font=title_font)
            title_width = bbox[2] - bbox[0]
            title_height = bbox[3] - bbox[1]
            
            title_x = (width - title_width) // 2
            draw.text((title_x, current_y), title, fill=text_color, font=title_font)
            current_y += title_height + line_spacing * 3
        
        # Draw paragraphs
        for paragraph in paragraphs:
            if current_y >= height - margin:
                break
                
            # Word wrap the paragraph
            words = paragraph.split()
            lines = []
            current_line = ""
            
            for word in words:
                test_line = current_line + (" " if current_line else "") + word
                bbox = draw.textbbox((0, 0), test_line, font=body_font)
                test_width = bbox[2] - bbox[0]
                
                if test_width <= width - 2 * margin:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                        current_line = word
                    else:
                        lines.append(word)
            
            if current_line:
                lines.append(current_line)
            
            # Draw the lines
            for line in lines:
                if current_y >= height - margin:
                    break
                    
                draw.text((margin, current_y), line, fill=text_color, font=body_font)
                bbox = draw.textbbox((0, 0), line, font=body_font)
                line_height = bbox[3] - bbox[1]
                current_y += line_height + line_spacing
            
            current_y += line_spacing * 2  # Extra space between paragraphs
        
        return img
    
    def _get_font(self, font_family: str = None, font_size: int = 20) -> ImageFont.ImageFont:
        """Get font object, with fallback to default"""
        try:
            if font_family:
                return ImageFont.truetype(font_family, font_size)
            else:
                return ImageFont.load_default()
        except (OSError, IOError):
            return ImageFont.load_default()
    
    def _add_noise(self, img: Image.Image, noise_level: float) -> Image.Image:
        """Add random noise to image"""
        img_array = np.array(img)
        noise = np.random.randint(
            -int(255 * noise_level),
            int(255 * noise_level),
            img_array.shape,
            dtype=np.int16
        )
        
        noisy_array = img_array.astype(np.int16) + noise
        noisy_array = np.clip(noisy_array, 0, 255).astype(np.uint8)
        
        return Image.fromarray(noisy_array)
    
    @staticmethod
    def image_to_base64(img: Image.Image, format: str = 'PNG') -> str:
        """Convert PIL image to base64 string"""
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    @staticmethod
    def save_image(img: Image.Image, filepath: str, format: str = None) -> None:
        """Save PIL image to file"""
        if format:
            img.save(filepath, format=format)
        else:
            img.save(filepath)

# Convenience functions for common test scenarios
def create_simple_test_image(text: str = "Test Text") -> Image.Image:
    """Create a simple test image with default settings"""
    generator = ImageGenerator()
    return generator.create_text_image(text)

def create_multilingual_images(texts: Dict[str, str]) -> Dict[str, Image.Image]:
    """Create images for multiple languages"""
    generator = ImageGenerator()
    images = {}
    
    for lang, text in texts.items():
        images[lang] = generator.create_text_image(text)
    
    return images

def create_test_suite_images() -> Dict[str, Image.Image]:
    """Create a comprehensive suite of test images"""
    generator = ImageGenerator()
    images = {}
    
    # Basic text
    images['basic'] = generator.create_text_image("Hello World")
    
    # Different sizes
    images['small_text'] = generator.create_text_image("Small", font_size=10)
    images['large_text'] = generator.create_text_image("Large", font_size=48)
    
    # Different colors
    images['white_on_black'] = generator.create_text_image(
        "White on Black", background_color='black', text_color='white'
    )
    
    # Noisy image
    images['noisy'] = generator.create_noisy_image("Noisy Text", noise_level=0.2)
    
    # Rotated image
    images['rotated'] = generator.create_rotated_image("Rotated", angle=15)
    
    # Multiline
    images['multiline'] = generator.create_multiline_text_image([
        "Line One",
        "Line Two",
        "Line Three"
    ])
    
    # Table
    images['table'] = generator.create_table_image([
        ["Name", "Age", "City"],
        ["John", "25", "NYC"],
        ["Jane", "30", "LA"]
    ])
    
    return images