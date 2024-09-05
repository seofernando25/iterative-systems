import katex from "katex";
import styles from "katex/dist/katex.css?inline";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { asyncAppend } from "lit/directives/async-append.js";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
asyncAppend;
let styleSheet: CSSStyleSheet | undefined;
const getStyleSheet = () => {
    if (styleSheet === undefined) {
        styleSheet = new CSSStyleSheet();
        styleSheet.replace(styles);
    }
    return styleSheet;
};

@customElement("katex-expr")
export class KatexExprElement extends LitElement {
    static styles = getStyleSheet();

    @property({ type: Object })
    options: katex.KatexOptions = {};

    private slotRef: Ref<HTMLSlotElement> = createRef();

    @property({ type: String })
    expression = "";

    render() {
        const inputText = this.expression;
        const kHtml = katex.renderToString(inputText, this.options);
        return html`
            ${unsafeHTML(kHtml)}
            <div hidden ${ref(this.slotRef)}><slot></slot></div>
        `;
    }
}
