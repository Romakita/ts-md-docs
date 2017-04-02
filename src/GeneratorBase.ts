
import {IRule, IFileContent, IGeneratorSettings} from "./interfaces/interfaces";
import * as Path from "path";
import {FileUtils} from "./FileUtils";
import {$log} from "ts-log-debug";
import {paths} from "./constants/constants";

const ejs = require("ejs");

export abstract class GeneratorBase {
    /**
     *
     * @type {Map<string, Promise<string>>}
     */
    private cache: Map<string, Promise<string>> = new Map<string, Promise<string>>();
    /**
     *
     * @type {string}
     */
    private template = "valtech";
    private templateDir = "";

    constructor(protected settings: IGeneratorSettings) {
        this.template = this.settings.template || "valtech";
        this.templateDir = Path.join(paths.templates, this.template);
    }

    /**
     *
     * @param filesContents
     */
    abstract generate(filesContents: IFileContent[]): Promise<any>;

    /**
     *
     * @param file
     * @param scope
     * @returns {PromiseLike<TResult>|Promise<TResult>|Promise<T>|Promise<TResult2|TResult1>}
     */
    protected render(file: string, scope: any): Promise<string> {

        let promise;

        if (this.cache.has(file)) {
            promise = this.cache.get(file);
        } else {
            promise = FileUtils.read(Path.join(this.templateDir, `${file}.html`));
            this.cache.set(file, promise);
        }

        return promise.then(template => ejs.render(template, scope));

    }

    /**
     *
     * @param cwd
     * @returns {Array}
     */
    protected copyAssets(cwd: string) {

        $log.debug("copy assets to", cwd);

        let promises = [];

        promises.push(
            FileUtils.copy(
                Path.join(this.templateDir, paths.assets),
                Path.join(cwd, paths.assets)
            )
        );

        promises = promises.concat(
            this.settings.copy.map((file: IRule) =>
                FileUtils.copy(file.from, Path.join(cwd, `${file.to}`))
            )
        );

        return promises;
    }

    protected replacer(content, rules) {
        rules.forEach(rule => content = content.replace(new RegExp(rule.from, "gi"), rule.to));
        return content;
    }
}