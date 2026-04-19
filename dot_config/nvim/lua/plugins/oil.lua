return {
	{
		"stevearc/oil.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons" },
		lazy = false,
		---@module 'oil'
		---@type oil.SetupOpts
		opts = {
			default_file_explorer = true,
			columns = {
				"icon",
			},
			delete_to_trash = true,
			skip_confirm_for_simple_edits = true,
			watch_for_changes = true,
			view_options = {
				show_hidden = true,
				natural_order = true,
			},
			float = {
				padding = 2,
				max_width = 120,
				max_height = 30,
				border = "rounded",
			},
			keymaps = {
				["q"] = { "actions.close", mode = "n" },
				["<Esc>"] = { "actions.close", mode = "n" },
				["<C-p>"] = "actions.preview",
				["<C-h>"] = false, -- free up for window nav
				["<C-l>"] = false, -- free up for window nav
				["<C-s>"] = { "actions.select", opts = { horizontal = true } },
				["<C-v>"] = { "actions.select", opts = { vertical = true } },
				["H"] = { "actions.toggle_hidden", mode = "n" },
				["gs"] = { "actions.change_sort", mode = "n" },
				["gy"] = {
					callback = function()
						local oil = require("oil")
						local entry = oil.get_cursor_entry()
						local dir = oil.get_current_dir()
						if entry and dir then
							local path = dir .. entry.name
							vim.fn.setreg("+", path)
							vim.notify("Copied: " .. path, vim.log.levels.INFO)
						end
					end,
					desc = "Yank absolute path",
					mode = "n",
				},
				["gY"] = {
					callback = function()
						local oil = require("oil")
						local entry = oil.get_cursor_entry()
						local dir = oil.get_current_dir()
						if entry and dir then
							local path = vim.fn.fnamemodify(dir .. entry.name, ":~:.")
							vim.fn.setreg("+", path)
							vim.notify("Copied: " .. path, vim.log.levels.INFO)
						end
					end,
					desc = "Yank relative path",
					mode = "n",
				},
				["<leader>cd"] = {
					callback = function()
						local oil = require("oil")
						local dir = oil.get_current_dir()
						if dir then
							vim.cmd("cd " .. dir)
							vim.notify("cd → " .. dir, vim.log.levels.INFO)
						end
					end,
					desc = "cd to this directory",
					mode = "n",
				},
				["<leader>t"] = {
					callback = function()
						local oil = require("oil")
						local dir = oil.get_current_dir()
						if dir then
							oil.close()
							Snacks.terminal(nil, { cwd = dir })
						end
					end,
					desc = "Terminal in this directory",
					mode = "n",
				},
				["<leader>ff"] = {
					callback = function()
						local oil = require("oil")
						local dir = oil.get_current_dir()
						if dir then
							oil.close()
							Snacks.picker.files({ cwd = dir })
						end
					end,
					desc = "Find files in this directory",
					mode = "n",
				},
				["<leader>/"] = {
					callback = function()
						local oil = require("oil")
						local dir = oil.get_current_dir()
						if dir then
							oil.close()
							Snacks.picker.grep({ cwd = dir })
						end
					end,
					desc = "Grep in this directory",
					mode = "n",
				},
			},
		},
		keys = {
			{
				"-",
				"<cmd>Oil<cr>",
				desc = "Open parent directory (Oil)",
			},
			{
				"<leader>o",
				"<cmd>Oil --float<cr>",
				desc = "File Explorer (Oil float)",
			},
		},
	},
}
