function xm5-ldac --description "Restore XM5 to A2DP/LDAC after a call"
    set device_id (wpctl status | grep 'WF-1000XM5' | grep -oP '^\s+\*?\s*\K\d+(?=\.)')
    if test -z "$device_id"
        echo "XM5 not found — is it connected?"
        return 1
    end

    echo "Switching XM5 (id $device_id) → A2DP/LDAC (high-quality mode)..."
    wpctl set-profile $device_id a2dp-sink-ldac
    echo "Done."
end
