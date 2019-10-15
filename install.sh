#! /bin/zsh
# dependency:
# sudo pacman -S zsh vim

debug=
dry_run=1


for i in "$@"
do
case $i in
    -d|--debug)
      debug=1
      shift # past argument=value
    ;;
    -r|--dry-run)
      dry_run=
      shift # past argument=value
    ;;
    *)
      echo "Unknown parameter $i"    
    ;;
esac
done

if [[ -n "$dry_run" ]]
then
  echo "Running in dry-run mode, run with $(basename $0) -r to run changes"
fi

INSTALL_DIR="$HOME/.dotfiles"

function install_vim {
  if [[ -d "$HOME/.vim" ]] then
    echo "vim folder already exists"
    return
  fi

  echo "Installing vim from https://github.com/dvcs/vimfiles.git"
  git clone "https://github.com/dvcs/vimfiles.git" ~/.vim
  ln -s ~/.vim/vimrc.home ~/.vimrc
  echo "To install plugins run: vim :plugInstall"
  sleep 1
}

# vim
[[ -z "$dry_run" ]] && install_vim

# zsh
if [[ ! -d ~/.zprezto ]] 
then
  [[ -z "$dry_run" ]] && git clone --recursive https://github.com/sorin-ionescu/prezto.git "${ZDOTDIR:-$HOME}/.zprezto"
  [[ -z "$dry_run" ]] && cp $INSTALL_DIR/zsh/* ~/.zprezto/runcoms

  setopt EXTENDED_GLOB
  for rcfile in "${ZDOTDIR:-$HOME}"/.zprezto/runcoms/^README.md(.N); do
    ln -sfn "$rcfile" "${ZDOTDIR:-$HOME}/.${rcfile:t}"
  done
else 
  echo ".zprezto folder already exists"
fi

# set zsh as the default shell
if [[ "$SHELL" != "/bin/zsh" ]]
then
  [[ -z "$dry_run" ]] && chsh -s /bin/zsh
  echo "SHELL=$SHELL"
else
  echo "Shell is already set to $(basename $SHELL)"
fi

function safe_install {
  config=$1
  outdir=$2
  [[ "$outdir" = "home" ]] && outdir=

  # if exists but not a symbolic link
  if [[ -e "${HOME}${outdir}/${config}" && ! -h "${HOME}${outdir}/${config}" ]]
  then
    echo "~${outdir}/${config} is not a symbolic link, removing..."
    [[ -z "$dry_run" ]] && rm -r "${HOME}${outdir}/${config}"
  fi
  
  extended_path="${INSTALL_DIR}"
  case $(basename $2) in
    home)
      extended_path="${extended_path}/home"
    ;;
    ".config")
      extended_path="${extended_path}/config"
    ;;
    *)
      echo "Unknown parameter $2"    
    ;;
  esac

  [[ -n "$debug" ]] && echo "ln -sfn ${extended_path}/${config} ~${outdir}/${config}"
  [[ -z "$dry_run" ]] && ln -sfn "${extended_path}/${config}" "$HOME${outdir}/${config}"
}

if [[ ! -h ~/bin ]]
then 
  [[ -z "$dry_run" ]] && rm -r "$HOME/bin"
  [[ -n "$debug" ]] && echo ln -sfn "${INSTALL_DIR}/bin" "~/bin"
  [[ -z "$dry_run" ]] && ln -sfn "${INSTALL_DIR}/bin" "$HOME/bin"
fi

for config in $(ls -a home | grep -v -E "^(.|..)$");
do
  safe_install "$config" "home"
done

for config in $(ls -a config | grep -v -E "^(.|..)$");
do
  safe_install "$config" "/.config"
done


