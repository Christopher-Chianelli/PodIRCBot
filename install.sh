#!/bin/sh
# If using podman, `dnf install podman-docker` so docker redirects to podman 

oc scale --replicas=0 deployment pod-irc-bot
SERVICE_TEMPLATE=`cat pod-irc-bot.template.yaml | perl -ne '(/#TEMPLATE_START/../#TEMPLATE_END/) && print' | perl -pe 's/.*(#TEMPLATE_START.*)/$1/' | perl -pe 's/(.*#TEMPLATE_END).*/$1/' | sed '1d; $d; s/^ *//' | sed 's/#//' | tr '\n' '&'`
POD_CONFIG=`tr '\n' '&' < pod-irc-bot.template.yaml`
echo -n "botConfigs=[" > services-configmap.properties
tmpfile=$(mktemp /tmp/pod-irc-bot-build.XXXXXX)
swapfile=$(mktemp /tmp/pod-irc-bot-build.XXXXXX)
echo "$POD_CONFIG" > $tmpfile

find -name '.service.dodeploy' -printf '%h\n' | cut -c3- | while read service
do
    NEWEST_FILE=`find $service -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" "`
    if [ "$NEWEST_FILE" == "$service/.buildtime" ]
    then
        echo "Skipping $service; no changes since last build"
    else
        echo "Building $service..."
        oc create configmap "$service-configmap" --from-env-file "$service/configmap.properties"
        oc create configmap "$service-configmap" --from-env-file "$service/configmap.properties" -o yaml --dry-run | kubectl replace -f -
        oc new-build --name $service --strategy=docker --binary
        oc start-build $service --from-dir=$service --follow
        touch $service/.buildtime
    fi
    echo "&$SERVICE_TEMPLATE" | cat $tmpfile - | sed s/'$service'/"$service"/g > $swapfile
    cp $swapfile $tmpfile
    if [ -f "$service/container-config-addon.yaml" ]
    then
        sed 's/^/        /' "$service/container-config-addon.yaml" | cat $tmpfile - > $swapfile
        cp $swapfile $tmpfile
    fi
    if [ -f "$service/service.yaml" ]
    then
        oc apply -f $service/service.yaml
    fi
    if [ -f "$service/bot-info.json" ]
    then
       sed -e 's/^ *//' < "$service/bot-info.json" | tr -d '\n' >> services-configmap.properties
    fi
done
echo "]" >> services-configmap.properties
oc create configmap services-configmap --from-env-file services-configmap.properties
oc create configmap services-configmap --from-env-file services-configmap.properties -o yaml --dry-run | kubectl replace -f -
cat $tmpfile | tr '&' '\n' > pod-irc-bot.yaml
rm $tmpfile

oc apply -f pod-irc-bot.yaml
oc scale deployment pod-irc-bot --replicas=1
echo "Build Successful!"
