#!/usr/bin/env sh

handle () {

  EVENT=$(echo $1 | awk -F ">>" '{ print $1 }')
  if [ "$EVENT" = "monitoradded" ]; then
    DISPLAY_PORT=$(echo $1 | awk -F ">>" '{ print $2 }')
    COUNT=$(hyprctl monitors -j | jq -r '. | length')

    if [ $COUNT -eq 2 ]; then
        EXTERNAL_MONITOR=$(hyprctl -j monitors | jq -r '.[] | select(.name != "eDP-1") | .model')
        EXTERNAL_MONITOR_NAME=$(hyprctl -j monitors | jq -r '.[] | select(.name != "eDP-1") | .name')

        if echo "$EXTERNAL_MONITOR" | grep -q "DELL P2419H"; then
            echo HOME_MONITOR $EXTERNAL_MONITOR
            echo hyprctl keyword monitor "$EXTERNAL_MONITOR_NAME,preferred,0x0,1"
            hyprctl keyword monitor "$EXTERNAL_MONITOR_NAME,preferred,0x0,1"
            hyprctl keyword monitor "eDP-1,preferred,1920x0,1.5"
        elif echo "$EXTERNAL_MONITOR" | grep -q "DELL U3421WE"; then
            echo SAP_MONITOR $EXTERNAL_MONITOR
            hyprctl keyword monitor "$EXTERNAL_MONITOR_NAME,preferred,0x0,1"
            hyprctl keyword monitor "eDP-1,preferred,1734x1440,1.5"
        fi
    fi
  fi

  if [ "$EVENT" = "monitorremoved" ]; then
    DISPLAY_PORT=$(echo $1 | awk -F ">>" '{ print $2 }')
    COUNT=$(hyprctl monitors -j | jq -r '. | length')
    LAPTOP_MONITOR=$(hyprctl -j monitors | jq -r '.[] | select(.name == "eDP-1") | .name')
    if [ $COUNT -eq 1 -a "$LAPTOP_MONITOR" = "eDP-1" ]; then
        echo "ALONE $LAPTOP_MONITOR"
        hyprctl keyword monitor "eDP-1,preferred,0x0,1.5"
    fi
  fi
}

socat - UNIX-CONNECT:/tmp/hypr/$(echo $HYPRLAND_INSTANCE_SIGNATURE)/.socket2.sock | while read line; do handle $line; done
