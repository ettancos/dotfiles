# j — Jira shorthand for atlassian-sync
#
# Usage:
#   j q <query> [extra flags...]    fuzzy search Jira, summary format (pipeable JSON)
#   j show <key-or-id>              render one Jira record as Markdown
#   j list                          list cached Jira projects
#   j status                        show Jira sync status
#   j sync [flags...]               sync Jira projects
#   j <any atlassian-sync args>     passthrough
#
# Environment:
#   JIRACTL_PROJECT   default --scopes value (e.g. CLOUDP,GAP)
#
# Pipe chain example:
#   j q "multi region" | jq -r 'select(.key=="GAP-53") | .key' | xargs j show

function j
    set -l bin /tmp/atlassian-sync
    if not test -x $bin
        set bin (command -v atlassian-sync 2>/dev/null)
        if test -z "$bin"
            echo "j: atlassian-sync not found in /tmp or PATH" >&2
            return 1
        end
    end

    if test (count $argv) -eq 0
        $bin --help
        return
    end

    set -l subcmd $argv[1]
    set -l rest $argv[2..-1]

    switch $subcmd
        case q query search
            set -l scope_flags
            if set -q JIRACTL_PROJECT
                set scope_flags --scopes $JIRACTL_PROJECT
            end
            if isatty stdout
                $bin search --jira $scope_flags $rest
            else
                $bin search --jira --format jsonl $scope_flags $rest
            end

        case show
            $bin show $rest

        case list
            $bin list --jira $rest

        case status
            $bin status --jira $rest

        case sync
            $bin sync $rest

        case '*'
            $bin $argv
    end
end
