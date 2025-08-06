import expat from "node-expat";

export default async function* captureEntities(stream, tagNames) {
  const parser = new expat.Parser();

  const shouldCapture = (tagName) => !tagNames || tagNames.includes(tagName);

  let nodeStack = [];
  let capturing = false;

  let resolve = null;

  parser.on("startElement", (name, attrs) => {
    if (shouldCapture(name)) {
      capturing = true;
    }

    if (capturing) {
      const newNode = {
        name: name,
        attributes: attrs,
        children: [],
        text: "",
      };

      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(newNode);
      }

      nodeStack.push(newNode);
    }
  });

  parser.on("text", (text) => {
    if (capturing && nodeStack.length > 0) {
      nodeStack[nodeStack.length - 1].text += text.trim();
    }
  });

  parser.on("endElement", (name) => {
    if (capturing) {
      if (
        nodeStack.length > 0 &&
        nodeStack[nodeStack.length - 1].name === name
      ) {
        const finishedNode = nodeStack.pop();

        if (shouldCapture(name) && nodeStack.length === 0) {
          parser.pause();
          resolve?.(finishedNode);
          capturing = false;
        }
      }
    }
  });

  parser.on("end", () => {
    resolve?.();
    resolve = void 0;
  });

  parser.on("error", (err) => {
    console.error("Parser error:", err);
  });

  stream.pipe(parser);

  while (typeof resolve !== "undefined") {
    yield await new Promise((res) => {
      resolve = res;
      parser.resume();
    });
  }
}
