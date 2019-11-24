#!/bin/sh
while :
do
    socat -d -d exec:'python main.py',pty tcp:irc-proxy.$OPENSHIFT_BUILD_NAMESPACE.svc.cluster.local:$IRC_PROXY_SERVICE_PORT
    echo "Proxy disconnected/not avaliable, retrying in 5 seconds"
    sleep 5
done
