import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import MarkdownIt from 'markdown-it';

const parser = new MarkdownIt();

export async function GET(context) {
  const articles = (await getCollection('articles', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Bjørn A. Andersen - Articles',
    description: 'Writing by Bjørn A. Andersen on 3D printing, design, and production.',
    site: context.site,
    items: articles.map(article => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.date,
      link: `/articles/${article.slug}/`,
      content: parser.render(article.body),
    })),
    customData: '<language>en-us</language>',
  });
}
