import os
import socket

#c.qt.force_platform = 'wayland'
#c.qt.highdpi = True
#c.qt.force_software_rendering = 'webengine'
c.window.hide_decoration = True
c.url.default_page = "https://duckduckgo.com"
c.auto_save.session = True
c.tabs.background = True
c.completion.web_history.max_items = 10000
c.content.pdfjs = True
c.colors.statusbar.normal.bg = "#333"
c.colors.statusbar.url.success.https.fg = "white"
c.colors.tabs.even.fg = "#888"
c.colors.tabs.even.bg = "#333"
c.colors.tabs.odd.fg = "#888"
c.colors.tabs.odd.bg = "#333"
c.colors.tabs.selected.odd.bg = "#285577"
c.colors.tabs.selected.even.bg = "#285577"
c.colors.messages.error.fg = c.colors.statusbar.normal.fg
c.colors.messages.warning.fg = c.colors.statusbar.normal.fg
c.colors.prompts.fg = c.colors.statusbar.normal.fg

config.bind("q", 'tab-close')

config.unbind("gO")
config.bind("gO", 'set-cmd-text :open -t {url:pretty}')

config.bind("gT", "tab-prev")
config.bind("gt", "tab-next")

config.bind("<Ctrl-Tab>", "tab-next")
config.bind("<Ctrl-Shift-Tab>", "tab-prev")
config.bind("xK", 'open -t -- http://jisho.org/search/{primary}')
config.bind("xI", 'open -t javascript:document.location="https://iqdb.org/?url="+encodeURIComponent(document.location);')
config.bind("xJ", 'open -t -- https://translate.google.com/#de/en/{primary}')
config.bind("xA", "jseval javascript:(function(){var%20tota11y=document.createElement('SCRIPT');tota11y.type='text/javascript';tota11y.src='//khan.github.io/tota11y/tota11y/build/tota11y.min.js';document.getElementsByTagName('head')[0].appendChild(tota11y);})();")

config.bind("xjn", "set content.javascript.enabled true")
config.bind("xjf", "set content.javascript.enabled false")

#config.unbind("<Shift-Ins>", mode="insert")

#for font in [
#    "fonts.completion.entry",
#    "fonts.completion.category",
#    "fonts.debug_console",
#    "fonts.downloads",
#    "fonts.hints",
#    "fonts.keyhint",
#    "fonts.messages.error",
#    "fonts.messages.info",
#    "fonts.messages.warning",
#    "fonts.prompts",
#    "fonts.statusbar",
#    "fonts.tabs",
#]:
#    value = config.get(font)
#    value = value.replace("10pt", "11pt")
#    config.set(font, value)

host_config = os.path.expanduser(
        "~/.config/qutebrowser/{}.py".format(socket.gethostname()))
if os.path.exists(host_config):
    with open(host_config) as f:
        exec(f.read())

