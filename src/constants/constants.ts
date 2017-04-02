import * as Path from "path";

export const paths = {
    tmp: "${root}/.tmp",
    pdf: "${paths.tmp}/pdf",
    ebook: "${paths.tmp}/ebook",
    html: "${paths.tmp}/html",
    resources: "${paths.tmp}/resources"
};

export const pathsSrc = {
    templates: Path.resolve(Path.join(__dirname, "..","..", "templates")),
    assets: "assets"
};