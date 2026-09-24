import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import MarkdownIt from 'markdown-it';

const parser = new MarkdownIt();

// Its own channel rather than a second section in the projects feed: that one
// is titled "Projects" and describes project write-ups on 3D printing, design
// and software, so an article filed there is mislabelled to every reader of it.
export async function GET(context) {
  const writing = (await getCollection('writing', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Bjørn A. Andersen - Writing',
    description: 'Articles by Bjørn A. Andersen on software, measurement and running a small fleet.',
    site: context.site,
    items: writing.map(entry => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: `/writing/${entry.id}/`,
      content: parser.render(entry.body),
    })),
    customData: '<language>en-us</language>',
  });
}
