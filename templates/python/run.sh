#!/bin/sh
while :
do
    socat tcp:irc-proxy.$OPENSHIFT_BUILD_NAMESPACE.svc.cluster.local:$IRC_PROXY_SERVICE_PORT exec:'python -u main.py',nofork
    echo "Proxy disconnected/not avaliable, retrying in 5 seconds"
    sleep 5
done
