. $HOME/.bashrc
eval $(dircolors ~/.dir_colors)

case ":$PATH:" in
    *":$JDK_HOME/bin:"* )
        ;;
    * )
        PATH=$PATH:$JDK_HOME/bin
        ;;
esac

export PATH


#. /home/vivek/.profabevjava
. ~/.profile
