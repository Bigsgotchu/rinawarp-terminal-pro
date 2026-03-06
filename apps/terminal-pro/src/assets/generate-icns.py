#!/usr/bin/env python3
"""
RinaWarp ICNS Generator for macOS
Run this script on macOS to generate the .icns file required for Electron builds.
Requires: pip install pillow
Usage: python3 generate-icns.py
"""

import struct
import sys
from pathlib import Path

def write_icns(filepath, sizes=[16, 32, 64, 128, 256, 512, 1024]):
    """Generate an ICNS file from PNG images."""
    from PIL import Image
    
    icns_path = Path(filepath)
    png_files = list(icns_path.parent.glob("icon-*.png"))
    
    # Create temp directory for processing
    temp_dir = Path("/tmp/icns_temp")
    temp_dir.mkdir(exist_ok=True)
    
    icns_data = b''
    
    # ICNS header
    icns_data += b'icns'
    icns_data += struct.pack('>I', 0)  # Placeholder for size
    
    for size in sizes:
        # Try to find matching PNG
        png_file = icns_path.parent / f"icon-{size}.png"
        if not png_file.exists():
            # Try larger and scale down
            for s in reversed(sizes):
                larger = icns_path.parent / f"icon-{s}.png"
                if larger.exists():
                    img = Image.open(larger)
                    img = img.resize((size, size), Image.Resampling.LANCZOS)
                    img.save(png_file, "PNG")
                    png_file = None
                    break
            if png_file is None:
                continue
        
        # Read PNG and create icon data
        img = Image.open(png_file)
        img = img.convert("RGBA")
        
        # Create icon element
        icon_type = f'icon_{size}x{size}'
        if size >= 256:
            icon_type = f'icon_{size}x{size}@2'
        
        # Convert to raw bytes
        data = img.tobytes()
        
        # ICNS chunk
        icns_data += icon_type.encode('latin-1')
        icns_data += struct.pack('>I', len(data) + 8)
        icns_data += data
    
    # Update header size
    icns_data = b'icns' + struct.pack('>I', len(icns_data)) + icns_data[8:]
    
    # Write ICNS file
    with open(icns_path, 'wb') as f:
        f.write(icns_data)
    
    print(f"Created: {icns_path}")

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    icns_path = script_dir / "icon.icns"
    write_icns(icns_path)
    print(f"ICNS file generated at: {icns_path}")
