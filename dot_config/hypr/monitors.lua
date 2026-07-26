-- Monitor profile management
-- Profiles: first match wins, most-specific (most monitors) first.
-- Each output.match is checked against monitor .name and .description.

local monitor_profiles = {
	{ name = "office-2x27-hdmi", outputs = {
		{ match = "DELL U2722DE", position = "0x0",      scale = 1.0 },
		{ match = "HDMI-A-1",     position = "2560x0",   scale = 1.0 },
		{ match = "eDP-1",        position = "500x1440", scale = 1.0 },
	}},
	{ name = "office-2x27", outputs = {
		{ match = "DELL U2722DE", position = "2560x0",    scale = 1.0 },
		{ match = "DELL U2722DE", position = "0x0",       scale = 1.0 },
		{ match = "eDP-1",        position = "2000x1440", scale = 1.0 },
	}},
	{ name = "office-27", outputs = {
		{ match = "DELL U2722DE", position = "0x0",     scale = 1.0 },
		{ match = "eDP-1",        position = "0x1440",  scale = 1.0 },
	}},
	{ name = "office-38", outputs = {
		{ match = "DELL U3821DW", position = "0x0",      scale = 1.0 },
		{ match = "eDP-1",        position = "860x1600", scale = 1.0 },
	}},
	{ name = "office-34", outputs = {
		{ match = "DELL U3421WE", position = "0x0",      scale = 1.0 },
		{ match = "eDP-1",        position = "860x1440", scale = 1.0 },
	}},
	{ name = "office-hu-34", outputs = {
		{ match = "DELL P3424WEB", position = "0x0",      scale = 1.0 },
		{ match = "eDP-1",         position = "860x1440", scale = 1.0 },
	}},
	{ name = "home", outputs = {
		{ match = "DELL P2419H", position = "0x0",    scale = 1.0 },
		{ match = "eDP-1",       position = "1920x0", scale = 1.0 },
	}},
	{ name = "home2", outputs = {
		{ match = "HDMI-A-1", position = "0x0",    scale = 1.0 },
		{ match = "eDP-1",    position = "0x1080", scale = 1.0 },
	}},
	{ name = "single", outputs = {
		{ match = "eDP-1", position = "0x0", scale = 1.0 },
	}},
}

local function monitor_matches(mon, pattern)
	return mon.name == pattern
		or (mon.description and mon.description:find(pattern, 1, true))
end

local function apply_monitor_profile(notify)
	local monitors = hl.get_monitors()
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
			if not found then all_matched = false; break end
		end
		if all_matched and #profile.outputs == #monitors then
			for j, mon in pairs(claimed) do
				hl.monitor({
					output   = monitors[j].name,
					mode     = "preferred",
					position = mon.position,
					scale    = mon.scale,
				})
			end
			if notify then
				hl.exec_cmd('notify-send hyprland "Monitor profile: ' .. profile.name .. '"')
			end
			return
		end
	end
end

hl.on("monitor.added",   function() apply_monitor_profile(true) end)
hl.on("monitor.removed", function() apply_monitor_profile(true) end)
apply_monitor_profile(false) -- silent on load/reload
