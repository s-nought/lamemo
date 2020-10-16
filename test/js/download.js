$(function () {
    $('#downloadTexFile').click(function () {
        let content = makeData();
        let link = document.createElement('a');
        link.href = window.URL.createObjectURL(new Blob([content]));
        link.download = `lamemo_${getTime()}.tex`;
        link.click();
    });

    function makeData() {
        const latexTemplateBefore =
            `
\\documentclass[a4paper]{jsarticle}
\\usepackage{amsmath, amssymb}
\\title{lamemo_${getTime()}}
\\author{Your Name}
\\date{}
\\begin{document}
\\maketitle
\\section*{Fst Section}
`;
        let doc = $('#msg').val();
        const latexTemplateAfter =
            `
\end{document}
`;
        return latexTemplateBefore + doc + latexTemplateAfter;
    }

    function getTime() {
        let date = new Date();
        let year = date.getFullYear();
        let month = zeroPadding(date.getMonth() + 1);
        let day = zeroPadding(date.getDate());
        let hour = zeroPadding(date.getHours());
        let minute = zeroPadding(date.getMinutes());
        let second = zeroPadding(date.getSeconds());
        let str = year + "-" + month + "-" + day + "_" + hour + minute + second;
        return str;
    }

    function zeroPadding(str) {
        if (str < 10) {
            str = "0" + str;
        }
        return str;
    }
});