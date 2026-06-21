import { parseWFML, emitWFML } from './src/parser/wfml-grammar-parser-emitter';

describe('WFML parser/emitter', () => {
  it('parses meta and a simple page/frame/nodes', () => {
    const src = `
meta:
  version: 0.1
  author: tester

page Auth:
  frame iphone13:
    w: 390
    h: 844
    text title:
      text: "Welcome"
      style:
        text:
          size: 24
          weight: 700
      place: below #logo by 12, centerX

    image logo:
      src: https://example.com/logo.png
      w: 64
      h: 64
      place: centered in #iphone13
`;

    const { doc, errors, warnings } = parseWFML(src);

    expect(errors).toHaveLength(0);
    const page = doc.pages[0];
    expect(page.name).toBe('Auth');

    const frame = page.frames[0];
    expect(frame.w).toBe(390);
    expect(frame.h).toBe(844);

  const title = (frame.children || []).find((n: any) => (n as any).id === 'title') as any;
    expect(title).toBeTruthy();
    expect(title.kind).toBe('text');
    expect(title.text).toBe('Welcome');
    expect(Array.isArray(title.place)).toBe(true);
    expect(title.place![0]).toEqual({ type: 'below', ref: 'logo', by: 12 });
  expect(title.place!.some((r: any) => r.type === 'centerX')).toBe(true);

    // Emission shouldn't introduce errors when re-parsed
    const emitted = emitWFML(doc);
    const round = parseWFML(emitted);
    expect(round.errors).toHaveLength(0);
    expect(round.doc.pages[0].frames.length).toBe(1);
  });

  it('parses placement variants and inside/inset', () => {
    const src = `
page P:
  frame board:
    w: 100
    h: 100
    rect card:
      w: 40
      h: 20
      place: below #title by 8, centerX of #board, inside #board inset(8,16,8,16)
`;

    const { doc, errors } = parseWFML(src);
    expect(errors).toHaveLength(0);

    const frame = doc.pages[0].frames[0];
  const card = (frame.children || []).find((n: any) => (n as any).id === 'card') as any;

    expect(card.place).toEqual([
      { type: 'below', ref: 'title', by: 8 },
      { type: 'centerX', ref: 'board' },
      { type: 'inside', ref: 'board', inset: [8, 16, 8, 16] }
    ]);
  });

  it('emits place rules in canonical form', () => {
    const src = `
page P:
  frame board:
    w: 100
    h: 100
    rect a:
      place: rightOf #b by 12, alignTop #b, centered in #board
`;
    const { doc, errors } = parseWFML(src);
    expect(errors).toHaveLength(0);

    const emitted = emitWFML(doc);
    // Ensure "place:" line exists and is comma-separated
    expect(emitted).toMatch(/place: rightOf #b by 12, alignTop #b, centered in #board/);
  });

  it('reports unexpected top-level constructs', () => {
    const src = `\nunknown:\n  foo: bar\n`;
    const { errors } = parseWFML(src);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('parses dynamic plugins and flex layouts', () => {
    const src = `
page P:
  frame flexboard:
    w: 500
    h: 500
    flex form:
      direction: column
      gap: 16
      padding: 24
      w: fill
      h: hug
      
      youtube-player vid:
        w: fill
        h: 200
        video_id: "dQw4w9WgXcQ"
        
      text title:
        text: "Submit"
`;
    const { doc, errors } = parseWFML(src);
    expect(errors).toHaveLength(0);

    const frame = doc.pages[0].frames[0];
    const form = (frame.children || []).find((n: any) => n.id === 'form') as any;
    expect(form).toBeTruthy();
    expect(form.kind).toBe('flex');
    expect(form.direction).toBe('column');
    expect(form.gap).toBe(16);
    expect(form.padding).toBe(24);
    expect(form.w).toBe('fill');
    expect(form.h).toBe('hug');

    const vid = (form.children || []).find((n: any) => n.id === 'vid') as any;
    expect(vid).toBeTruthy();
    expect(vid.kind).toBe('youtube-player');
    expect(vid.w).toBe('fill');
    expect(vid.h).toBe(200);
    expect(vid.video_id).toBe('dQw4w9WgXcQ');
  });
});