/** Obsidian's common date tokens, in local time, without a date-library bundle. */
export function dailyNoteName(date: Date, format = "YYYY-MM-DD") {
	const pattern = format.trim() || "YYYY-MM-DD";
	const tokens: Record<string, string> = {
		YYYY: String(date.getFullYear()),
		MM: String(date.getMonth() + 1).padStart(2, "0"),
		DD: String(date.getDate()).padStart(2, "0"),
	};
	const name = pattern.replace(/YYYY|MM|DD/g, (token) => tokens[token]);
	if (
		/[A-Za-z<>:"|?*]/.test(name) ||
		Array.from(name).some((char) => char.charCodeAt(0) < 32) ||
		/(^|[\\/])\.{1,2}([\\/]|$)/.test(name) ||
		/^[\\/]/.test(name) ||
		/[\\/]$/.test(name)
	)
		throw Error("日记命名仅支持 YYYY、MM、DD 及相对路径分隔符，不能包含非法文件名字符");
	return name.replace(/\\/g, "/");
}

/** Quick-capture filenames support date and time tokens plus vault-relative folders. */
export function quickCaptureName(date: Date, format = "YYYY-MM-DD") {
	const pattern = format.trim() || "YYYY-MM-DD";
	const tokens: Record<string, string> = {
		YYYY: String(date.getFullYear()),
		MM: String(date.getMonth() + 1).padStart(2, "0"),
		DD: String(date.getDate()).padStart(2, "0"),
		HH: String(date.getHours()).padStart(2, "0"),
		mm: String(date.getMinutes()).padStart(2, "0"),
		ss: String(date.getSeconds()).padStart(2, "0"),
	};
	const name = pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token]);
	if (
		/[<>:"|?*]/.test(name) ||
		Array.from(name).some((char) => char.charCodeAt(0) < 32) ||
		/(^|[\\/])\.{1,2}([\\/]|$)/.test(name) ||
		/^[\\/]/.test(name) ||
		/[\\/]$/.test(name)
	)
		throw Error("速记命名格式包含不支持的路径或文件名字符");
	return name.replace(/\\/g, "/");
}
