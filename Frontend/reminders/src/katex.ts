import renderMathInElement from "katex/dist/contrib/auto-render";
import "katex/dist/katex.css";

export const renderMath = (elem: HTMLElement, contents: string) => {
    elem.innerText = contents;
    renderMathInElement(elem, { delimiters: [
        { left: "$$", right: "$$", display: false },
        { left: "\\[", right: "\\]", display: true },
    ],
    throwOnError: false,
    maxSize: 500 });
    // TODO: allowedProtocols: [] });
};
