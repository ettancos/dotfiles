local M = {}

local function parse_coauthors_from_file(path)
	local ok, lines = pcall(vim.fn.readfile, path)
	if not ok then
		return {}
	end

	local results = {}
	for _, line in ipairs(lines) do
		local name, email = line:match("^#%s*Co%-Authored%-By:%s*(.+)%s+<([^>]+)>")
		if name and email then
			table.insert(results, { name = name, email = email })
		end
	end

	return results
end

local function load_coauthors()
	local path = vim.fn.expand("~/.config/git/co-authors")
	local ok, lines = pcall(vim.fn.readfile, path)
	if not ok then
		return {}
	end

	local results = {}
	for _, line in ipairs(lines) do
		local name, email = line:match("^%s*(.+)%s+<([^>]+)>")
		if name and email then
			table.insert(results, { name = name, email = email })
		end
	end

	return results
end

M.coauthors = load_coauthors()

local function format_entry(entry)
	return string.format("%s <%s>", entry.name, entry.email)
end

local function insert_trailer(buf, trailer)
	local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
	for _, line in ipairs(lines) do
		if vim.trim(line) == trailer then
			return
		end
	end

	local insert_lines = {}
	if #lines == 0 or vim.trim(lines[#lines]) ~= "" then
		table.insert(insert_lines, "")
	end
	table.insert(insert_lines, trailer)

	vim.api.nvim_buf_set_lines(buf, #lines, #lines, false, insert_lines)
end

function M.insert(buf, entry)
	local trailer = "Co-authored-by: " .. format_entry(entry)
	insert_trailer(buf, trailer)
end

function M.pick_and_insert(buf)
	vim.ui.select(M.coauthors, {
		prompt = "Select co-author",
		format_item = function(item)
			return format_entry(item)
		end,
	}, function(choice)
		if not choice then
			return
		end
		M.insert(buf, choice)
	end)
end

vim.api.nvim_create_user_command("CoAuthor", function()
	M.pick_and_insert(0)
end, { desc = "Insert Co-authored-by trailer" })

vim.api.nvim_create_autocmd("FileType", {
	pattern = "gitcommit",
	callback = function(ev)
		vim.keymap.set("n", "<leader>ga", function()
			M.pick_and_insert(ev.buf)
		end, { buffer = ev.buf, desc = "Insert Co-author" })
	end,
})

return M
