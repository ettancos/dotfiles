fundle plugin edc/bass
#fundle plugin 'lilyball/nix-env.fish'

fundle init

mise activate fish | source
zoxide init fish | source
starship init fish | source

#set -x GPG_TTY (tty)

for line in (rg -v "^#" --no-line-number ~/.alias | grep "=")
    set -l name (string split -m1 "=" $line)[1]
    set -l value (string split -m1 "=" $line)[2]
    alias $name $value
end

complete -f -c ppa -d "Repo file name" -a "(ls -1 /etc/apt/sources.list.d | sed -E 's/.list(.save)?\$//')"

set -q KREW_ROOT; and fish_add_path -g $KREW_ROOT/.krew/bin; or fish_add_path -g $HOME/.krew/bin
# fish_add_path -g /usr/local/go/bin # go compiler itself
# fish_add_path -g $HOME/apps/google-cloud-sdk/bin
# fish_add_path -g $HOME/.cargo/bin # rust apps  added with cargo install
# fish_add_path -g $HOME/.local/bin
# fish_add_path -g $HOME/bin

# opencode
fish_add_path /home/i525646/.opencode/bin

#if status --is-interactive; and not set -q SSH_AUTH_SOCK
#	eval (ssh-agent -c)
#	function kill_ssh_agent_on_exit --on-event fish_exit
#		ssh-agent -k >/dev/null
#	end
#end

set -xg LLM_PROXY_KEY (secret-tool lookup service nono username llm_proxy_key)
set -xg ANTHROPIC_AUTH_TOKEN $LLM_PROXY_KEY
set -xg FIREWORKS_API_KEY (secret-tool lookup service nono username fireworks_api_key)
set -xg CONTEXT7_API_KEY (secret-tool lookup service nono username context7_api_key)
set -xg ATLASSIAN_API_TOKEN (secret-tool lookup service nono username atlassian_api_token)
set -xg CLOUDFLARE_API_TOKEN (secret-tool lookup service nono username cloudflare_api_token)
