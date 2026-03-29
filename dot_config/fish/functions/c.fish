# c — Confluence shorthand for atlassian-sync
#
# Usage:
#   c q <query> [extra flags...]    fuzzy search Confluence, summary format (pipeable JSON)
#   c show <id>                     render one Confluence page as Markdown
#   c list                          list cached Confluence spaces
#   c status                        show Confluence sync status
#   c sync [flags...]               sync Confluence spaces
#   c <any atlassian-sync args>     passthrough
#
# Environment:
#   CFCTL_SPACE   default --scopes value (e.g. SUITEDEV,PCA)
#
# Pipe chain example:
#   c q "architecture" | jq -r 'select(.title | test("multi"; "i")) | .id' | xargs c show

function c
    set -l bin /tmp/atlassian-sync
    if not test -x $bin
        set bin (command -v atlassian-sync 2>/dev/null)
        if test -z "$bin"
            echo "c: atlassian-sync not found in /tmp or PATH" >&2
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
            if set -q CFCTL_SPACE
                set scope_flags --scopes $CFCTL_SPACE
            end
            if isatty stdout
                $bin search --confluence $scope_flags $rest
            else
                $bin search --confluence --format jsonl $scope_flags $rest
            end

        case show
            $bin show $rest

        case list
            $bin list --confluence $rest

        case status
            $bin status --confluence $rest

        case sync
            $bin sync $rest

        case '*'
            $bin $argv
    end
end
