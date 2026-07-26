-- ~/.config/hypr/hyprland.lua
-- Converted from hyprland.conf
-- ── Monitors ─────────────────────────────────────────────────────────────────
hl.monitor({ output = "", mode = "preferred", position = "auto", scale = "auto" })
require("monitors")

-- ── Startup ──────────────────────────────────────────────────────────────────
local function uwsm(cmd)
	hl.exec_cmd("uwsm app -s b -- " .. cmd)
end

hl.on("hyprland.start", function()
	hl.exec_cmd("uwsm finalize")
	uwsm("xsettingsd")
	uwsm("hyprland-battery --monitor")
	uwsm("/usr/lib/policykit-1-gnome/polkit-gnome-authentication-agent-1")
	hl.exec_cmd("awww-daemon && awww img ~/images/ryan-lum-1ak3Z7ZmtQA-unsplash.jpg")
	uwsm("xsetroot -cursor_name left_ptr")
	uwsm("nwg-look -a")
end)

-- ── Ecosystem ────────────────────────────────────────────────────────────────
hl.config({
	ecosystem = {
		no_update_news = true,
		no_donation_nag = true,
	},
})

-- ── Input ────────────────────────────────────────────────────────────────────
hl.config({
	input = {
		kb_layout = "us,hu,de",
		kb_options = "grp:alt_space_toggle",
		kb_variant = "altgr-intl,qwerty,qwerty",
		kb_model = "",
		kb_rules = "",

		follow_mouse = 2,
		float_switch_override_focus = 0,

		repeat_rate = 30,
		repeat_delay = 350,

		touchpad = {
			natural_scroll = true,
			drag_lock = 2,
			tap_and_drag = true,
		},

		sensitivity = 0,
	},

	cursor = {
		no_warps = true,
		hotspot_padding = 0,
	},
})

-- ── Appearance ───────────────────────────────────────────────────────────────
hl.config({
	general = {
		gaps_in = 2,
		gaps_out = 2,
		border_size = 1,

		col = {
			active_border = { colors = { "rgba(8fbcbbee)", "rgba(5e81acee)" }, angle = 45 },
			inactive_border = "rgba(3b4252aa)",
		},

		layout = "scrolling",
		resize_on_border = true,
		allow_tearing = false,

		snap = {
			enabled = true,
		},
	},

	decoration = {
		rounding_power = 2.4,
		rounding = 6,

		blur = {
			enabled = true,
			size = 6,
			passes = 1,
			new_optimizations = true,

			brightness = 1,
			noise = 0.05,
			contrast = 0.89,
			vibrancy = 0.5,
			vibrancy_darkness = 0.5,

			popups = false,
			popups_ignorealpha = 0.6,
			input_methods = true,
			input_methods_ignorealpha = 0.8,
		},

		inactive_opacity = 0.94,
		active_opacity = 1.00,

		shadow = {
			enabled = true,
			range = 4,
			render_power = 2,
			color = 0xee1a1a1a,
		},

		dim_inactive = true,
		dim_strength = 0.05,
		dim_special = 0.08,
	},

	animations = {
		enabled = true,
	},

	misc = {
		font_family = "Inter Variable",
		disable_hyprland_guiutils_check = true,
		disable_hyprland_logo = true,

		mouse_move_enables_dpms = true,
		key_press_enables_dpms = true,

		focus_on_activate = true,
		mouse_move_focuses_monitor = false,

		on_focus_under_fullscreen = 2,
		initial_workspace_tracking = false,

		vrr = false,
	},
})

-- ── Layouts ──────────────────────────────────────────────────────────────────
hl.config({
	dwindle = {
		preserve_split = true,
		special_scale_factor = 0.92,
	},

	scrolling = {
		direction = "right",
	},
})

-- ── Gestures ─────────────────────────────────────────────────────────────────
hl.config({
	gestures = {
		workspace_swipe_distance = 700,
		workspace_swipe_cancel_ratio = 0.2,
		workspace_swipe_min_speed_to_force = 5,
		workspace_swipe_direction_lock = true,
		workspace_swipe_direction_lock_threshold = 10,
		workspace_swipe_create_new = true,
	},
})

-- ── Binds ────────────────────────────────────────────────────────────────────
hl.config({
	binds = {
		drag_threshold = 10,
		scroll_event_delay = 200,

		allow_pin_fullscreen = true,
		hide_special_on_workspace_change = true,
	},
})

