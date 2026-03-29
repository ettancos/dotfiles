function gr
    set -l root (git rev-parse --show-toplevel 2>/dev/null)
    and cd $root
    or echo "Not in a git repository" >&2
end
