import {GeneratorBase} from "./GeneratorBase";
import {MDUtils} from "./MDUtils";
import {FileUtils} from "./FileUtils";
import {IFileContent} from "./interfaces/interfaces";
import {$log} from "ts-log-debug";
import * as Path from "path";

export class GeneratorEbook extends GeneratorBase {

    /**
     *
     * @param filesContents
     */
    generate(filesContents: IFileContent[]): Promise<any> {

        $log.debug("Task generate Ebook");

        let promises = [];
        let menu = [];

        let ebookContent = filesContents
            .map((fileContent: IFileContent) => {

                let content = MDUtils.toTagID(fileContent.title) + "\n";

                menu.push({
                    title: fileContent.title,
                    href: "#" + MDUtils.sanitize(fileContent.title)
                });

                return content + MDUtils.markdownToHTML(
                        fileContent.content
                            .split("\n")
                            .map(line => line.replace(/\[Suivant\]\((.*)\)/gi, ""))
                            .join("\n")
                    );

            }).join("\n");

        let promise = this
            .render("page", {
                pageTitle: `${this.settings.pageTitle}`,
                body: this.replaceUrl(
                    ebookContent,
                    filesContents
                ),
                menu: menu
            })
            .then(content => FileUtils.write(Path.join(this.task.path, `index.html`), content));


        promises.push(promise);

        promises = promises.concat(this.copyAssets());

        return Promise.all(promises);
    }

    /**
     *
     * @param content
     * @param filesContents
     * @param cb
     * @returns {string}
     */
    private replaceUrl(content: string, filesContents: IFileContent[]): string {
        const { root, repository, branch} = this.settings;

        const base = repository +  Path.join("blob", branch);

        let rules = filesContents
            .map(fileContent => ({
                from: base + "/" + fileContent.path.replace(root + "/", ""),
                to: "#" + MDUtils.sanitize(fileContent.title)
            }));

        if (this.task.resources) {
            rules = rules.concat(this.getRulesResourcesTags(this.getResourcesRelativePath()));
        }

        rules.push({
            from: base,
            to: ""
        });

        return this.replacer(content, rules);
    }

}