-- ── Debug / XWayland ─────────────────────────────────────────────────────────
hl.config({
	debug = {
		overlay = false,
		damage_blink = false,
		disable_logs = true,
		enable_stdout_logs = true,
	},

	xwayland = {
		use_nearest_neighbor = false,
	},
})

-- ── Gestures (1:1 trackpad) ─────────────────────────────────────────────────
hl.gesture({ fingers = 3, direction = "swipe", action = "move" })
hl.gesture({ fingers = 3, direction = "pinch", action = "float" })
hl.gesture({ fingers = 4, direction = "horizontal", action = "workspace" })

-- ── Animations ───────────────────────────────────────────────────────────────
-- Curves
hl.curve("emphasizedDecel", { type = "bezier", points = { { 0.05, 0.7 }, { 0.1, 1 } } })
hl.curve("emphasizedAccel", { type = "bezier", points = { { 0.3, 0 }, { 0.8, 0.15 } } })
hl.curve("standardDecel", { type = "bezier", points = { { 0, 0 }, { 0, 1 } } })
hl.curve("menu_decel", { type = "bezier", points = { { 0.1, 1 }, { 0, 1 } } })
hl.curve("menu_accel", { type = "bezier", points = { { 0.52, 0.03 }, { 0.72, 0.08 } } })
hl.curve("playful", { type = "bezier", points = { { 0.18, 0.85 }, { 0.12, 1.04 } } })

-- Misc
hl.animation({ leaf = "fadeDim", enabled = true, speed = 4, bezier = "emphasizedDecel" })
hl.animation({ leaf = "fadeDpms", enabled = true, speed = 8, bezier = "emphasizedDecel" })
hl.animation({ leaf = "monitorAdded", enabled = true, speed = 5, bezier = "emphasizedDecel" })

-- Windows
hl.animation({ leaf = "windowsIn", enabled = true, speed = 5, bezier = "playful", style = "popin 84%" })
hl.animation({ leaf = "fadeIn", enabled = true, speed = 5, bezier = "emphasizedDecel" })
hl.animation({ leaf = "windowsOut", enabled = true, speed = 4, bezier = "emphasizedAccel", style = "popin 86%" })
hl.animation({ leaf = "fadeOut", enabled = false })
hl.animation({ leaf = "windowsMove", enabled = true, speed = 4, bezier = "emphasizedDecel", style = "slide" })

-- Layers
hl.animation({ leaf = "layersIn", enabled = true, speed = 3, bezier = "emphasizedDecel", style = "popin 92%" })
hl.animation({ leaf = "layersOut", enabled = true, speed = 3, bezier = "menu_decel", style = "popin 95%" })

-- Workspaces
hl.animation({ leaf = "workspaces", enabled = true, speed = 3, bezier = "emphasizedDecel", style = "slide" })
hl.animation({ leaf = "specialWorkspaceIn", enabled = true, speed = 3, bezier = "emphasizedDecel", style = "slidevert" })
hl.animation({
	leaf = "specialWorkspaceOut",
	enabled = true,
	speed = 3,
	bezier = "emphasizedAccel",
	style = "slidevert",
})

-- Polish
hl.animation({ leaf = "border", enabled = true, speed = 5, bezier = "standardDecel" })
hl.animation({ leaf = "borderangle", enabled = true, speed = 7, bezier = "standardDecel" })

-- ── Plugins ──────────────────────────────────────────────────────────────────
-- plugin {
--     hyprexpo {
--         columns = 3
--         gap_size = 5
--         bg_col = rgb(111111)
--         workspace_method = center current
--         enable_gesture = true
--     }
-- }

-- ── Keybinds ─────────────────────────────────────────────────────────────────
local mainMod = "SUPER"

-- Passthrough submap
hl.bind(mainMod .. " + Pause", hl.dsp.submap("clean"))
hl.define_submap("clean", function()
	hl.bind(mainMod .. " + Pause", hl.dsp.submap("reset"))
end)

-- Resize submap
hl.bind(mainMod .. " + R", hl.dsp.submap("resize"))
hl.define_submap("resize", function()
	local function resize(x, y)
		return hl.dsp.window.resize({ x = x, y = y, relative = true })
	end
	hl.bind("h", resize(10, 0), { repeating = true })
	hl.bind("l", resize(-10, 0), { repeating = true })
	hl.bind("k", resize(0, -10), { repeating = true })
	hl.bind("j", resize(0, 10), { repeating = true })
	hl.bind("right", resize(10, 0), { repeating = true })
	hl.bind("left", resize(-10, 0), { repeating = true })
	hl.bind("up", resize(0, -10), { repeating = true })
	hl.bind("down", resize(0, 10), { repeating = true })

	hl.bind("escape", hl.dsp.submap("reset"))
	hl.bind("Return", hl.dsp.submap("reset"))
	hl.bind("bracketleft", hl.dsp.layout("colresize -0.05"))
	hl.bind("bracketright", hl.dsp.layout("colresize +0.05"))
	hl.bind("0", hl.dsp.layout("colresize all 0.5"))
end)

