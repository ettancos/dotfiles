function update-hai --description "Update hai CLI from latest GitHub release"
    set -l repo "github.tools.sap/hAIperspace/hai-cli"
    set -l install_dir (dirname (command -v hai 2>/dev/null; or echo "$HOME/.local/bin/hai"))
    set -l install_path "$install_dir/hai"

    # Resolve OS
    set -l os (uname -s | tr '[:upper:]' '[:lower:]')
    switch $os
        case darwin
            set os darwin
        case linux
            set os linux
        case '*'
            echo "update-hai: unsupported OS: $os" >&2
            return 1
    end

    # Resolve arch
    set -l arch (uname -m)
    switch $arch
        case x86_64
            set arch amd64
        case aarch64 arm64
            set arch arm64
        case '*'
            echo "update-hai: unsupported architecture: $arch" >&2
            return 1
    end

    set -l asset "hai-$os.$arch.tar.gz"

    # Get current and latest versions
    set -l current_version (hai --version 2>/dev/null | string match -r '\d+\.\d+\.\d+' | head -1)
    set -l latest_tag (gh release view --repo $repo --json tagName -q '.tagName' 2>/dev/null)

    if test -z "$latest_tag"
        echo "update-hai: could not fetch latest release from $repo" >&2
        return 1
    end

    set -l latest_version (string replace 'v' '' $latest_tag)

    echo "Current: $current_version  →  Latest: $latest_version"

    if test "$current_version" = "$latest_version"
        echo "Already up to date."
        return 0
    end

    set -l tmpdir (mktemp -d)

    function __update_hai_cleanup --on-event __update_hai_done
        rm -rf $tmpdir
    end

    echo "Downloading $asset ..."
    if not gh release download $latest_tag \
        --repo $repo \
        --pattern "$asset" \
        --pattern "$asset.sha256" \
        --dir $tmpdir 2>/dev/null
        echo "update-hai: download failed" >&2
        emit __update_hai_done
        return 1
    end

    # Verify checksum
    set -l checksum_file "$tmpdir/$asset.sha256"
    set -l tarball "$tmpdir/$asset"

    if test -f $checksum_file
        echo "Verifying checksum ..."
        set -l expected (string split ' ' (cat $checksum_file))[1]
        set -l actual (sha256sum $tarball | string split ' ')[1]
        if test "$expected" != "$actual"
            echo "update-hai: checksum mismatch!" >&2
            echo "  expected: $expected" >&2
            echo "  actual:   $actual" >&2
            emit __update_hai_done
            return 1
        end
        echo "Checksum OK."
    else
        echo "update-hai: warning: no checksum file found, skipping verification"
    end

    # Extract
    tar -xzf $tarball -C $tmpdir

    # Find the binary in the extracted contents
    set -l extracted_bin (find $tmpdir -maxdepth 2 -type f -name 'hai' ! -name '*.tar.gz' | head -1)
    if test -z "$extracted_bin"
        echo "update-hai: could not find 'hai' binary in archive" >&2
        emit __update_hai_done
        return 1
    end

    # Install — copy to a sibling temp file first, then rename atomically.
    # Direct cp over a running binary fails with "Text file busy" on Linux.
    mkdir -p $install_dir
    set -l tmp_bin "$install_path.new"
    cp $extracted_bin $tmp_bin
    chmod +x $tmp_bin
    mv $tmp_bin $install_path

    emit __update_hai_done
    echo "Updated hai to $latest_version at $install_path"
end
