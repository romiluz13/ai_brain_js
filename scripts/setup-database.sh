#!/bin/bash

# This script sets up the initial database and collections for the MongoDB AI Agent Boilerplate.
# It should be run after the Atlas cluster has been provisioned.
#
# Usage:
# ./scripts/setup-database.sh <connection_string>
#
# Prerequisites:
# - MongoDB Shell (mongosh) installed
# - A running MongoDB Atlas cluster

set -e

CONNECTION_STRING=$1
DB_NAME="ai_agents"

if [ -z "$CONNECTION_STRING" ]; then
  echo "Usage: $0 <connection_string>"
  exit 1
fi

echo "🚀 Setting up database: $DB_NAME"
echo "--------------------------------------------------"

mongosh "$CONNECTION_STRING" --eval "
  db.getSiblingDB('$DB_NAME').createCollection('agents', {
    validator: {
      \$jsonSchema: {
        bsonType: 'object',
        required: ['agent_id', 'name', 'version', 'status'],
        properties: {
          agent_id: { bsonType: 'string' },
          name: { bsonType: 'string' },
          version: { bsonType: 'string' },
          status: { bsonType: 'string', enum: ['active', 'inactive', 'deprecated'] }
        }
      }
    }
  });
"

echo "✅ Database '$DB_NAME' and collection 'agents' created successfully."

mongosh "$CONNECTION_STRING" --eval "
  db.getSiblingDB('$DB_NAME').collection('agent_working_memory').createIndex(
    { 'expires_at': 1 },
    { expireAfterSeconds: 0 }
  );
"

echo "✅ TTL index on 'agent_working_memory' created successfully."
echo "--------------------------------------------------"