-- Scrolling Fit submap (auto-close after dispatch)
hl.bind(mainMod .. " + W", hl.dsp.submap("fit"))
hl.define_submap("fit", "reset", function()
	hl.bind("a", hl.dsp.layout("fit active"))
	hl.bind("r", hl.dsp.layout("fit all"))
	hl.bind("v", hl.dsp.layout("fit visible"))
	hl.bind("b", hl.dsp.layout("fit tobeg"))
	hl.bind("e", hl.dsp.layout("fit toend"))
	hl.bind("escape", hl.dsp.submap("reset"))
	hl.bind("Return", hl.dsp.submap("reset"))
end)

-- ── Launchers ────────────────────────────────────────────────────────────────
hl.bind(mainMod .. " + Return", hl.dsp.exec_cmd("footclient"))
hl.bind(mainMod .. " + D", hl.dsp.exec_cmd("~/bin/launcher"))
hl.bind("CTRL + ALT + L", hl.dsp.exec_cmd("hyprlock"))
hl.bind(mainMod .. " + C", hl.dsp.exec_cmd("~/bin/clipboard"))
hl.bind(mainMod .. " + V", hl.dsp.exec_cmd("~/bin/zed-open /SAPDevelop/work/"))
hl.bind(mainMod .. " + N", hl.dsp.exec_cmd("~/.local/bin/dunstctl close-all"))

-- ── Window management ────────────────────────────────────────────────────────
hl.bind(mainMod .. " + F", hl.dsp.window.fullscreen({ mode = "fullscreen" }))
hl.bind(mainMod .. " + SHIFT + F", hl.dsp.window.fullscreen({ mode = "maximized" }))
hl.bind(mainMod .. " + P", hl.dsp.window.pin())
hl.bind(mainMod .. " + space", hl.dsp.layout("togglesplit"))
hl.bind(mainMod .. " + SHIFT + space", hl.dsp.window.float({ action = "toggle" }))
hl.bind(mainMod .. " + SHIFT + Q", hl.dsp.window.close())
hl.bind(mainMod .. " + SHIFT + E", hl.dsp.exec_cmd("uwsm stop"))
hl.bind(mainMod .. " + SHIFT + C", hl.dsp.exec_cmd("hyprctl reload"))

-- ── Scratchpad / special workspace ───────────────────────────────────────────
hl.bind(mainMod .. " + S", hl.dsp.window.move({ workspace = "special:scratchpad", follow = false }))
hl.bind(mainMod .. " + SHIFT + S", hl.dsp.exec_cmd("scratchpad -g"))
hl.bind(mainMod .. " + grave", hl.dsp.workspace.toggle_special(""))
hl.bind(mainMod .. " + SHIFT + grave", hl.dsp.window.move({ workspace = "special" }))

-- ── Screenshots ──────────────────────────────────────────────────────────────
hl.bind("Print", hl.dsp.exec_cmd("~/bin/grimblast edit active"))
hl.bind("SHIFT + Print", hl.dsp.exec_cmd("~/bin/grimblast save output | notify-send -t 'screenshot'"))
hl.bind("CTRL + Print", hl.dsp.exec_cmd("~/bin/grimblast edit area"))
hl.bind("ALT + Print", hl.dsp.exec_cmd("~/bin/grimblast edit area - | tesseract - - | wl-copy"))

-- ── Scrolling layout ─────────────────────────────────────────────────────────
hl.bind(mainMod .. " + SHIFT + P", hl.dsp.layout("promote"))
hl.bind(mainMod .. " + SHIFT + comma", hl.dsp.layout("swapcol l"))
hl.bind(mainMod .. " + SHIFT + period", hl.dsp.layout("swapcol r"))
hl.bind(mainMod .. " + CTRL + comma", hl.dsp.layout("movecoltoworkspace +1"))
hl.bind(mainMod .. " + CTRL + period", hl.dsp.layout("movecoltoworkspace -1"))

