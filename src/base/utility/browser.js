define && define({
    name: "browser",
    namespace: "base.utility",
    $browser: function () {
        // 获取浏览器信息.
        // IE 8下，以documentMode为准
        // 在百度模板中，可能会有$，防止冲突，将$1 写成 \x241
        if (/msie (\d+\.\d)/i.test(navigator.userAgent)) {
            this.ie = document.documentMode || +RegExp['\x241'];
        }
        if (/opera\/(\d+\.\d)/i.test(navigator.userAgent)) {
            this.opera = +RegExp['\x241'];
        }
        if (/firefox\/(\d+\.\d)/i.test(navigator.userAgent)) {
            this.firefox = +RegExp['\x241'];
        }
        if (/(\d+\.\d)?(?:\.\d)?\s+safari\/?(\d+\.\d+)?/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)) {
            this.safari = +(RegExp['\x241'] || RegExp['\x242']);
        }
        if (/chrome\/(\d+\.\d)/i.test(navigator.userAgent)) {
            this.chrome = +RegExp['\x241'];
        }
        try {
            if (/(\d+\.\d)/.test(window["external"].max_version)) {
                this.maxthon = +RegExp['\x241'];
            }
        }
        catch (ex) {}
        this.isWebkit = /webkit/i.test(navigator.userAgent);
        this.isGecko = /gecko/i.test(navigator.userAgent) && !/like gecko/i.test(navigator.userAgent);
        this.isStrict = document.compatMode == "CSS1Compat";
    }
});