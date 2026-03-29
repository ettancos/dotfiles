function update-zoom --description "Install or update Zoom from latest official .deb"
    set -l deb_url "https://zoom.us/client/latest/zoom_amd64.deb"
    set -l tmpdir (mktemp -d)

    function __update_zoom_cleanup --on-event __update_zoom_done
        rm -rf $tmpdir
    end

    set -l deb "$tmpdir/zoom_amd64.deb"

    # Get current installed version (if any)
    set -l current_version (dpkg-query -W -f='${Version}' zoom 2>/dev/null)
    if test -n "$current_version"
        echo "Installed: $current_version"
    else
        echo "Zoom not currently installed"
    end

    echo "Downloading latest zoom_amd64.deb ..."
    if not curl -fsSL --output $deb $deb_url
        echo "update-zoom: download failed" >&2
        emit __update_zoom_done
        return 1
    end

    set -l latest_version (dpkg-deb -f $deb Version 2>/dev/null)
    if test -z "$latest_version"
        echo "update-zoom: could not read version from downloaded package" >&2
        emit __update_zoom_done
        return 1
    end

    echo "Latest:    $latest_version"

    if test "$current_version" = "$latest_version"
        echo "Already up to date."
        emit __update_zoom_done
        return 0
    end

    echo "Installing $latest_version ..."
    if not sudo apt install -y $deb
        echo "update-zoom: installation failed" >&2
        emit __update_zoom_done
        return 1
    end

    emit __update_zoom_done
    echo "Zoom updated to $latest_version"
end
