#!/bin/bash
echo "Please connect your USB storage device now."
echo "I'll monitor for new devices for 30 seconds..."
echo ""

for i in {1..15}; do
    echo "Check $i - Waiting for USB device..."
    
    # Check for new USB devices (excluding known ones)
    lsusb 2>/dev/null | grep -v "Bus\|Device" | grep -v "1d6b:" | grep -v "062a:9013" | grep -v "04f2:b6c2" | grep -v "8087:0029"
    
    echo ""
    
    # Check for new storage devices (excluding NVMe)
    lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINT,MODEL,SERIAL 2>/dev/null | grep -v "^NAME" | grep -v "nvme"
    
    echo ""
    echo "Press Ctrl+C to stop monitoring or wait for device to appear..."
    echo ""
    sleep 2
done

echo "Monitoring complete."