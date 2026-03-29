return {
	"stevearc/conform.nvim",
	opts = {},
	config = function()
		require("conform").setup({
			format_on_save = {
				timeout_ms = 5000,
				lsp_format = "fallback",
			},
			formatters_by_ft = {
				c = { "clang-format" },
				cpp = { "clang-format" },
				go = { "gofmt" },
				--				hyprlang = { "hyprfmt" },
				lua = { "stylua" },
				rust = { "rustfmt" },
				javascript = { "prettierd", "prettier", stop_after_first = true },
				python = {
					"ruff_fix",
					"ruff_format",
					"ruff_organize_imports",
				},
			},
			formatters = {
				["clang-format"] = {
					prepend_args = { "-style=file", "-fallback-style=LLVM" },
				},
				hyprfmt = {
					--					command = "hyprfmt",
					--				  args = { "--align", "--sort-sections", "$FILENAME" },
					--					stdin = true,
				},
			},
		})

		vim.keymap.set("n", "<leader>t", function()
			require("conform").format({ bufnr = 0 })
		end)
	end,
}
