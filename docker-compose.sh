#!/bin/sh
if command -v podman > /dev/null
then
    DOCKER=podman
elif command -v docker > /dev/null
then
    DOCKER=docker
else
    echo "podman or docker required"
    exit 1
fi

if command -v podman-compose > /dev/null
then
    COMPOSE=podman-compose
elif command -v docker-compose /dev/null
then
    COMPOSE=docker-compose
else
    echo "podman-compose or docker-compose required"
    exit 1
fi

$COMPOSE -f docker-compose.pod-irc-bot.yaml down

SERVICE_TEMPLATE=`cat docker-compose.pod-irc-bot.template.yaml | perl -ne '(/#TEMPLATE_START/../#TEMPLATE_END/) && print' | perl -pe 's/.*(#TEMPLATE_START.*)/$1/' | perl -pe 's/(.*#TEMPLATE_END).*/$1/' | sed '1d; $d; s/^ *//' | sed 's/#//' | tr '\n' '&'`
POD_CONFIG=`tr '\n' '&' < docker-compose.pod-irc-bot.template.yaml`
echo -n "botConfigs=[{}" > services-configmap.properties
echo "OPENSHIFT_BUILD_NAMESPACE=docker-compose" > docker-compose.properties
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
        $DOCKER build -t pod-irc-bot/$service $service
        touch $service/.buildtime
    fi
    echo "&$SERVICE_TEMPLATE" | cat $tmpfile - | sed s/'$service'/"$service"/g > $swapfile
    cp $swapfile $tmpfile
    if [ -f "$service/container-config-addon.yaml" ]
    then
        SERVICE_PROPERTY=${service^^}
        SERVICE_PROPERTY=`echo $SERVICE_PROPERTY | tr '-' '_'`
        CONTAINER_PORT=`grep containerPort "$service/container-config-addon.yaml" | sed 's/[^0-9]*//g'`
        # To reduce fragility, services get the port via enviroment variables (But not the host!)
        echo "$SERVICE_PROPERTY"_SERVICE_PORT=$CONTAINER_PORT >> docker-compose.properties
    fi
    if [ -f "$service/service.yaml" ]
    then
       : # Do nothing; docker compose does it for us
    fi
    if [ -f "$service/bot-info.json" ]
    then
       sed -e '1s/^/,/' -e 's/^ *//' < "$service/bot-info.json" | tr -d '\n' >> services-configmap.properties
    fi
done
echo "]" >> services-configmap.properties
cat $tmpfile | tr '&' '\n' > docker-compose.pod-irc-bot.yaml
rm $tmpfile

$COMPOSE -f docker-compose.pod-irc-bot.yaml up
echo "Build Successful!"
