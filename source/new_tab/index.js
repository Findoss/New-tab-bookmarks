const ELEMENT_ID = "bookmarks";

function ShortenString(str, length) {
  return str.length > length ? str.substr(0, length - 3) + "..." : str;
}

function ProcessBookmarkNode(node, dom) {
  if (node.children) {
    dom.html += "<li><h2>" + node.title + "</h2><ul>";
    node.children.forEach(child => {
      ProcessBookmarkNode(child, dom);
    });
    dom.html += "</ul></li>";
  }
  if (node.url) {
    dom.html +=
      '<li><a href="' +
      node.url +
      '" title="' +
      node.url +
      '"><img src="chrome://favicon/' +
      node.url +
      '" />' +
      ShortenString(node.title, 30) +
      "</a></li>";
  }
}

function start() {
  chrome.bookmarks.getTree(itemTree => {
    const dom = { html: "" };
    itemTree[0].children[0].children.forEach(child => {
      ProcessBookmarkNode(child, dom);
    });

    const el = (document.getElementById(ELEMENT_ID).innerHTML = dom.html);
  });
}

document.addEventListener("DOMContentLoaded", e => {
  start();
});
