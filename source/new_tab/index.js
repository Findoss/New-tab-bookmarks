const ELEMENT_ID = "bookmarks";
const ONE_WEEK_AGO = new Date().getTime() - 1000 * 60 * 60 * 24 * 7;

function shortenString(str, length) {
  if (!str) return "";
  return str.length > length ? str.substr(0, length - 3) + "..." : str;
}

function compareBookmarks(a, b) {
  if (!a.url && !b.url) {
    if (a.title > b.title) return 1;
    if (a.title < b.title) return -1;
    return 0;
  } else {
    if (a.url > b.url) return 1;
    if (a.url < b.url) return -1;
    return 0;
  }
}

function sortBookmarkNode(node) {
  node.sort(compareBookmarks);
  node.forEach(node => {
    if (node.children) sortBookmarkNode(node.children);
  });
  return node;
}

async function getBookmarks() {
  return new Promise(done => {
    chrome.bookmarks.getTree(bookmarkItems => {
      done(sortBookmarkNode(bookmarkItems[0].children));
    });
  });
}

async function getDeviceTabs() {
  return new Promise(done => {
    chrome.sessions.getDevices({}, deviceItems => {
      done(deviceItems);
    });
  });
}

async function getHistory() {
  return new Promise(done => {
    chrome.history.search(
      {
        text: "",
        startTime: ONE_WEEK_AGO,
        maxResults: 99
      },
      historyItems => {
        done(historyItems);
      }
    );
  });
}

function templateBookmark(i) {
  return `
    <li>
      <a href="${i.url}" >
        <img src="chrome://favicon/${i.url}" />
        ${shortenString(i.title, 35)}
      </a>
    </li>
  `;
}

function templateFolder(i, slot) {
  return `
    <ul>
      <li>
        <h2 class="folder">
          ${shortenString(i.title, 35)}
        </h2>
        ${slot}
      </li>
    </ul>
  `;
}

function renderBookmark(node, html) {
  let tmp_html = "";
  node.forEach(node => {
    if (node.children) {
      html += templateFolder(node, renderBookmark(node.children, tmp_html));
    }
    if (node.url) {
      html += templateBookmark(node);
    }
  });
  return html;
}

function renderDevice(node) {
  let html = "";
  node.sessions[0].window.tabs.forEach(node => {
    html += templateBookmark(node);
  });
  return templateFolder({ title: node.deviceName }, html);
}

function renderHistory(node) {
  let html = "";
  node.forEach(node => {
    html += templateBookmark(node);
  });
  return templateFolder({ title: "History" }, html);
}

function render(bookmarks, deviceBookmarks, history) {
  let html = "";

  bookmarks.forEach(bookmarks => {
    if (bookmarks.children) html += renderBookmark(bookmarks.children, "");
  });

  deviceBookmarks.forEach(device => {
    html += renderDevice(device);
  });

  html += renderHistory(history);

  document.getElementById(ELEMENT_ID).innerHTML = html;
  addEventListeners();
}

function toggleShow(e) {
  e.preventDefault();
  e.stopPropagation();
  e.target.parentElement.parentElement.classList.toggle("hide");
}

function addEventListeners() {
  Array.from(document.querySelectorAll(".folder")).forEach(link => {
    link.addEventListener("click", toggleShow);
  });
}

async function start() {
  const bookmarks = await getBookmarks();
  const deviceTabs = await getDeviceTabs();
  const history = await getHistory();

  render(bookmarks, deviceTabs, history);
}

document.addEventListener("DOMContentLoaded", start);
