import {GeneratorBase} from "./GeneratorBase";
import {MDUtils} from "./MDUtils";
import {IFileContent, IFormatOutput} from "./interfaces/interfaces";

import * as Express from "express";
import serveStatic = require("serve-static");
import {$log} from "ts-log-debug";
import * as Path from "path";
import {FileUtils} from "./FileUtils";

const htmlPDF = require("html-pdf");

export class GeneratorPDF extends GeneratorBase {
    /**
     *
     */
    private app;

    static isAlreadyCreated = false;

    private pdfSettings = {
        format:"A4",
        type: "pdf",
        base: "http://localhost:9090/",
        "border": {
            "top": "1cm",            // default is 0, units: mm, cm, in, px
            "right": "1cm",
            "bottom": "1cm",
            "left": "1cm"
        }
    };

    /**
     *
     * @returns {Promise<T>}
     */
    private startServer() {

        return new Promise((resolve) => {
            this.app = Express()
                .use(serveStatic(this.settings.paths.pdf))
                .listen(9090, resolve);
        });
    }
    /**
     *
     * @param filesContents
     */
    generate(filesContents: IFileContent[]): Promise<any> {

        if (!GeneratorPDF.isAlreadyCreated) {
            $log.debug("Task generate PDF");
            return this
                .startServer()
                .then(() => this.copyAssets(this.settings.paths.pdf))
                .then(() => this.generateHTML(filesContents))
                .then((filesContents: any) => this.generatePDF(filesContents))
                .then(() => this.app.close())
                .then(() => GeneratorPDF.isAlreadyCreated = true)
                .then(() => $log.debug("PDF Generated"));

        }

        return Promise.resolve();

    }

    /**
     *
     * @param task
     * @returns {Promise<any>}
     */
    public copy(task: IFormatOutput) {

        $log.debug("Copy pdf to", task.path);

        return FileUtils.copy(
            Path.join(this.settings.paths.pdf, this.settings.pdfName),
            Path.join(task.path, this.settings.pdfName)
        );
    }

    /**
     *
     * @param filesContents
     * @returns {Promise<TResult>[]}
     */
    private generateHTML(filesContents: IFileContent[]): Promise<IFileContent[]> {

        const promises = JSON.parse(JSON.stringify(filesContents))

            .map((fileContent: IFileContent) => {

                let content = MDUtils.toTagID(fileContent.title)
                    + "\n"
                    + MDUtils.markdownToHTML(this.filter(fileContent.content));

                content = this.replaceUrl(
                    content,
                    filesContents,
                    f => "#" + MDUtils.sanitize(f.title)
                );

                return Object.assign(fileContent, {
                    content
                });

            });

        return Promise.all(promises);
    }

    protected render(content: string): Promise<string> {

        return super.render("pdf", {
            pageTitle: `${this.settings.pageTitle}`,
            settings: this.settings,
            body: content
        });
    }

    /**
     *
     * @param content
     */
    private filter = (content) => content
        .split("\n")
        .map(line => line.replace(/\[Suivant\]\((.*)\)/gi, ""))
        .join("\n");

    /**
     *
     * @returns {Promise<IFileContent[]>}
     */
    private generatePDF(filesContents: IFileContent[]) {

        return this
            .render(filesContents.map(f => f.content).join("\n"))
            .then(contentHTML => {

                return new Promise((resolve, reject) => {
                    htmlPDF
                        .create(contentHTML, this.pdfSettings)
                        .toFile(
                            Path.join(this.settings.paths.pdf, this.settings.pdfName),
                            (err, res) => {
                                if (err) return reject(err);
                                resolve(res);
                            }
                        );
                });

            });


    }

    /**
     *
     * @param content
     * @param filesContents
     * @param cb
     * @returns {string}
     */
    private replaceUrl(content: string, filesContents: IFileContent[], cb: Function = c => c): string {
        const { root, repository, branch } = this.settings;

        const project = Path.join(repository, "blob", branch);

        let rules = filesContents
            .map(fileContent => ({
                from: Path.join(project, fileContent.path.replace(root + "/", "")),
                to: cb(fileContent)
            }));

        //https://github.com/NodeAndTyped/labs-angular/archive/tp1-solution.zip
        //https://github.com/Romakita/ts-md-docs/archive/master.zip
        rules = rules.concat(this.getRulesResourcesTags(repository + "archive"));

        rules.push({
            from: project,
            to: ""
        });

        return this.replacer(content, rules);
    }

}