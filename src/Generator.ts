
import {FileUtils} from "./FileUtils";
import {IGeneratorSettings, IFormatOutput, IFileContent, IFile} from "./interfaces/interfaces";
import {GeneratorHTML} from "./GeneratorHTML";
import {GeneratorEbook} from "./GeneratorEbook";
import {GeneratorPDF} from "./GeneratorPDF";
import {$log} from "ts-log-debug";
import * as Path from "path";
import {paths, pathsSrc} from "./constants/constants";

export class Generator {
    /**
     *
     * @type {Map<string, Promise<string>>}
     */
    constructor(private settings: IGeneratorSettings) {
        this.settings = Object.assign(settings, {paths}, {pathsSrc});
        this.settings.paths.tmp = FileUtils.resolve(paths.tmp, this.settings);
    }

    /**
     *
     * @returns {Promise<TResult|any[]>}
     */
    public build(){
        return this
            .createWorkspace()
            .then(() => this.taskCheckout())
            .then(() => this.taskReadFiles())
            .then(filesContents => this.taskGenerate(filesContents))
            .then(() => this.settings)
            .then(() => FileUtils.remove(this.settings.paths.tmp));
    }

    /**
     *
     * @returns {Promise<void>}
     */
    private createWorkspace() {

        return Promise.resolve()
            .then(() => FileUtils.remove(this.settings.paths.tmp))
            .then(() =>
                FileUtils.mkdirs(
                    Object
                        .keys(this.settings.paths)
                        .map((key) =>
                            this.settings.paths[key] = FileUtils.resolve(this.settings.paths[key], this.settings)
                        )

                )
            )
            .then(() =>
                FileUtils.mkdirs(
                    this.settings.outDir.map((outdir) =>
                        outdir.path = FileUtils.resolve(outdir.path, this.settings)
                    )
                )
            );
    }


    /**
     *
     * @returns {Promise<string[]>}
     */
    private taskReadFiles(): Promise<IFileContent[]> {

        const mapper: any = (file: IFile) =>
            FileUtils
                .read(
                    Path.join(FileUtils.resolve(file.cwd, this.settings), file.path)
                )
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

        const generatorPDF = new GeneratorPDF({} as any, this.settings);

        return generatorPDF
            .generate(filesContents)
            .then(() => $log.debug("PDF generated"))
            .then(() =>
                Promise.all(

                    this.settings.outDir.map((task: IFormatOutput) => {

                            switch(task.format) {
                                case "html":
                                    return new GeneratorHTML(task, this.settings).generate(filesContents)
                                        .catch(er => console.error(task, er));
                                case "ebook":
                                    return new GeneratorEbook(task, this.settings).generate(filesContents)
                                        .catch(er => console.error(task, er));
                                case "pdf":
                                    return generatorPDF.copy(task)
                                        .catch(er => console.error(task, er));
                            }

                        }
                    ))

            );

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
                        this.settings.repository + Path.join('archive', `${branch}.zip`),
                        Path.join(this.settings.paths.resources, `${branch}.zip`)
                    )

                ));

        }

    }


}