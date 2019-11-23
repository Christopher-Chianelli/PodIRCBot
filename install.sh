#!/bin/sh
# If using podman, `dnf install podman-docker` so docker redirects to podman
cd IRCProxy
docker build -t pod-irc-bot/irc-proxy .
cd ..

echo "Build Successful!"