-- ── Navigation ───────────────────────────────────────────────────────────────
-- Directional binds: focus, swap, move window, move workspace
for _, d in ipairs({
	{ key = "left", arrow = true, dir = "l" },
	{ key = "right", arrow = true, dir = "r" },
	{ key = "up", arrow = true, dir = "u" },
	{ key = "down", arrow = true, dir = "d" },
	{ key = "h", dir = "l" },
	{ key = "l", dir = "r" },
	{ key = "k", dir = "u" },
	{ key = "j", dir = "d" },
}) do
	-- Focus: h/l use layout msgs (scrolling), arrows and j/k use movefocus
	if d.arrow then
		hl.bind(mainMod .. " + " .. d.key, hl.dsp.focus({ direction = d.dir }))
	elseif d.dir == "l" or d.dir == "r" then
		hl.bind(mainMod .. " + " .. d.key, hl.dsp.layout("focus " .. d.dir))
	else
		hl.bind(mainMod .. " + " .. d.key, hl.dsp.focus({ direction = d.dir }))
	end
	-- Swap: h/l use layout swapcol, j/k use window.swap (skip arrows)
	if not d.arrow then
		if d.dir == "l" or d.dir == "r" then
			hl.bind(mainMod .. " + CTRL + " .. d.key, hl.dsp.layout("swapcol " .. d.dir))
		else
			hl.bind(mainMod .. " + CTRL + " .. d.key, hl.dsp.window.swap({ direction = d.dir }))
		end
		-- Move window
		hl.bind(mainMod .. " + SHIFT + " .. d.key, hl.dsp.window.move({ direction = d.dir }))
		-- Move workspace to monitor
		hl.bind(mainMod .. " + ALT + " .. d.key, hl.dsp.workspace.move({ monitor = d.dir }))
	end
end

-- ── Workspaces ───────────────────────────────────────────────────────────────
for i = 1, 10 do
	local key = i % 10
	hl.bind(mainMod .. " + " .. key, hl.dsp.focus({ workspace = i }))
	hl.bind(mainMod .. " + SHIFT + " .. key, hl.dsp.window.move({ workspace = i }))
end

-- Scroll through workspaces
hl.bind(mainMod .. " + mouse_down", hl.dsp.focus({ workspace = "e+1" }))
hl.bind(mainMod .. " + mouse_up", hl.dsp.focus({ workspace = "e-1" }))

-- Mouse move/resize
hl.bind(mainMod .. " + mouse:272", hl.dsp.window.drag(), { mouse = true })
hl.bind(mainMod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

-- ── System / media ───────────────────────────────────────────────────────────
hl.bind(
	mainMod .. " + SHIFT + F4",
	hl.dsp.exec_cmd("sudo systemctl suspend || loginctl suspend"),
	{ locked = true, description = "Suspend system" }
)

local lr = { locked = true, repeating = true }
local lk = { locked = true }
hl.bind("XF86MonBrightnessUp", hl.dsp.exec_cmd("brightnessctl -q s +5%"), lr)
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd("brightnessctl -q s 5%-"), lr)
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 3%+"), lr)
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 3%-"), lr)
hl.bind("XF86AudioMute", hl.dsp.exec_cmd("wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle"), lk)
hl.bind("XF86AudioMicMute", hl.dsp.exec_cmd("wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle"), lk)
hl.bind("XF86AudioPlay", hl.dsp.exec_cmd("playerctl play-pause"), lk)
hl.bind("XF86AudioNext", hl.dsp.exec_cmd("playerctl next"), lk)
hl.bind("XF86AudioPrev", hl.dsp.exec_cmd("playerctl previous"), lk)

-- ── Config reload notification ───────────────────────────────────────────────
hl.on("config.reloaded", function()
	hl.notification.create({ text = "Config reloaded", timeout = 1500, icon = "ok" })
end)

-- ── Layer rules ──────────────────────────────────────────────────────────────
hl.layer_rule({ match = { namespace = "hyprpicker" }, no_anim = true })
hl.layer_rule({ match = { namespace = "launcher" }, dim_around = true, blur = true, no_anim = true })

-- ── Window rules ─────────────────────────────────────────────────────────────

-- Global
hl.window_rule({ match = { class = "^()$", title = "^()$" }, no_blur = true })
hl.window_rule({ match = { float = false }, no_shadow = true })
hl.window_rule({ match = { float = true }, persistent_size = true })

