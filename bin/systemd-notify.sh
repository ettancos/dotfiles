#!/bin/bash -eux
TEMP=$(getopt -o "" --long ready,pid: -n "$0" -- "$@")
eval set -- "$TEMP"

while true; do
case "$1" in
    --ready) shift;;
    --pid) PID=$2; shift 2 ;;
    --) shift; break;;
    *) echo "Internal error on arg $1"; exit 1 ;
esac
done

(
echo -en "MAINPID=$PID\nREADY=1\n"
while [[ $(systemctl show --user --property=ActiveState sway) == 'ActiveState=activating' ]]; do
    sleep 1
done
) | socat unix-sendto:$NOTIFY_SOCKET STDIO
