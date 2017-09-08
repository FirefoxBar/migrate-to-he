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

	var fileElm = document.getElementById('file');
	// Load a db from a file
	fileElm.onchange = function() {
		var f = fileElm.files[0];
		var r = new FileReader();
		r.onload = function() {
			convert(r.result);
		}
		r.readAsText(f);
	}

	function convert(rs) {
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
			if (item.processMatches === 'noProcessing') {
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
				} else if (item.processMatches === 'urlDecode') {
					functionName = 'decodeURIComponent';
				} else {
					continue;
				}
				newItem.code = '';
				newItem.code += "let result = '" + item.redirectUrl + "';\n";
				newItem.code += "let r = val.match(new RegExp('" + matchReg + "'));\n";
				newItem.code += "for (let i = 1; i < r.length; i++) {\n";
				newItem.code += "\tresult = result.replace(new RegExp('\\\\$' + i, 'g'), " + functionName + "(r[i]));\n";
				newItem.code += "}\n";
				newItem.code += 'return result';
			}
			r.push(newItem);
		}
		download('headereditor.json', JSON.stringify({"request": r,"sendHeader": [],"receiveHeader": []}));
	};

	function download(name, content) {
		var a = document.getElementById('download');
		var blob = new Blob([content]);
		var evt = document.createEvent("MouseEvents");
		evt.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		evt.initEvent("click", false, false);
		a.download = name;
		a.href = URL.createObjectURL(blob);
		document.getElementById('download-label').style.display = "block";
		a.dispatchEvent(evt);
	};
});