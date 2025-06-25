#!/bin/bash

# This script provisions a new MongoDB Atlas cluster using the Atlas CLI.
# It creates an M10 tier cluster, which is recommended for Vector Search.
#
# Usage:
# ./scripts/provision-atlas.sh <project_id> <cluster_name>
#
# Prerequisites:
# - MongoDB Atlas CLI installed and configured
# - Authenticated to Atlas with organization and project access

set -e

PROJECT_ID=$1
CLUSTER_NAME=$2
REGION="US_EAST_1"
PROVIDER="AWS"
TIER="M10"

if [ -z "$PROJECT_ID" ] || [ -z "$CLUSTER_NAME" ]; then
  echo "Usage: $0 <project_id> <cluster_name>"
  exit 1
fi

echo "🚀 Provisioning MongoDB Atlas Cluster: $CLUSTER_NAME"
echo "--------------------------------------------------"
echo "Project ID: $PROJECT_ID"
echo "Cluster Name: $CLUSTER_NAME"
echo "Region: $REGION"
echo "Provider: $PROVIDER"
echo "Tier: $TIER"
echo "--------------------------------------------------"

atlas clusters create "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --provider "$PROVIDER" \
  --region "$REGION" \
  --tier "$TIER" \
  --diskSizeGB 40 \
  --mdbVersion 7.0 \
  --noBackup \
  --auditLog \
  --output json

echo "✅ Cluster '$CLUSTER_NAME' creation initiated."
echo "It may take a few minutes for the cluster to become available."
echo "--------------------------------------------------"

echo "🔍 To check the status of your cluster, run:"
echo "atlas clusters describe $CLUSTER_NAME --projectId $PROJECT_ID"
echo ""
echo "🔗 To get the connection string, run:"
echo "atlas clusters connectionStrings describe $CLUSTER_NAME --projectId $PROJECT_ID"
echo ""