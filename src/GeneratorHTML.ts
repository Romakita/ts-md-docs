import {GeneratorBase} from "./GeneratorBase";
import {MDUtils} from "./MDUtils";
import {FileUtils} from "./FileUtils";
import {IFileContent} from "./interfaces/interfaces";
import {$log} from "ts-log-debug";
import * as Path from "path";

export class GeneratorHTML extends GeneratorBase {


    constructor(private dir: string, settings) {
        super(settings);
    }
    /**
     *
     * @param filesContents
     */
    generate(filesContents: IFileContent[]): Promise<any> {

        $log.debug("Task generate HTML");

        let menu = [];

        let promises = filesContents
            .map((fileContent: IFileContent) => {

                const file = fileContent.path.replace(".md", ".html").replace("readme", "index");

                const content = this.replaceUrl(
                    MDUtils.markdownToHTML(fileContent.content),
                    filesContents
                );

                menu.push({
                    title: fileContent.title,
                    href: file
                });

                return this
                    .render("page", {
                        pageTitle: `${this.settings.pageTitle}`,
                        body: content,
                        menu: menu
                    })
                    .then(content => FileUtils.write(`${this.dir}/${file}`, content));

            });

        promises = promises.concat(this.copyAssets(this.dir));

        return Promise.all(promises);
    }

    /**
     *
     * @param content
     * @param filesContents
     * @param cb
     * @returns {string}
     */
    private replaceUrl(content: string, filesContents: IFileContent[], cb: Function = c => c): string {
        const { root, repository, branch} = this.settings;

        const base = Path.join(repository, "blob", branch);

        let rules = filesContents
            .map(fileContent => ({
                from: Path.join(base, fileContent.path.replace(root + "/", "")),
                to: fileContent.path
                    .replace(".md", ".html")
                    .replace("readme", "index")
            }));

        const rulesResources = this.settings.checkout.branchs
            .map(branch => ({
                from: Path.join(repository, "tree" , branch),
                to: Path.join(this.settings.checkout.cwd, `${branch}.zip`)
            }));

        rules = rules.concat(rulesResources);

        rules.push({
            from: base,
            to: ""
        });

        return this.replacer(content, rules);
    }

}