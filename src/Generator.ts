
import {FileUtils} from "./FileUtils";
import {IGeneratorSettings, IFormatOutput, IFileContent, IFile} from "./interfaces/interfaces";
import {GeneratorHTML} from "./GeneratorHTML";
import {GeneratorEbook} from "./GeneratorEbook";
import {GeneratorPDF} from "./GeneratorPDF";
import {$log} from "ts-log-debug";
import * as Path from "path";
import {paths} from "./constants/constants";

export class Generator {
    /**
     *
     */
    private tmpDir: string;
    /**
     *
     */
    private pdfDir: string;
    /**
     *
     */
    private ebookDir: string;
    /**
     *
     */
    private htmlDir: string;
    /**
     *
     */
    private resourcesDir: string;
    /**
     *
     * @type {Map<string, Promise<string>>}
     */
    constructor(private settings: IGeneratorSettings) {
        this.tmpDir = Path.join(this.settings.cwd, paths.tmp);
        this.pdfDir = Path.join(this.settings.cwd, paths.pdf);
        this.ebookDir = Path.join(this.settings.cwd, paths.ebook);
        this.htmlDir = Path.join(this.settings.cwd, paths.html);
        this.resourcesDir = Path.join(this.settings.cwd, paths.resources);
    }

    /**
     *
     * @returns {Promise<TResult|any[]>}
     */
    public build(){
        return this.createWorkspace()
            .then(() => this.taskCheckout())
            .then(() => this.taskReadFiles())
            .then(filesContents => this.taskGenerate(filesContents))
            .then(() => this.taskCopyToDirs())
            .then(() => this.settings)
            .then(() => FileUtils.remove(this.tmpDir));
    }

    /**
     *
     * @returns {Promise<void>}
     */
    private createWorkspace(){
        return Promise.resolve()
            .then(() => FileUtils.remove(this.settings.cwd))
            .then(() => FileUtils.mkdirs(this.settings.cwd))
            .then(() => FileUtils.mkdirs(this.tmpDir))
            .then(() => FileUtils.mkdirs(this.pdfDir))
            .then(() => FileUtils.mkdirs(this.htmlDir))
            .then(() => FileUtils.mkdirs(this.ebookDir))
            .then(() => FileUtils.mkdirs(this.resourcesDir));
    }


    /**
     *
     * @returns {Promise<string[]>}
     */
    private taskReadFiles(): Promise<IFileContent[]> {

        const mapper: any = (file: IFile) =>
            FileUtils
                .read(Path.resolve(Path.join(
                    ...[this.settings.root, file.cwd, file.path].filter(o => !!o)
                )))
                .then(content => (<IFileContent> {
                    title: file.title,
                    path: file.path,
                    content
                }));


        const promises = this.settings.concat.files.map(mapper);

        return Promise.all(promises);
    }

    /**
     *
     * @returns {Promise<TAll[]>}
     */
    private taskGenerate(filesContents: IFileContent[]): Promise<any> {

        const generatorHTML = new GeneratorHTML(this.htmlDir, this.settings);
        const generatorEbook = new GeneratorEbook(this.ebookDir, this.settings);
        const generatorPDF = new GeneratorPDF(this.pdfDir, this.settings);

        return Promise.resolve()
            .then(() => generatorHTML.generate(filesContents))
            .then(() => generatorEbook.generate(filesContents))
            .then(() => generatorPDF.generate(filesContents));
    }

    /**
     *
     */
    private taskCheckout() {

        if(this.settings.checkout) {

            $log.debug("Checkout all files...");

            return Promise.all(this.settings
                .checkout
                .branchs
                .map((branch: string) =>

                    FileUtils.downloadFile(
                        Path.join(this.settings.repository, 'archive', `${branch}.zip`),
                        Path.join(this.resourcesDir, `${branch}.zip`)
                    )

                ));

        }

    }
    /**
     *
     */
    private taskCopyToDirs() {

        $log.debug("Generate directories");

        const promises = this.settings.outDir.map((task: IFormatOutput) => {
            const path = Path.join(this.settings.cwd, task.path);

            return FileUtils
                .mkdirs(path)
                .then(() => {

                    $log.debug(`Export ${task.format} to directory ${path}`);

                    switch(task.format) {
                        case "html":
                            return FileUtils
                                .copy(this.htmlDir, path)
                                .then(() =>
                                    FileUtils.copy(
                                        this.resourcesDir,
                                        Path.join(this.htmlDir, this.settings.checkout.cwd)
                                    ).catch(() => true)
                                );
                        case "ebook":
                            return FileUtils
                                .copy(this.ebookDir, path)
                                .then(() =>
                                    FileUtils.copy(
                                        this.resourcesDir,
                                        Path.join(this.htmlDir, this.settings.checkout.cwd)
                                    ).catch(() => true)
                                );
                        case "pdf":
                            return FileUtils
                                .copy(
                                    Path.join(this.pdfDir, this.settings.pdfName),
                                    Path.join(path, this.settings.pdfName)
                                )
                                .then(() =>
                                    FileUtils.copy(
                                        this.resourcesDir,
                                        Path.join(this.htmlDir, this.settings.checkout.cwd)
                                    ).catch(() => true)
                                );
                    }

                    return Promise.resolve();
                });

        });

        return Promise.all(promises);
    }


}