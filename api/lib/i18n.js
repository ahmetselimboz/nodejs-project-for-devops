const i18n = require('../i18n');
const config = require('../config');


class I18n {
    constructor(lang) {
        // System language defaults to config.DEFAULT_LANGUAGE
        this.lang = lang || config.DEFAULT_LANGUAGE;
    }

    translate(text, lang = this.lang, params = []) {
        // Fall back to the system default language when lang is missing/unknown
        if (!lang || !i18n[lang]) lang = config.DEFAULT_LANGUAGE;

        let array = text.split('.');
        let value = i18n[lang]?.[array[0]];

        for (let i = 1; i < array.length; i++) {
            value = value?.[array[i]];
        }

        value = value + "";

        for (let i = 0; i < params.length; i++) {
            value = value.replace(`{0}`, params[i]);
        }
        // If the key cannot be resolved, return the key itself
        return value ?? text;
    }
}

module.exports = I18n;
