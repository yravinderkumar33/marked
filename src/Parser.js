const Renderer = require('./Renderer.js');
const TextRenderer = require('./TextRenderer.js');
const Slugger = require('./Slugger.js');
const { defaults } = require('./defaults.js');
const {
  unescape
} = require('./helpers.js');

/**
 * Parsing & Compiling
 */
module.exports = class Parser {
  constructor(options) {
    this.options = options || defaults;
    this.options.renderer = this.options.renderer || new Renderer();
    this.renderer = this.options.renderer;
    this.textRenderer = new TextRenderer();
    this.renderer.options = this.options;
    this.slugger = new Slugger();
  }

  /**
   * Static Parse Method
   */
  static parse(tokens, options) {
    const parser = new Parser(options);
    return parser.parse(tokens);
  }

  /**
   * Parse Loop
   */
  parse(tokens, top = true) {
    let out = '',
      body,
      token;

    const l = tokens.length;
    for (let i = 0; i < l; i++) {
      token = tokens[i];
      switch (token.type) {
        case 'space': {
          continue;
        }
        case 'hr': {
          out += this.renderer.hr();
          continue;
        }
        case 'heading': {
          out += this.renderer.heading(
            this.parseInline(token.tokens),
            token.depth,
            unescape(this.parseInline(token.tokens, this.textRenderer)),
            this.slugger);
          continue;
        }
        case 'code': {
          out += this.renderer.code(token.text,
            token.lang,
            token.escaped);
          continue;
        }
        case 'table': {
          let header = '',
            i,
            row,
            cell,
            j,
            l2,
            l3;

          // header
          cell = '';
          l2 = token.header.length;
          for (i = 0; i < l2; i++) {
            cell += this.renderer.tablecell(
              this.parseInline(token.tokens.header[i]),
              { header: true, align: token.align[i] }
            );
          }
          header += this.renderer.tablerow(cell);

          body = '';
          l2 = token.cells.length;
          for (i = 0; i < l2; i++) {
            row = token.tokens.cells[i];

            cell = '';
            l3 = row.length;
            for (j = 0; j < l3; j++) {
              cell += this.renderer.tablecell(
                this.parseInline(row[j]),
                { header: false, align: token.align[j] }
              );
            }

            body += this.renderer.tablerow(cell);
          }
          out += this.renderer.table(header, body);
          continue;
        }
        case 'blockquote': {
          body = this.parse(token.tokens);
          out += this.renderer.blockquote(body);
          continue;
        }
        case 'list': {
          const ordered = token.ordered,
            start = token.start,
            loose = token.loose,
            l2 = token.items.length;
          let itemBody;

          body = '';
          for (let j = 0; j < l2; j++) {
            const item = token.items[j];
            const checked = item.checked;
            const task = item.task;

            itemBody = '';
            if (item.task) {
              const checkbox = this.renderer.checkbox(checked);
              if (loose) {
                if (item.tokens[0].type === 'text') {
                  item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
                  if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                    item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
                  }
                } else {
                  item.tokens.unshift({
                    type: 'text',
                    text: checkbox
                  });
                }
              } else {
                itemBody += checkbox;
              }
            }

            itemBody += this.parse(item.tokens, loose);
            body += this.renderer.listitem(itemBody, task, checked);
          }

          out += this.renderer.list(body, ordered, start);
          continue;
        }
        case 'html': {
          // TODO parse inline content if parameter markdown=1
          out += this.renderer.html(token.text);
          continue;
        }
        case 'paragraph': {
          out += this.renderer.paragraph(this.parseInline(token.tokens));
          continue;
        }
        case 'text': {
          body = token.tokens ? this.parseInline(token.tokens) : token.text;
          while (i + 1 < l && tokens[i + 1].type === 'text') {
            token = tokens[++i];
            body += '\n' + (token.tokens ? this.parseInline(token.tokens) : token.text);
          }
          out += top ? this.renderer.paragraph(body) : body;
          continue;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }

    return out;
  }

  /**
   * Parse Inline Tokens
   */
  parseInline(tokens, renderer) {
    renderer = renderer || this.renderer;
    let out = '',
      i,
      token;

    const l = tokens.length;
    for (i = 0; i < l; i++) {
      token = tokens[i];
      switch (token.type) {
        case 'escape': {
          out += token.text;
          break;
        }
        case 'html': {
          out += renderer.html(token.text);
          break;
        }
        case 'link': {
          out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
          break;
        }
        case 'image': {
          out += renderer.image(token.href, token.title, token.text);
          break;
        }
        case 'strong': {
          out += renderer.strong(this.parseInline(token.tokens, renderer));
          break;
        }
        case 'em': {
          out += renderer.em(this.parseInline(token.tokens, renderer));
          break;
        }
        case 'codespan': {
          out += renderer.codespan(token.text);
          break;
        }
        case 'br': {
          out += renderer.br();
          break;
        }
        case 'del': {
          out += renderer.del(this.parseInline(token.tokens, renderer));
          break;
        }
        case 'text': {
          out += renderer.text(token.text);
          break;
        }
        default: {
          const errMsg = 'Inline token with "' + this.token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
};
