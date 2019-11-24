#!/bin/sh
# If using podman, `dnf install podman-docker` so docker redirects to podman
kubectl create configmap irc-proxy-configmap --from-env-file IRCProxy/configmap.properties -o yaml --dry-run | kubectl replace -f -
oc new-build --name irc-proxy --strategy=docker --binary
oc start-build irc-proxy --from-dir=IRCProxy --follow

kubectl create configmap services-configmap --from-env-file services-configmap.properties -o yaml --dry-run | kubectl replace -f -
echo "Build Successful!"
