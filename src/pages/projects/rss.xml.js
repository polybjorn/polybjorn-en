import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import MarkdownIt from 'markdown-it';

const parser = new MarkdownIt();

export async function GET(context) {
  const projects = (await getCollection('projects', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Bjørn A. Andersen - Projects',
    description: 'Project write-ups by Bjørn A. Andersen on 3D printing, design, and software.',
    site: context.site,
    items: projects.map(project => ({
      title: project.data.title,
      description: project.data.description,
      pubDate: project.data.date,
      link: `/projects/${project.slug}/`,
      content: parser.render(project.body),
    })),
    customData: '<language>en-us</language>',
  });
}
