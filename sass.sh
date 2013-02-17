#!/bin/bash

# watches all .scss files in given path

if [ $# -ne 1 ]
then
        echo "Usage: $0 {path}";
        exit 1;
fi;

for f in $(find "$1" -name "*.scss")
do
        sass --scss --watch "$f:${f//.scss/.css}" &
done;
