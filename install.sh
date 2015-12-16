#! /bin/zsh
# dependency:
# sudo pacman -S zsh vim

INSTALL_DIR="$HOME/.dotfiles"

# vim
git clone "https://github.com/dvcs/vimfiles.git" ~/.vim
ln -s ~/.vim/vimrc.home ~/.vimrc
# vim :plugInstall
sleep 1

# zsh
git clone --recursive https://github.com/sorin-ionescu/prezto.git "${ZDOTDIR:-$HOME}/.zprezto"
cp $INSTALL_DIR/zsh/.* ~/.zprezto/runcoms

setopt EXTENDED_GLOB
for rcfile in "${ZDOTDIR:-$HOME}"/.zprezto/runcoms/^README.md(.N); do
  ln -s "$rcfile" "${ZDOTDIR:-$HOME}/.${rcfile:t}"
done

# bash-it if no zsh
git clone --depth=1 https://github.com/Bash-it/bash-it.git ~/.bash_it
# bash-it enable plugin alias-completion base dirs docker extract fasd git history java less-pretty-cat postgres python ssh tmuxinator tmux virtualenv
# bash-it enable alias ansible atom clipboard docker general git tmux vim
# bash-it enable completion bash-it bundler defaults dirs fabric-completion gem git gradle grunt packer pip projects ssh tmux vagrant virtualbox

# set zsh as the default shell
chsh -s /bin/zsh

ln -s $INSTALL_DIR/bin ~/bin
ln -s $INSTALL_DIR/Xresources ~/.Xresources
ln -s $INSTALL_DIR/bashrc ~/.bashrc
ln -s $INSTALL_DIR/bash_profile ~/.bash_profile
ln -s $INSTALL_DIR/tmux.conf ~/.tmux.conf
ln -s $INSTALL_DIR/tmux ~/.tmux
ln -s $INSTALL_DIR/ackrc ~/.ackrc
ln -s $INSTALL_DIR/dir_colors ~/.dir_colors
ln -s $INSTALL_DIR/gitconfig ~/.gitconfig