-- XWayland
hl.window_rule({
	name = "fix-xwayland-drags",
	match = {
		class = "^$",
		title = "^$",
		xwayland = true,
		float = true,
		fullscreen = false,
		pin = false,
	},
	no_focus = true,
})
hl.window_rule({ match = { xwayland = true }, float = true })

-- Slack
hl.window_rule({ match = { class = "com.slack.Slack" }, workspace = "special", opacity = "0.90" })

-- Float-only apps
local float_classes = {
	"adriconf",
	"dconf-editor",
	"kvantum.*",
	"modem-manager-gui",
	"nm-connection-editor",
	"seahorse",
	"com.github.tchx84.Flatseal",
	"io.github.ebonjaeger.bluejay",
	"eog",
	"evince",
	"org.pwmt.zathura",
	"com.stremio.Stremio",
	"(?i)iwgtk",
	"org.twosheds.iwgtk",
	"pavucontrol",
	"com.saivert.pwvucontrol",
	"hyprpwcenter",
	"hyprland-share-picker",
	"file-roller",
	"gedit",
	"(?i)keybase",
	"Standard Notes",
	"(?i)xeyes",
	"gnome-.*",
	"org.gnome.*",
	"org.kde.*",
}
hl.window_rule({ match = { class = "^(" .. table.concat(float_classes, "|") .. ")$" }, float = true })

-- Sized floats
local sized_floats = {
	{ "gnome-calculator|org.gnome.Calculator", 0.23, 0.32, 0.40, 0.20 },
	{ "org.gnome.Nautilus|org.kde.dolphin", 0.60, 0.50, 0.10, 0.10 },
	{ "mpv|imv", 0.60, 0.53, 0.20, 0.10 },
	{ "bluetui|wiremix|yazi", 0.60, 0.50, 0.20, 0.10 },
}
for _, f in ipairs(sized_floats) do
	hl.window_rule({
		match = { class = "^(" .. f[1] .. ")$" },
		float = true,
		size = string.format("(monitor_w*%g) (monitor_h*%g)", f[2], f[3]),
		move = string.format("(monitor_w*%g) (monitor_h*%g)", f[4], f[5]),
	})
end
hl.window_rule({ match = { class = "waypaper" }, float = true })

hl.window_rule({ match = { class = "^(microsoft-edge|msedge-.*)$" }, persistent_size = false })

-- Zoom
hl.window_rule({ match = { class = "(?i)^zoom$" }, float = true, suppress_event = "activate", persistent_size = false })
hl.window_rule({
	match = { class = "(?i)^zoom$", initial_title = "(?i)^Zoom Workplace$" },
	size = "1230 723",
	content = "video",
	center = true,
})
hl.window_rule({
	match = { class = "(?i)^zoom$", initial_title = "^as_toolbar$" },
	move = "(monitor_w*0.5-387) (40)",
	pin = true,
	no_blur = true,
	no_initial_focus = true,
})
hl.window_rule({
	match = { class = "(?i)^zoom$", initial_title = "^zoom_linux_float_video_window$" },
	content = "video",
	size = "212 155",
	move = "(monitor_w-222) (monitor_h-195)",
	pin = true,
	no_initial_focus = true,
})
hl.window_rule({
	match = { class = "(?i)^zoom$", initial_title = "^zoom_linux_float_message_reminder$" },
	no_initial_focus = true,
})

-- Steam
hl.window_rule({ match = { class = "(steam|gamescope|zenity)" }, float = true })
hl.window_rule({ match = { title = "^$", class = "steam" }, min_size = { 1, 1 }, stay_focused = true })

-- Firefox
hl.window_rule({ match = { class = "^firefox(-nightly)?$", title = "^Extension: .*$" }, float = true })
hl.window_rule({
	match = { class = "^firefox(-nightly)?$", title = "^(About Mozilla Firefox|About Firefox Nightly)$" },
	float = true,
	size = "750 350",
})
hl.window_rule({
	name = "firefox-pip",
	match = { class = "^firefox(-nightly)?$", initial_title = "^Picture-in-Picture$" },
	float = true,
	border_size = 0,
	keep_aspect_ratio = true,
})

-- GTK file dialogs
hl.window_rule({
	match = { title = "^Open (File|Folder)$" },
	float = true,
	size = "(monitor_w*0.5) (monitor_h*0.65)",
})
hl.window_rule({
	match = { class = "xdg-desktop-portal-gtk" },
	float = true,
	size = "(monitor_w*0.5) (monitor_h*0.65)",
})
