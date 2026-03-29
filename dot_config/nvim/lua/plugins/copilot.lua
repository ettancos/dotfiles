return {
	-- {
	-- 	"github/copilot.vim",
	-- 	lazy = false,
	-- 	-- opts = {}
	-- },
	{
		"zbirenbaum/copilot.lua",
		cmd = "Copilot",
		event = "InsertEnter",
		lazy = false,
		opts = {
			suggestion = { enabled = false },
			panel = { enabled = false },
			-- Allow Copilot on all filetypes (except ones you explicitly disable)
			filetypes = nil,
			logger = {
				file_log_level = vim.log.levels.INFO,
				log_lsp_messages = false,
			},
		},
	},
	{
		"saghen/blink.cmp",
		-- optional = true,
		dependencies = {
			"fang2hou/blink-copilot",
			"marcoSven/blink-cmp-yanky",
			"bydlw98/blink-cmp-env",
		},
		lazy = false,
		version = "1.*",
		build = "cargo build --release",
		opts = {
			fuzzy = { implementation = "prefer_rust_with_warning" },
			sources = {
				default = { "lsp", "path", "snippets", "buffer", "yank", "env", "copilot" },
				-- default = { "copilot" },
				providers = {
					copilot = {
						name = "copilot",
						module = "blink-copilot",
						score_offset = 100,
						async = true,
					},
					yank = {
						name = "yank",
						module = "blink-yanky",
						opts = {
							minLength = 5,
							onlyCurrentFiletype = true,
							trigger_characters = { '"' }, -- default is no trigger character
						},
					},
					env = {
						name = "Env",
						module = "blink-cmp-env",
						--- @type blink-cmp-env.Options
						opts = {
							item_kind = function()
								return require("blink.cmp.types").CompletionItemKind.Variable
							end,
							show_braces = false,
							show_documentation_window = true,
						},
					},
				},
			},
		},
	},
}
