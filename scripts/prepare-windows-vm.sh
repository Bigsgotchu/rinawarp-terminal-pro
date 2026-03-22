#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ISO_DIR="${HOME}/Downloads/isos"
VM_DIR="${HOME}/Documents/vms"
VM_NAME="${1:-rinawarp-cleanwindows}"
ISO_PATH="${ISO_DIR}/Win11_English_x64.iso"

if [[ ! -f "${ISO_PATH}" ]]; then
  cat <<EOF
[prepare:windows-vm] Missing Windows ISO:
  ${ISO_PATH}

Manual step:
1. Download the official Windows 11 x64 ISO from Microsoft.
2. Save it exactly as:
   ${ISO_PATH}
3. Re-run:
   bash ${ROOT_DIR}/scripts/prepare-windows-vm.sh ${VM_NAME}

After the ISO is present, this script will create the VirtualBox VM scaffold so clean-machine Windows validation can continue immediately.
EOF
  exit 2
fi

mkdir -p "${VM_DIR}"

if VBoxManage list runningvms | grep -q "\"${VM_NAME}\""; then
  VBoxManage controlvm "${VM_NAME}" poweroff >/dev/null 2>&1 || true
  sleep 3
fi

if VBoxManage list vms | grep -q "\"${VM_NAME}\""; then
  VBoxManage unregistervm "${VM_NAME}" --delete >/dev/null 2>&1 || true
fi

VBoxManage createvm --name "${VM_NAME}" --ostype Windows11_64 --basefolder "${VM_DIR}" --register
VBoxManage modifyvm "${VM_NAME}" \
  --memory 8192 \
  --cpus 4 \
  --vram 128 \
  --graphicscontroller vmsvga \
  --firmware efi \
  --chipset ich9 \
  --audio-enabled off \
  --usb off \
  --nic1 nat

VBoxManage createmedium disk --filename "${VM_DIR}/${VM_NAME}/${VM_NAME}.vdi" --size 65536 --format VDI
VBoxManage storagectl "${VM_NAME}" --name "SATA Controller" --add sata --controller IntelAhci
VBoxManage storageattach "${VM_NAME}" --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium "${VM_DIR}/${VM_NAME}/${VM_NAME}.vdi"
VBoxManage storageattach "${VM_NAME}" --storagectl "SATA Controller" --port 1 --device 0 --type dvddrive --medium "${ISO_PATH}"

cat <<EOF
[prepare:windows-vm] VM scaffold created successfully.
VM name: ${VM_NAME}
ISO:     ${ISO_PATH}

Next step:
  VBoxManage startvm "${VM_NAME}" --type gui

Then complete Windows setup in the VM and I can continue with:
- public Windows download validation
- installer run
- installed app smoke
- updater behavior checks
EOF
