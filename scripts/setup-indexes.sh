#!/bin/bash

# This script creates the Atlas Search indexes for the MongoDB AI Agent Boilerplate.
# It should be run after the Atlas cluster has been provisioned and the database has been created.
#
# Usage:
# ./scripts/setup-indexes.sh <project_id> <cluster_name> <db_name>
#
# Prerequisites:
# - MongoDB Atlas CLI installed and configured
# - A running MongoDB Atlas cluster with the specified database

set -e

PROJECT_ID=$1
CLUSTER_NAME=$2
DB_NAME=$3
COLLECTION_NAME="vector_embeddings"

if [ -z "$PROJECT_ID" ] || [ -z "$CLUSTER_NAME" ] || [ -z "$DB_NAME" ]; then
  echo "Usage: $0 <project_id> <cluster_name> <db_name>"
  exit 1
fi

echo "🚀 Creating Atlas Search Indexes for $DB_NAME.$COLLECTION_NAME"
echo "--------------------------------------------------"

# Create Text Search Index
echo "Creating text search index..."
atlas clusters search indexes create \
  --clusterName "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --dbName "$DB_NAME" \
  --collectionName "$COLLECTION_NAME" \
  --name "text_search_index" \
  --file "packages/core/src/indexes/text-search-index.json"

# Create Vector Search Index
echo "Creating vector search index..."
atlas clusters search indexes create \
  --clusterName "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --dbName "$DB_NAME" \
  --collectionName "$COLLECTION_NAME" \
  --name "vector_search_index" \
  --file "packages/core/src/indexes/vector-search-index.json"

echo "✅ Index creation initiated."
echo "It may take a few minutes for the indexes to become available."
echo "--------------------------------------------------"