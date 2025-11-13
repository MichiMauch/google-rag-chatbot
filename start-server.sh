#!/bin/bash
# Startup script for production server with NODE_OPTIONS fix

export NODE_OPTIONS="--dns-result-order=ipv4first"

echo "Starting Next.js with NODE_OPTIONS=$NODE_OPTIONS"
npm run start
