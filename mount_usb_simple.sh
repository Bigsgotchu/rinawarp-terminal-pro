#!/bin/bash
# Simple USB Mount Script
# Run this AFTER connecting your USB device

echo "Checking for USB storage devices..."
echo ""

# List all block devices (excluding NVMe)
lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINT,MODEL,SERIAL | grep -v "^NAME" | grep -v "nvme"

echo ""
echo "========================================"
echo ""

# Find unmounted USB devices
unmounted=$(lsblk -lno NAME,MOUNTPOINT | grep -v "^NAME" | grep -v "^" | grep -v "\/" | awk '{print $1}')

if [ -z "$unmounted" ]; then
    echo "No unmounted USB devices found."
    echo "All USB devices appear to be already mounted."
    exit 1
fi

echo "Found unmounted USB device(s):"
for dev in $unmounted; do
    echo "  /dev/$dev"
done

echo ""
echo "========================================"
echo ""

# Use the first unmounted device
first_dev=$(echo "$unmounted" | head -1)
device="/dev/$first_dev"

# Create mount point
mkdir -p /mnt/usb
echo "Mounting $device to /mnt/usb..."

if mount "$device" /mnt/usb; then
    echo "SUCCESS! Device mounted at /mnt/usb"
    echo ""
    echo "Device details:"
    lsblk -o NAME,SIZE,FSTYPE,LABEL,MODEL,SERIAL "$device" | grep -v "^NAME"
    echo ""
    echo "Access your files at: /mnt/usb"
    echo ""
    echo "To unmount when done: sudo umount /mnt/usb"
else
    echo "ERROR: Failed to mount device"
    echo ""
    echo "Trying to identify the issue..."
    echo ""
    echo "Filesystem type:"
    blkid "$device"
    echo ""
    echo "You may need to manually mount with specific options."
    echo "Example: mount -t vfat -o uid=\$USER,gid=\$USER $device /mnt/usb"
fi
