function xm5-mic --description "Switch XM5 to HFP for mic access in Zoom/Teams"
    # Extract device id from wpctl status line like "     107. WF-1000XM5   [bluez5]"
    set device_id (wpctl status | grep 'WF-1000XM5' | grep -oP '^\s+\*?\s*\K\d+(?=\.)')
    if test -z "$device_id"
        echo "XM5 not found — is it connected?"
        return 1
    end

    echo "Switching XM5 (id $device_id) → HFP (mic mode)..."
    wpctl set-profile $device_id headset-head-unit
    echo "Done. Select 'WF-1000XM5' as mic in Zoom/Teams."
    echo "Run 'xm5-ldac' to restore high-quality audio after the call."
end
