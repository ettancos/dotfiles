#!/bin/sh

# swaylock blurred screen inspired by /u/patopop007 and the blog post
# http://plankenau.com/blog/post-10/gaussianlock
# Modified from gist https://gist.github.com/csivanich/10914698

# Dependencies:
# imagemagick
# swaylock
# grim

# All options are here: http://www.imagemagick.org/Usage/blur/#blur_args
#BLURTYPE="0x5"
#BLURTYPE="0x2"
#BLURTYPE="5x2"
#BLURTYPE="2x8"
#BLURTYPE="2x3"
BLURTYPE="0x8"

BLUR_CMD=/home/ttancos/bin/blur-image

IMAGE=/tmp/swaylock-*.png

SWAYLOCK_OPTS="-f -e -F"

for output in $(swaymsg -t get_outputs -r | jq ".[].name" | tr -d '"');
do
    IMAGEPATH=/tmp/swaylock-${output}.png
    grim -o $output "$IMAGEPATH"
    #convert "$IMAGEPATH" -blur "$BLURTYPE" "$IMAGEPATH"
    ${BLUR_CMD} -o "$IMAGEPATH" -s 6.9 "$IMAGEPATH"
    SWAYLOCK_OPTS="${SWAYLOCK_OPTS} --image ${output}:${IMAGEPATH}"
done
# Get the screenshot, add the blur and lock the screen with it
exec swaylock ${SWAYLOCK_OPTS} && rm -f $IMAGE
