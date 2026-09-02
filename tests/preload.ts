import { Window } from 'happy-dom';

const happy = new Window({ url: 'https://flashcards.aspenini.com/' });

const g = globalThis as typeof globalThis & {
  window: Window;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
  Image: typeof Image;
  DOMParser: typeof DOMParser;
  Node: typeof Node;
  Element: typeof Element;
  HTMLImageElement: typeof HTMLImageElement;
};

g.window = happy as unknown as Window;
g.document = happy.document as unknown as Document;
g.navigator = happy.navigator as unknown as Navigator;
g.HTMLElement = happy.HTMLElement as unknown as typeof HTMLElement;
g.Image = happy.Image as unknown as typeof Image;
g.DOMParser = happy.DOMParser as unknown as typeof DOMParser;
g.Node = happy.Node as unknown as typeof Node;
g.Element = happy.Element as unknown as typeof Element;
g.HTMLImageElement = happy.HTMLImageElement as unknown as typeof HTMLImageElement;
