#!/bin/sh
# http://wiki.nginx.org/Faq#How_do_I_generate_an_htpasswd_file_without_having_Apache_tools_installed.3F

PASSWORD=$1;
SALT="$(openssl rand -base64 6)"
SHA1=$(printf "$PASSWORD$SALT" | openssl dgst -binary -sha1 | sed 's#$#'"$SALT"'#' | base64);

printf "{SSHA}$SHA1\n"
