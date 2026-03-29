if status is-interactive
    function __trigger_prompt_sync --on-event fish_prompt
        set -U __prompt_sync (grep current-context ~/.kube/config)
    end

    function __prompt_sync --on-variable __prompt_sync
        test (grep current-context ~/.kube/config) = $__prompt_sync; or return
        commandline -f repaint
    end
end
