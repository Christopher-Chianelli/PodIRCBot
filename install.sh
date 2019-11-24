#!/bin/sh
# If using podman, `dnf install podman-docker` so docker redirects to podman
SERVICE_TEMPLATE=`cat pod-irc-bot.template.yaml | perl -ne '(/#TEMPLATE_START/../#TEMPLATE_END/) && print' | perl -pe 's/.*(#TEMPLATE_START.*)/$1/' | perl -pe 's/(.*#TEMPLATE_END).*/$1/' | sed '1d; $d; s/^ *//' | sed 's/#//' | tr '\n' '&'`
POD_CONFIG=`tr '\n' '&' < pod-irc-bot.template.yaml`
tmpfile=$(mktemp /tmp/pod-irc-bot-build.XXXXXX)
swapfile=$(mktemp /tmp/pod-irc-bot-build.XXXXXX)
echo "$POD_CONFIG" > $tmpfile

find -name '.service.dodeploy' -printf '%h\n' | cut -c3- | while read service
do
    echo "Building $service..."
    kubectl create configmap "$service-configmap" --from-env-file "$service/configmap.properties" -o yaml --dry-run | kubectl replace -f -
    oc new-build --name $service --strategy=docker --binary
    oc start-build $service --from-dir=$service --follow
    echo "&$SERVICE_TEMPLATE" | cat $tmpfile - | sed s/'$service'/"$service"/g > $swapfile
    cp $swapfile $tmpfile
done
kubectl create configmap services-configmap --from-env-file services-configmap.properties -o yaml --dry-run | kubectl replace -f -
cat $tmpfile | tr '&' '\n' > pod-irc-bot.yaml
rm $tmpfile
echo "Build Successful!"
