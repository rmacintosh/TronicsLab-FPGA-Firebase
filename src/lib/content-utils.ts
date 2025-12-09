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
 * Sanitizes and applies syntax highlighting to an HTML string from the server.
 * @param html The raw HTML content from the database.
 * @returns The processed HTML string with highlighted code blocks.
 */
export async function getHighlightedHtml(html: string): Promise<string> {
    const sanitizedHtml = sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'pre', 'code', 'span', 'div', 'p', 'br'
        ]),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            '*': ['class', 'style'],
            a: ['href', 'name', 'target'],
            img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
        },
    });

    const dom = new JSDOM(sanitizedHtml);
    const { document } = dom.window;
    const codeBlocks = document.querySelectorAll('pre > code');
    const shikiHighlighter = await getHighlighter();

    for (const codeBlock of codeBlocks) {
        const preElement = codeBlock.parentElement as HTMLPreElement;

        // Extract language from class, guarding against invalid values.
        let lang = codeBlock.className.replace('language-', '');
        if (!lang || lang === 'undefined') {
            lang = 'txt'; // Default to plain text if language is missing or invalid.
        }

        const rawCode = codeBlock.innerHTML;
        const code = rawCode
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/\\n/g, '\n');

        try {
            const highlightedCode = shikiHighlighter.codeToHtml(code, {
                lang,
                themes: { light: 'github-light', dark: 'github-dark' },
            });
            preElement.outerHTML = highlightedCode;
        } catch (e) {
            console.error(`Shiki highlighting failed for lang: '${lang}'`, e);
            // If highlighting fails, we leave the original, un-highlighted code block.
        }
    }

    return document.body.innerHTML;
}
