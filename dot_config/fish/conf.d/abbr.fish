set -q MY_ABBRS_INITIALIZED; and return

abbr -a -- la 'ls -lah'
abbr -a -- ldot 'ls -ld .*'
abbr -a -- ll 'ls -lGFh'
abbr -a -- lsa 'ls -aGF'

abbr -a -- gclone 'git clone'

abbr -a -g .. 'cd ..'
abbr -a -g ... 'cd ../../'
abbr -a -g .... 'cd ../../../'
abbr -a -g ..... 'cd ../../../../'
abbr -a -g - 'cd -'

abbr -a -g tree 'll --tree --level=2'
abbr -a -g tree2 'll --tree --level=2'
abbr -a -g tree2a 'll --tree --level=2 -a'
abbr -a -g tree3 'll --tree --level=3'
abbr -a -g tree3a 'll --tree --level=3 -a'
abbr -a -g tree4 'll --tree --level=4'
abbr -a -g tree4a 'll --tree --level=4 -a'

abbr -a -- sctl 'systemctl --user'
abbr -a -- st 'systemctl --user status'
#abbr -a -- restart 'systemctl --user restart'
#abbr -a -- srestart 'sudo systemctl restart'
#abbr -a -- stop 'systemctl --user stop'
#abbr -a -- sstop 'sudo systemctl stop'

abbr -a -- k kubectl
abbr -a -- kctx kubectl config use-context

abbr buildpkg "$(string join ' \\'\n -- \
    'env' \
    'CC=gcc-15' \
    'CXX=g++-15' \
    'CC_LD=mold' \
    'CXX_LD=mold' \
    'LDFLAGS=-B(which mold)' \
    'DEB_CFLAGS_APPEND="-march=native -fivopts -fmodulo-sched"' \
    'DEB_CXXFLAGS_APPEND="-march=native -fivopts -fmodulo-sched"' \
    'DEB_BUILD_OPTIONS=' \
    'dpkg-buildpackage -j13 -us -uc -b -rfakeroot'
)"

abbr lcmake "$(string join ' \\'\n -- \
    'cmake --no-warn-unused-cli' \
    '-DCMAKE_C_COMPILER=gcc-15' \
    '-DCMAKE_CXX_COMPILER=g++-15' \
    '-DCMAKE_C_USING_LINKER_LLD="-fuse-ld=mold"' \
    '-DCMAKE_CXX_USING_LINKER_LLD="-fuse-ld=mold"' \
    '-DCMAKE_C_FLAGS="-march=native -fivopts -fmodulo-sched"' \
    '-DCMAKE_CXX_FLAGS="-march=native -fivopts -fmodulo-sched"' \
    '-DCMAKE_INTERPROCEDURAL_OPTIMIZATION=no' \
    '-DCMAKE_BUILD_TYPE:STRING=RelWithDebInfo' \
    '-DCMAKE_INSTALL_PREFIX:PATH=/usr/local' \
    '-S . -B ./build'
)"

abbr bcmake "$(string join ' \\'\n -- \
    'cmake --no-warn-unused-cli' \
    '-DCMAKE_C_COMPILER=gcc-15' \
    '-DCMAKE_CXX_COMPILER=g++-15' \
    '-DCMAKE_C_USING_LINKER_LLD="-fuse-ld=mold"' \
    '-DCMAKE_CXX_USING_LINKER_LLD="-fuse-ld=mold"' \
    '-DCMAKE_C_FLAGS="-march=native -fivopts -fmodulo-sched"' \
    '-DCMAKE_CXX_FLAGS="-march=native -fivopts -fmodulo-sched"' \
    '-DCMAKE_INTERPROCEDURAL_OPTIMIZATION=yes' \
    '-DCMAKE_BUILD_TYPE:STRING=RelWithDebInfo' \
    '-DCMAKE_INSTALL_PREFIX:PATH=/usr/local' \
    '-S . -B ./build'
)"

set -g MY_ABBRS_INITIALIZED true
