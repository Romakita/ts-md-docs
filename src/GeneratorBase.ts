
import {IRule, IFileContent, IGeneratorSettings, IFormatOutput} from "./interfaces/interfaces";
import * as Path from "path";
import {FileUtils} from "./FileUtils";
import {$log} from "ts-log-debug";
import {pathsSrc} from "./constants/constants";
import {MDUtils} from "./MDUtils";

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
    protected render(file: string, scope: any = {}): Promise<string> {

        let promise;
        scope = Object.assign({}, scope);

        scope.pageTitle = this.settings.pageTitle;
        scope.filename = Path.join(this.templateDir, `${file}.ejs`);
        scope.settings = this.settings;

        if (scope.body) {
            scope.body = ejs.render(scope.body, scope);
        }

        if (this.cache.has(file)) {
            promise = this.cache.get(file);
        } else {
            promise = FileUtils.read(scope.filename);
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

    /**
     *
     * @param label
     * @param url
     */
    protected toLink = (label: string, url: string) => `<a href="${FileUtils.resolve(url, this.settings)}">${label}</a>`;
    /**
     *
     */
    protected getResourcesRelativePath = () => Path.relative(
        FileUtils.resolve(this.task.path, this.settings),
        FileUtils.resolve(this.task.resources, this.settings)
    );

    /**
     *
     * @param uri
     * @returns {any}
     */
    protected getRulesResourcesTags(uri: string) {

        return this.settings
            .checkout
            .branchs
            .map(branch => ({
                from: `#resources-${branch}`,
                to: this.toLink(branch, Path.join(
                    uri,
                    `${branch}.zip`
                ))
            }));

    }

    protected createRules() {
        return [
            {
                from: "<p><strong>generate-summary</strong></p>",
                to: "<%- include(\"partials/summary.ejs\") %>"
            },
            {
                from: "class=\"language-",
                to: "class=\""
            }
        ];
    }
    /**
     *
     * @param filesContents
     * @param type
     * @returns {{title: string, href: string}[]}
     */
    protected getMenu(filesContents: IFileContent[], type: "uri" | "hashtag" = "hashtag") {

        return filesContents
            .map((fileContent: IFileContent) => ({
                title: fileContent.title,
                href: type === "hashtag"
                    ? "#" + MDUtils.sanitize(fileContent.title)
                    : fileContent.path.replace(".md", ".html")
            }))
            ;
    }
}