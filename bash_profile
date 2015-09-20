#. $HOME/.bashrc
#if [[ -z "$DISPLAY" ]] && [[ $(tty) = /dev/tty1 ]]; then
#  . startx
#  logout
#fi

export JDK_HOME=/usr/lib/jvm/java-8-jdk
export JAVA_HOME=$JDK_HOME
export JRE_HOME=$JDK_HOME/jre
export PATH=$PATH:$HOME/bin

case ":$PATH:" in
    *":$JDK_HOME/bin:"* )
        export PATH=$PATH:$JRE_HOME/bin
        ;;
    * )
        export PATH=$PATH:$JDK_HOME/bin:$JRE_HOME/bin
        ;;
esac

eval $(dircolors ~/.dir_colors)
. /home/vivek/.profabevjava
