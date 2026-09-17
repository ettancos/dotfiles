-- Monitor profile management
-- Profiles: first match wins, most-specific (most monitors) first.
-- Each output.match is checked against monitor .name and .description.

local monitor_profiles = {
	{
		name = "office-2x27-hdmi",
		outputs = {
			{ match = "DELL U2722DE", position = "0x0", scale = 1.0 },
			{ match = "HDMI-A-1", position = "2560x0", scale = 1.0 },
			{ match = "eDP-1", position = "500x1440", scale = 1.0 },
		},
	},
	{
		name = "office-2x27",
		outputs = {
			{ match = "DELL U2722DE", position = "2560x0", scale = 1.0 },
			{ match = "DELL U2722DE", position = "0x0", scale = 1.0 },
			{ match = "eDP-1", position = "2000x1440", scale = 1.0 },
		},
	},
	{
		name = "office-27",
		outputs = {
			{ match = "DELL U2722DE", position = "auto", scale = 1.0 },
			{ match = "eDP-1", position = "auto-center-down", scale = 1.0 },
		},
	},
	{
		name = "office-38",
		outputs = {
			{ match = "DELL U3821DW", position = "auto", scale = 1.0 },
			{ match = "eDP-1", position = "auto-center-down", scale = 1.0 },
		},
	},
	{
		name = "office-34",
		outputs = {
			{ match = "DELL U3421WE", position = "auto", scale = 1.0 },
			{ match = "eDP-1", position = "auto-center-down", scale = 1.0 },
		},
	},
	{
		name = "office-hu-34",
		outputs = {
			{ match = "DELL P3424WEB", position = "auto", scale = 1.0 },
			{ match = "eDP-1", position = "auto-center-down", scale = 1.0 },
		},
	},
	{
		name = "home-msi",
		outputs = {
			{ match = "MPG321UX", position = "auto", mode = "3840x2160@240", cm = "hdr", bitdepth = 10, scale = 1.25 },
			{ match = "eDP-1", position = "auto-right", scale = 1.0 },
		},
	},
	{
		name = "home-hdmi",
		outputs = {
			{ match = "HDMI-A-1", position = "auto", scale = 1.0 },
			{ match = "eDP-1", position = "auto-right", scale = 1.0 },
		},
	},
	{
		name = "single",
		outputs = {
			{ match = "eDP-1", position = "auto", mode = "preferred", scale = 1.0 },
		},
	},
}

local function monitor_matches(mon, pattern)
	return mon.name == pattern or (mon.description and mon.description:find(pattern, 1, true))
end

local function monitors_ready(monitors)
	if #monitors == 0 then
		return false
	end

	for _, mon in ipairs(monitors) do
		if not mon.enabled or mon.width <= 0 or mon.height <= 0 then
			return false
		end
	end

	return true
end

local function apply_monitor_profile(notify, monitors)
	monitors = monitors or hl.get_monitors()
	for _, profile in ipairs(monitor_profiles) do
		local claimed = {}
		local all_matched = true
		for _, output in ipairs(profile.outputs) do
			local found = false
			for j, mon in ipairs(monitors) do
				if not claimed[j] and monitor_matches(mon, output.match) then
					claimed[j] = output
					found = true
					break
				end
			end
			if not found then
				all_matched = false
				break
			end
		end
		if all_matched and #profile.outputs == #monitors then
			for j, mon in pairs(claimed) do
				hl.monitor({
					output = monitors[j].name,
					mode = "preferred",
					position = mon.position,
					scale = mon.scale,
				})
			end
			if notify then
				hl.exec_cmd('notify-send hyprland "Monitor profile: ' .. profile.name .. '"')
			end
			return
		end
	end
end

local DEBOUNCE_MS = 1000

local pending_notification = false
local profile_timer

local function schedule_monitor_profile(notify)
	pending_notification = pending_notification or notify
	profile_timer:set_timeout(DEBOUNCE_MS)
end

profile_timer = hl.timer(function()
	local notify = pending_notification
	pending_notification = false
	profile_timer:set_enabled(false)

	local monitors = hl.get_monitors()
	if monitors_ready(monitors) then
		apply_monitor_profile(notify, monitors)
	end
end, {
	timeout = DEBOUNCE_MS,
	type = "repeat",
})
profile_timer:set_enabled(false)

hl.on("monitor.added", function()
	schedule_monitor_profile(true)
end)
hl.on("monitor.removed", function()
	schedule_monitor_profile(true)
end)
schedule_monitor_profile(false) -- silent after initial state settles
