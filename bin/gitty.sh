#! /bin/bash
#
# This script create a branch in both the repository
#
# @author Patrick  Martini <patrick.martini@emarsys.com>

[ -z "$(which git)" ] && echo "'git' not found" >&2 && exit 1

#Color functions We need to move somwhere else
red='\033[0;31m'
yellow='\033[38;5;148m'
brown='\033[0;33m'
NC='\033[39m' # No Color

function info()
{
    echo -e "${yellow}$1${NC}"
}

function error()
{
    echo -e "${red}$1${NC}"
}

function step_info()
{
    echo -e "${brown}$1${NC}"
}

function usage()
{
    info "Usage: gitty.sh <COMMAND [.....]>" >&2
    info "" >&2
    info "      new issue <ticket identifier> <description>     -- create a new public branch from master" >&2
    info "      new issue <ticket identifier>                   -- create a new public branch form master" >&2
    info "                                                         fetching the description from JIRA" >&2
    info "                                                         if you have exported the env variable" >&2
    info "                                                         JIRA_USER and JIRA_PASSWORD" >&2
    info "      new release <indetifier>                        -- create a new release branch from master" >&2
    info "      new sprint  <YYYY-MM-DD>                        -- create a new sprint  branch from master" >&2
    info "      new sandbox <description>                       -- create a new sandbox branch from master" >&2
    info "" >&2
    info "      sync branch_name                                -- keep a branch in sync with master" >&2
    info "      sync branch_name <branches.txt>                 -- keep a branch in sync with master" >&2
    info "                                                         and merging back the branches specified in" >&2
    info "                                                         text file provided" >&2
    info "" >&2
    info "      status                                          -- check the index of the current branch" >&2
}


GIT_VERSION=1.8.0

ACTUAL_GIT_VERSION=$(git --version | awk -F ' ' '{print $3}')

# Compare two software versions.
# Return
# - 0 =
# - 1 >
# - 2 <
version_comparison() {
    if [[ $1 == $2 ]]
    then
        return 0
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    # fill empty fields in ver1 with zeros
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++))
    do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++))
    do
        if [[ -z ${ver2[i]} ]]
        then
            # fill empty fields in ver2 with zeros
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]}))
        then
            return 1 #$1>$2
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]}))
        then
            return 2 #$1<$2
        fi
    done
    return 0
}

version_comparison $GIT_VERSION $ACTUAL_GIT_VERSION
[ $? == 1 ] && { echo "Wrong git version you need at least $GIT_VERSION"; exit 1; }


SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
[ -z "$(which git)" ] && { echo "command 'git' not found"; exit 1; }

###
# Check the index status of the repository
###
function git_status_index() {
    if [ -n "$(git status --porcelain | egrep -v '^\?\?')" ] ; then
        error "[ KO ] Index NOT clean"
        exit 1
    else
        info "[ OK ] Index clean"
    fi
}

check_repository()
{
    local dir=$(git rev-parse --git-dir 2>/dev/null)
    [ -z "$dir" ] && echo "Error: $1 is not a git repository" >&2 && exit 1
    git_status_index
}


validate_identifier()
{
    local date_regex="^20[1-9]+[0-9]+-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$"
    case $1 in
        release )
            [[ $2 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { error "Error: Release identifier may only consist of 0-9 and dots."; exit 1; }
            ;;
        sprint )
            [[ $2 =~ $date_regex ]] || { error "Error: Sprint branch needs a date yyyy-mm-dd"; exit 1; }
            ;;
        sandbox )
            ;;
        * )
            [[ $2 =~ ^(EDREI|SUITEDEV)[-][0-9]+$ ]] || { error "Error: Branch identifier must be of the form EDREI-[0-9]+"; exit 1; }
            ;;
    esac
}

safe_execute() {
    echo -n -e "${brown}"
    eval $1 2> /dev/null
    if [ $? -ne 0 ]; then
        echo -e "${red}$2${NC}"
        exit 1
    fi
    echo -e -n "${NC}"
}

get_git_branch() {
    echo `git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/'`
}

git_checkout() {
    safe_execute "git checkout -q $1" "Could not checkout $1"
}

git_checkout_b() {
    local __origin_branch=$2
    [ -z $2 ] && __origin_branch="master"
    safe_execute "git checkout -q origin/$__origin_branch" "Could not checkout $1"
    safe_execute "git checkout -q -b $1" "Could not checkout $1"
    safe_execute "git push -u origin $1" "Could not push $1"

}

git_pull() {
    safe_execute "git pull origin `get_git_branch`" "Could not pull changes for `get_git_branch`"
}

git_push() {
    safe_execute "git push -q origin `get_git_branch`" "Could not push changes for `get_git_branch`"
}

