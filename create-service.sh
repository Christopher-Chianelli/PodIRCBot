#!/bin/sh
printf "Please select a template to copy:\n"
select d in templates/*; do test -n "$d" && break; echo ">>> Invalid Template"; done
printf "Please enter the name of your service:\n"
read serviceName
while [[ ! $serviceName =~ ^[a-z0-9-]+$ ]]
do
    printf "Invalid name; please enter a name that matches the regex [a-z0-9-]+:\n"
    read serviceName
done
echo "Creating directory $serviceName"
cp -r "$d" "$serviceName"
touch $serviceName/.service.dodeploy
echo "Done! To create your service, follow the instructions in $serviceName/README.adoc"
