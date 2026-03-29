function roc-off --description "Disable PipeWire ROC sink until next boot or roc-on"
    set conf ~/.config/pipewire/pipewire.conf.d/50-roc-sink.conf
    if not test -f $conf
        echo "ROC sink already disabled"
        return 0
    end
    mv $conf $conf.disabled
    systemctl --user restart pipewire pipewire-pulse
    echo "ROC sink disabled"
end
