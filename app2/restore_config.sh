#!/usr/bin/env bash

echo "$CONFIG_BASE64" | base64 -d > ./config.json
pwd
cat ./config.json