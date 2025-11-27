'use server';

import { JSDOM } from 'jsdom';
import { bundledLanguages, createHighlighter, Highlighter } from 'shiki';
import sanitizeHtml from 'sanitize-html';

// Lazily initialize the highlighter to prevent top-level crashes.
let highlighter: Highlighter | null = null;
async function getHighlighter() {
    if (!highlighter) {
        highlighter = await createHighlighter({
            themes: ['github-light', 'github-dark'],
            langs: Object.keys(bundledLanguages),
        });
    }
    return highlighter;
}

/**
 * Sanitizes and applies syntax highlighting to an HTML string.
 * @param html The raw HTML content.
 * @returns The processed HTML string.
 */
export async function getHighlightedHtml(html: string): Promise<string> {
    // Sanitize the HTML to prevent XSS attacks, while allowing code-related tags.
    const sanitizedHtml = sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'pre', 'code', 'span', 'div', 'p', 'br'
        ]),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            '*': ['class', 'style'],
            a: ['href', 'name', 'target'],
            img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
            pre: ['data-lang', 'data-theme'],
            code: ['data-lang', 'data-theme'],
            div: ['data-color-mode'],
            span: ['data-line'],
        },
        selfClosing: ['img', 'br'],
        allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel'],
        allowedSchemesByTag: {},
        allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
        allowProtocolRelative: true,
        enforceHtmlBoundary: false,
    });

    // Use JSDOM to parse the HTML and find code blocks.
    const dom = new JSDOM(sanitizedHtml);
    const { document } = dom.window;
    const codeBlocks = document.querySelectorAll('pre > code');
    const shikiHighlighter = await getHighlighter();

    // Apply syntax highlighting to each code block.
    for (const codeBlock of codeBlocks) {
        const preElement = codeBlock.parentElement as HTMLPreElement;
        const lang = codeBlock.className.replace('language-', '');
        const code = codeBlock.textContent || '';
        try {
            const highlightedCode = shikiHighlighter.codeToHtml(code, {
                lang,
                themes: { light: 'github-light', dark: 'github-dark' },
            });
            preElement.outerHTML = highlightedCode;
        } catch (e) {
            console.error(`Shiki highlighting failed for lang: '${lang}'`, e);
            // If highlighting fails, we leave the original code block intact.
        }
    }
    return document.body.innerHTML;
}