git_merge() {
    safe_execute "git merge --no-ff $1/$2" "Error: Could not merge $2, stopping"
}

git_fetch() {
    local __origin=$1
    [ -z $1 ] && __origin="origin"
    safe_execute "git fetch $__origin" "Could not fetch"

}

get_branch_suffix()
{
    #Validate the identifier
    validate_identifier $1 $2
    local __branch_suffix=""
    local __resultvar=$3
    case $1 in
        issue )
            __branch_suffix="issue/"
            ;;
        release )
            __branch_suffix="rel/"
            ;;
        sprint )
            __branch_suffix="sprint/"
            ;;
        sandbox )
            __branch_suffix="sandbox/"
            ;;
        * )
            error "Error: You didn't specify issue, release or sprint."
            exit 1
            ;;
    esac
    eval $__resultvar="'$__branch_suffix'"
}

create_branch_name()
{
    local sep=""
    [ ! -z $3 ] && sep="-"
    echo "$1$2$sep$3"
}

create_branch()
{

    local branch_name=$1
    info "Creating: $branch_name"

    git_fetch
    if $(git branch -r|grep -q "$branch_name"); then
        info "$branch_name already exists, switching to it"
        git_checkout $branch_name
    else
        git_fetch
        git_checkout_b $branch_name
        git_push
        safe_execute "git branch -q --set-upstream-to=origin/$branch_name $branch_name" "Set upstream was not working"
    fi
    git_push
    info "Branch $branch_name created"
}

merge_branch()
{
    info "-------> Merging back $1"
    git_merge "origin" $1
}

merge_branches()
{
    declare -a branches=("${!2}")
    for branch in ${branches[@]}
    do
        merge_branch $branch
    done
}

function command_status()
{
    check_repository
}
function fetch_branch_description() {
    local ticket_id=$1
    local response=$(curl -u $JIRA_USER:$JIRA_PASSWORD \
        --write-out "HTTPSTATUS=%{http_code}" \
        -X GET https://emarsys.jira.com/rest/api/2/issue/$ticket_id\?fields\=summary)
    local descr=$( echo "$response" | grep -o '"summary":.*"' | cut -d\" -f 4 | sed -e 's/[[:space:]|/]/_/g' | sed -e "s/[&|%|'|*|.|\"]//g" )
    local http_status=$( echo "$response" | grep -o 'HTTPSTATUS=\d*' | cut -d= -f 2)
    if [[ $http_status -ne 200 ]]; then
        echo "$response"
        exit 1
    else
        echo $descr
    fi
}


function command_new()
{
    command_status
    branch_suffix=""
    get_branch_suffix $1 $2 branch_suffix
    local descr=""
    case $branch_suffix in
        "issue/" )
        if [[ -z "$3" ]]; then
            if [[ -z "$JIRA_PASSWORD" ]] || [[ -z "$JIRA_USER" ]]; then
                error "A description must be provided."
                error "Either You can specify on the command line"
                error "Or export the env variable JIRA_USER and JIRA_PASSWORD"
                error "in order to fetch directly from jira"
                exit 1
            else
                descr=$(fetch_branch_description $2)
                [ $? -ne 0 ] && echo $descr && exit 1
            fi
        else
            descr=$3
        fi
        ;;
    esac
    branch_name=`create_branch_name $branch_suffix $2 $descr`
    create_branch $branch_name
}

function command_sync()
{
    command_status
    [ -z "$1" ] && { error "Come on. At least a branch"; exit 1; }
    branch_name=$1
    if [[ -z "$(git branch -a | cut -c3- | egrep "$branch_name")" ]]; then

        while true; do
            echo "The branch $branch_name does not exist yet. Do you want to create it?[Y/N]"
            read yn
            case $yn in
                [Yy]* )
                    create_branch $branch_name
                    break
                    ;;
                [Nn]* )
                    echo "Leaving branch $branch_name as it is."
                    exit 1
                    break
                    ;;
                * )
                    echo "Error: Please answer (y)es or (n)o."
                    ;;
            esac
        done
    fi
    info "Initial merging for $1"
    git checkout $branch_name
    git_fetch
    git_pull
    merge_branch "master"
    #Reading list branches from files
    if [[ -n "$2" ]] ; then
        [ ! -f $2 ] && { echo "File $2 does not exist"; exit 1; }
        OLD_IFS=$IFS
        IFS=$'\r\n' BRANCHES=($(cat $2))
        IFS=$OLD_IFS
        merge_branches $branch_name BRANCHES[@]
    fi

    git_push
    info "[ OK ] Sync Done"

}

case $1 in
    new )
        shift
        command_new $* ;;
    sync )
        shift
        command_sync $* ;;
    status )
        command_status ;;
    * )
        error "Error: You didn't provide the needed arguments."
        usage
        exit 1
    ;;
esac

