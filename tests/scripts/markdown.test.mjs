import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../../site/src/lib/markdown.ts';

const options = {
  skillName: 'example-skill',
  currentPath: 'SKILL.md',
  filePaths: new Set(['SKILL.md']),
};

describe('renderMarkdown', () => {
  it('preserves ordered-list numbering after a fenced code block', async () => {
    const markdown = [
      '1. First step',
      '2. Second step',
      '',
      '```sh',
      'echo test',
      '```',
      '',
      '3. Third step',
    ].join('\n');

    const { html } = await renderMarkdown(markdown, options);

    expect(html).toContain('<ol start="3">');
    expect(html).toContain('<li>Third step</li>');
  });

  it.each([
    ['javascript', 'const answer = 42;'],
    ['js', 'const answer = 42;'],
    ['ts', 'const answer: number = 42;'],
    ['python', 'answer = 42'],
    ['sh', 'echo "hello"'],
    ['json', '{"answer": 42}'],
    ['JS title="example.js"', 'const answer = 42;'],
  ])(
    'highlights fenced %s code and preserves token colors after sanitizing',
    async (language, source) => {
      const markdown = `\`\`\`${language}\n${source}\n\`\`\``;

      const { html } = await renderMarkdown(markdown, options);

      expect(html).toContain('class="shiki github-dark-default"');
      expect(html).toMatch(/<span style="color:#[\da-f]+">/i);
      expect(html).toContain('tabindex="0"');
      expect(html.replace(/<[^>]+>/g, '')).toBe(source);
    },
  );

  it.each(['', 'text', 'unknown-language', 'constructor', '__proto__'])(
    'renders %s code as escaped plain text when no grammar is available',
    async language => {
      const markdown = `\`\`\`${language}\n<script>alert("test")</script>\n\`\`\``;

      const { html } = await renderMarkdown(markdown, options);

      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('class="shiki');
    },
  );

  it('highlights code nested in lists and blockquotes', async () => {
    const markdown = '- Example:\n\n  ```js\n  const list = 1;\n  ```\n\n> ```js\n> const quote = 2;\n> ```';

    const { html } = await renderMarkdown(markdown, options);

    expect(html.match(/class="shiki github-dark-default"/g)).toHaveLength(2);
    expect(html).toContain('<li>');
    expect(html).toContain('<blockquote>');
  });

  it('escapes HTML inside highlighted code and strips unsafe HTML and styles', async () => {
    const markdown = [
      '```html',
      '<img src="x" onerror="alert(1)">',
      '```',
      '<script>alert(1)</script>',
      '<span style="color:#ff0000;position:fixed;background-image:url(javascript:alert(1))" onclick="alert(1)">text</span>',
    ].join('\n\n');

    const { html } = await renderMarkdown(markdown, options);

    expect(html).toContain('class="shiki');
    expect(html).toContain('&lt;');
    expect(html).not.toMatch(/<(?:script|img)\b/);
    expect(html).not.toContain('onclick=');
    expect(html).not.toContain('position:');
    expect(html).not.toContain('background-image:');
    expect(html).toContain('<span style="color:#ff0000">text</span>');
  });
});
