#!/bin/bash

####
## @author Tamas Tancos <tamas.tancos@emarsys.com>
## based on script from Alexander Kraml <alex.kraml@emarsys.com>
####

EIS_USER="emarsys"
EIS_PW="emarsys1234"
STATUS_OK="OK"
EU_STATUS=`/usr/bin/curl --connect-timeout 5 -s -u $EIS_USER:$EIS_PW https://broadcast1.emarsys.net/eis/overall_status`
US_STATUS=`/usr/bin/curl --connect-timeout 5 -s -u $EIS_USER:$EIS_PW https://broadcast2.emarsys.net/eis/overall_status`

# indicates that there is no network
if [ -z "$EU_STATUS" ] || [ -z "$US_STATUS" ];
then
    exit
fi

ERROR_CODE=0
if [ "$STATUS_OK" != "$EU_STATUS" ];
then
 ERROR_CODE=$(($ERROR_CODE + 1))
fi

if [ "$STATUS_OK" != "$US_STATUS" ];
then
 ERROR_CODE=$(($ERROR_CODE + 2))
fi

# determine cluster on error
function send_notification {
    if [ "$1" == 1  ];
    then
        CLUSTER="EU is"
    elif [ "$1" == 2 ];
    then
        CLUSTER="US is"
    else
        CLUSTER="Both clusters are"
    fi
    /usr/bin/notify-send.sh -t 1000 "$CLUSTER on error"
}

if [ "$ERROR_CODE" != 0 ];
then
    send_notification $ERROR_CODE
fi
echo $ERROR_CODE
