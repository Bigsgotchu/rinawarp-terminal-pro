#!/bin/bash
#!/usr/bin/env bash
# shellcheck shell=bash
# Verification script for RinaWarp Attestation Verifier
# Run this on your local machine with kubectl access to your EKS cluster

set -e

NAMESPACE="rinawarp-verifier"

echo "=== Step 1: Verify ghcr-creds secret exists ==="
kubectl -n "$NAMESPACE" get secret ghcr-creds

echo ""
echo "=== Step 2: Create manual verifier job ==="
JOB_NAME="verify-now-$(date +%s)"
kubectl -n "$NAMESPACE" create job --from=cronjob/rinawarp-attestation-verifier "$JOB_NAME"

echo ""
echo "=== Step 3: Check recent jobs ==="
kubectl -n "$NAMESPACE" get jobs --sort-by=.metadata.creationTimestamp | tail -n 5

echo ""
echo "=== Step 4: Check recent pods ==="
kubectl -n "$NAMESPACE" get pods --sort-by=.metadata.creationTimestamp | tail -n 5

echo ""
echo "=== Step 5: Get job logs (wait for completion first) ==="
echo "Waiting for job to complete..."
kubectl -n "$NAMESPACE" wait --for=condition=complete "job/$JOB_NAME" --timeout=300s || true

echo "Fetching logs..."
kubectl -n "$NAMESPACE" logs "job/$JOB_NAME" --all-containers=true

echo ""
echo "=== Verification Complete ==="
