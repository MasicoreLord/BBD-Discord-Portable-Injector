const fs = require("fs");
const eol = require("os").EOL;
const path = require("path");
const request = require(path.join(__dirname, "../../app_orig/node_modules/request")).defaults({headers: {"User-Agent": "BandagedBD"}});

/* eslint-disable no-console */

const dummyWindow = {
    webContents: {
        executeJavaScript: function(){}
    }
};

module.exports = class Utils {

    static get browserWindow() {return this._window || dummyWindow;}
    static setWindow(window) {this._window = window;}
    static get webContents() {return this.browserWindow.webContents;}

    static getFile(url) {
        return new Promise(resolve => {
            request.get(url, function(error, response, body) {
                if (error || 200 !== response.statusCode) return resolve(null);
				resolve(body);
            });
        });
    }

    static testJSON(data) {
        try {
            JSON.parse(data);
            return true;
        }
        catch (error) {
            return false;
        }
    }

	static async getCommitHash(repo, branch) {
		const url = this.formatString("https://api.github.com/repos/{{repo}}/BetterDiscordApp/commits/{{branch}}", {repo, branch});
		this.log("Getting hash from: " + url);
		const data = await this.getFile(url);
		if (!this.testJSON(data)) return null;
		const parsed = JSON.parse(data);
		if (!parsed) return null;
		return parsed.sha;
	}

    static async getUpdater(repo, branch) {
        let hash = await this.getCommitHash(repo, branch);
        if (!hash) hash = "injector";
		const url = this.formatString("https://cdn.statically.io/gh/{{repo}}/BetterDiscordApp/{{hash}}/betterdiscord/config.json", {repo, hash});
		this.log("Getting version from: " + url);
        const data = await this.getFile(url);
        if (!this.testJSON(data)) return null;
        return JSON.parse(data);
    }

    static runJS(js) {
        return this.webContents.executeJavaScript(js);
    }

    //Inject variable
    static injectVariable(variable, data) {
        this.runJS(`var ${variable} = ${JSON.stringify(data)}`);
    }

    static injectVariableRaw(variable, data) {
        this.runJS(`var ${variable} = ${data}`);
    }

    static injectStyle(url) {
        return this.runJS(`new Promise((resolve, reject) => {
            var link = document.createElement("link");
            link.rel = "stylesheet";
            link.onload = resolve;
            link.onerror = reject;
            link.href = "${url}";
            document.head.appendChild(link);
        });`);
    }

    static injectScript(url) {
        return this.runJS(`new Promise((resolve, reject) => {
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.onload = resolve;
            script.onerror = reject;
            script.src = "${url}";
            document.body.appendChild(script);
        });`);
    }

    static makeFolder(path) {
        if (fs.existsSync(path)) return;
        this.log("Directory " + path + " does not exist. Creating");
        try {
            fs.mkdirSync(path);
        }
        catch (err) {
            this.error(err);
        }
    }

	static formatString(string, values) {
        for (let val in values) {
            string = string.replace(new RegExp(`{{${val}}}`, "g"), values[val]);
        }
        return string;
    }


    //Logger
    static log(message) {
        this._log(`[INF][${(new Date()).toLocaleString()}] ${message}${eol}`);
    }

    static error(err) {
        this._log(`[ERR][${(new Date()).toLocaleString()}] ${err.message}${eol}`);
    }

    static warn(message) {
        this._log(`[WRN][${(new Date()).toLocaleString()}] ${message}${eol}`);
    }

    static _log(message) {
        console.log("[BetterDiscord]" + message);
        if (!this.logFile) return;
        this.logData += message;
    }

    static setLogFile(file) {
        this.logFile = file;
        this.logData = "";
        fs.writeFileSync(file, this.logData);
    }

    static saveLogs() {
        fs.writeFileSync(this.logFile, this.logData);
    }
};