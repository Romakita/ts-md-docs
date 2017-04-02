
export interface IFileContent {
    title: string;
    path: string;
    content: string;
}
export interface IFile {
    title: string;
    path: string;
    cwd: string;
}

export interface IFormatOutput {
    format: "html"|"pdf"|"ebook";
    path: string;
    resources: string;
}

export interface IRule {
    from: string;
    to: string;
}

export interface IGeneratorSettings {
    root: string;
    template?: string;
    pageTitle: string;
    repository: string;
    branch: string;
    files?: string[];
    rules?: IRule[];
    renderedContents?: string[];
    copy: IRule[];
    outDir: IFormatOutput[];
    pdfName: string;
    concat: {
        files: IFile[];
    };
    checkout?: {
        branchs: string[];
    };

    paths?: any;
}