
import {IRule, IFileContent, IGeneratorSettings, IFormatOutput} from "./interfaces/interfaces";
import * as Path from "path";
import {FileUtils} from "./FileUtils";
import {$log} from "ts-log-debug";
import {pathsSrc} from "./constants/constants";

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

    constructor(protected task: IFormatOutput, protected settings: IGeneratorSettings) {
        this.template = this.settings.template || "valtech";
        this.templateDir = Path.join(pathsSrc.templates, this.template);
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
    protected copyAssets(cwd: string = this.task.path) {

        $log.debug("Copy assets to", cwd);

        let promises = [];

        // Copy des assets du template
        promises.push(
            FileUtils.copy(
                Path.join(this.templateDir, pathsSrc.assets),
                Path.join(cwd, pathsSrc.assets)
            )
        );

        // Copy des tasks copy
        promises = promises.concat(
            this.settings.copy.map((file: IRule) =>
                FileUtils.copy(
                    FileUtils.resolve(file.from, this.settings),
                    Path.join(
                        cwd,
                        file.to
                    )
                )
            )
        );

        // Copy des ressources
        if (this.task.resources) {
            promises = promises.concat(
                FileUtils.copy(
                    FileUtils.resolve(this.settings.paths.resources, this.settings),
                    FileUtils.resolve(this.task.resources, this.settings)
                ).catch(() => true)
            );
        }

        return promises;
    }

    /**
     *
     * @param content
     * @param rules
     * @returns {any}
     */
    protected replacer(content, rules) {
        rules.forEach(rule => content = content.replace(new RegExp(rule.from, "gi"), rule.to));
        return content;
    }
}