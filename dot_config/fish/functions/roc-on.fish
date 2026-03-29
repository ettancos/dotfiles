function roc-on --description "Re-enable PipeWire ROC sink"
    set conf ~/.config/pipewire/pipewire.conf.d/50-roc-sink.conf
    if test -f $conf
        echo "ROC sink already enabled"
        return 0
    end
    if not test -f $conf.disabled
        echo "No disabled ROC config found"
        return 1
    end
    mv $conf.disabled $conf
    systemctl --user restart pipewire pipewire-pulse
    echo "ROC sink enabled"
end
