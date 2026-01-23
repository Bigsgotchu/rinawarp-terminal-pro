#!/bin/bash

echo "USB Device Mount Assistant"
echo "================================"
echo ""
echo "Please connect your USB storage device now..."
echo ""

# Function to detect and mount USB devices
detect_and_mount() {
    # Get list of USB storage devices (excluding known non-storage USB devices)
    usb_devices=$(lsblk -d -o NAME,SIZE,MODEL,SERIAL -P | grep -v "NAME=\"nvme" | grep "SIZE=" | awk -F'"' '{print $2}' | grep -E "^sd")
    
    if [ -z "$usb_devices" ]; then
        echo "No USB storage devices detected yet..."
        return 1
    fi
    
    echo "Detected USB storage device(s):"
    lsblk -o NAME,SIZE,FSTYPE,LABEL,MODEL,SERIAL | grep -v "^NAME" | grep -v "nvme"
    echo ""
    
    # Find the first unmounted partition
    unmounted_part=$(lsblk -lno NAME,MOUNTPOINT | grep -v "^NAME" | grep -v "^" | grep -v "\/" | awk '{print $1}' | head -1)
    
    if [ -n "$unmounted_part" ]; then
        device="/dev/$unmounted_part"
        echo "Found unmounted partition: $device"
        
        # Create mount point
        mkdir -p /mnt/usb
        echo "Mount point created: /mnt/usb"
        
        # Try to mount
        if mount "$device" /mnt/usb; then
            echo ""
            echo "SUCCESS! Device mounted at /mnt/usb"
            echo ""
            echo "Device details:"
            lsblk -o NAME,SIZE,FSTYPE,LABEL,MODEL,SERIAL "$device" | grep -v "^NAME"
            echo ""
            echo "You can now access your files at: /mnt/usb"
            echo ""
            return 0
        else
            echo ""
            echo "ERROR: Failed to mount device"
            echo ""
            echo "Trying to identify filesystem..."
            blkid "$device"
            echo ""
            echo "You may need to manually mount with specific options."
            return 1
        fi
    else
        echo "All partitions appear to be already mounted."
        return 1
    fi
}

# Monitor for USB device connection
for i in {1..30}; do
    if detect_and_mount; then
        exit 0
    fi
    
    echo "Waiting for USB device... ($i/30)"
    sleep 2
    clear
    echo "USB Device Mount Assistant"
    echo "================================"
    echo ""
    echo "Please connect your USB storage device now..."
    echo ""
done

echo ""
echo "Timeout reached. No USB device detected."
echo "Please try again or check if the device is properly connected."
