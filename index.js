//languages
var languages = {'zh-CN': 'index.html', 'zh-TW': 'index_zh_tw.html', 'en': 'index_en.html'};
if (!window.location.search.includes('force-language')) {
	var language = navigator.language;
	if (typeof(languages[language]) === 'undefined') {
		language = 'en';
	}
	if (current_language !== language) {
		window.location.href = languages[language];
	}
}

document.addEventListener("DOMContentLoaded", function() {
	// stat
	if (navigator.doNotTrack != 1) {
		var hm = document.createElement("script");
		hm.src = "https://hm.baidu.com/hm.js?eddab75c23e1853a476011bb95a585c9";
		document.head.appendChild(hm);
	}

	const handler = [
		// Redirector
		rs => {
			let n = JSON.parse(rs);
			let r = [];
			for (let item of n.redirects) {
				let newItem = {
					"name": item.description,
					"ruleType": "redirect",
					"matchType": "regexp",
					"pattern": "",
					"isFunction": 0,
					"enable": item.disabled ? 0 : 1,
					"action": "redirect"
				};
				if (item.patternType === 'W') {
					newItem.pattern = item.includePattern.replace(/\*/g, '(.*?)');
					newItem.exclude = item.excludePattern.replace(/\*/g, '(.*?)');
				} else {
					newItem.pattern = item.includePattern;
					newItem.exclude = item.excludePattern;
				}
				if (item.processMatches === 'noProcessing' || item.processMatches === 'urlDecode') {
					newItem.to = item.redirectUrl;
				} else {
					newItem.isFunction = 1;
					let matchReg = '';
					if (item.patternType === 'W') {
						matchReg = item.includePattern.replace(/\*/g, '(.*?)');
					} else {
						matchReg = item.includePattern;
					}
					let functionName = '';
					if (item.processMatches === 'urlEncode') {
						functionName = 'encodeURIComponent';
					} else {
						continue;
					}
					newItem.code = '';
					newItem.code += "let result = '" + item.redirectUrl + "';\n";
					newItem.code += "let r = val.match(new RegExp('" + matchReg + "'));\n";
					newItem.code += "for (let i = 1; i < r.length; i++) {\n";
					newItem.code += "\tresult = result.replace(new RegExp('\\\\$' + i, 'g'), " + functionName + "(r[i]));\n";
					newItem.code += "}\n";
					newItem.code += 'return result;';
				}
				r.push(newItem);
			}
			return JSON.stringify({"request": r,"sendHeader": [],"receiveHeader": []});
		},
		// URLRedirector
		rs => {
			let n = JSON.parse(rs);
			let r = [];
			for (let item of n.rules) {
				r.push(newItem = {
					"name": item.description,
					"ruleType": "redirect",
					"matchType": "regexp",
					"pattern": item.origin,
					"exclude": item.exclude,
					"to": item.target,
					"isFunction": 0,
					"enable": item.enable ? 1 : 0,
					"action": "redirect"
				});
			}
			return JSON.stringify({"request": r,"sendHeader": [],"receiveHeader": []});
		},
		// Redirect.uc.js
		rs => {
			rs = rs.substr(rs.indexOf('[')).trim();
			while (rs[rs.length - 1] !== ']') {
				rs = rs.substr(0, rs.length - 1);
			}
			let n = null;
			try {
				n = eval('(' + rs + ')');
			} catch (e) {
				alert('Error');
			}
			let r = [];
			for (let item of n) {
				let newItem = {
					"name": item.name,
					"ruleType": "redirect",
					"matchType": "",
					"pattern": "",
					"isFunction": 0,
					"enable": 1,
					"to": item.to,
					"action": "redirect"
				};
				if (item.wildcard) {
					newItem.matchType = "regexp";
					newItem.pattern = item.from.replace(/\*/g, '(.*?)');
					newItem.exclude = item.exclude ? item.exclude.replace(/\*/g, '(.*?)') : '';
				} else if (item.regex) {
					newItem.matchType = "regexp";
					newItem.pattern = item.from.source;
					newItem.exclude = item.exclude ? item.exclude.source : '';
				} else {
					newItem.matchType = "url";
					newItem.pattern = item.from;
					newItem.exclude = item.exclude ? item.exclude : '';
				}
				r.push(newItem);
			}
			return JSON.stringify({"request": r,"sendHeader": [],"receiveHeader": []});
		},
		// ModHeader
	  rs => {
			rs = JSON.parse(rs);
			const result = {
				request: [],
				sendHeader: [],
				receiveHeader: []
			};

			for (const profile of rs) {
				const title = profile;
				const basicRule = {
					"name": "",
					"ruleType": "redirect",
					"matchType": "",
					"pattern": "",
					"isFunction": 0,
					"enable": 1,
					"group": title,
				};
				if (profile.urlFilters) {
					const item = profile.urlFilters.find(x => x.enable);
					if (item) {
						basicRule.matchType = "regexp";
						basicRule.pattern = item.urlRegex;
					} else {
						basicRule.matchType = "all";
					}
				} else {
					basicRule.matchType = "all";
				}
				// Send Header
				if (Array.isArray(profile.headers)) {
					for (const header of profile.headers) {
						result.sendHeader.push({
							...basicRule,
							name: title + '-' + header.name,
							ruleType: "modifySendHeader",
							enabled: header.enabled ? 1 : 0,
							action: {
								name: header.name,
								value: header.value,
							},
						});
					}
				}
				// Response Header
				if (Array.isArray(profile.respHeaders)) {
					for (const header of profile.respHeaders) {
						result.receiveHeader.push({
							...basicRule,
							name: title + '-' + header.name,
							ruleType: "modifyReceiveHeader",
							enabled: header.enabled ? 1 : 0,
							action: {
								name: header.name,
								value: header.value,
							},
						});
					}
				}
				// Redirect
				if (Array.isArray(profile.urlReplacements)) {
					for (const item of profile.urlReplacements) {
						result.request.push({
							...basicRule,
							name: title + '-' + item.name,
							ruleType: "redirect",
							pattern: item.name,
							to: item.value,
							enabled: item.enabled ? 1 : 0,
						});
					}
				}
			}
			return JSON.stringify(result);
		}
	];

	function initConvert(index) {
		const trigger = document.getElementById('file-' + index);
		if (!trigger) {
			return;
		}
		trigger.onchange = function() {
			var f = this.files[0];
			var r = new FileReader();
			r.onload = function() {
				const content = handler[index](r.result);
				// start download
				const a = document.getElementById('download-' + index);
				const blob = new Blob([content]);
				a.download = name;
				a.href = URL.createObjectURL(blob);
				document.getElementById('download-label-' + index).style.display = "block";
				a.click();
			}
			r.readAsText(f);
		};
	}

	for (let i = 1; i <= 4; i++) {
		initConvert(i);
	}
});