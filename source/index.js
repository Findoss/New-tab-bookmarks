(async () => {
  const ELEMENT_ID = 'bookmarks';
  const ONE_WEEK_AGO = new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
  const BOOKMARKS = await getAllBookmarks();

  function shortenString(str, length) {
    if (!str) return '';
    return str.length > length ? str.substr(0, length - 3) + '...' : str;
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
        const devicesBookmarks = deviceItems.map(v => {
          return {
            title: v.deviceName,
            children: v.sessions[0].window.tabs
          };
        });
        done([{ children: devicesBookmarks }]);
      });
    });
  }

  async function getHistory() {
    return new Promise(done => {
      chrome.history.search(
        {
          text: '',
          startTime: ONE_WEEK_AGO,
          maxResults: 99
        },
        historyItems => {
          done([
            {
              children: [
                {
                  title: 'History',
                  children: historyItems
                }
              ]
            }
          ]);
        }
      );
    });
  }

  async function getAllBookmarks() {
    return new Promise(done => {
      Promise.all([getBookmarks(), getDeviceTabs(), getHistory()]).then(data => {
        done(data.flat(1));
      });
    });
  }

  function templateBookmark(i, maxString = 30) {
    return `
    <li>
      <a href="${i.url}" >
        <img src="chrome://favicon/${i.url}" />
        ${shortenString(i.title, maxString)}
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
          <div class="options"></div>
        </h2>
        ${slot}
      </li>
    </ul>
  `;
  }

  function templateList(slot) {
    return `<ul class="list">${slot}</ul>`;
  }

  function renderBookmark(node, html) {
    let tmp_html = '';
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

  function render(bookmarks) {
    let html = '';

    bookmarks.forEach(bookmarks => {
      if (bookmarks.children) html += renderBookmark(bookmarks.children, '');
    });

    document.querySelector(`#${ELEMENT_ID}`).innerHTML = html;
  }

  function renderList(bookmarks) {
    let html = '';

    bookmarks.forEach(bookmarks => {
      html += templateBookmark(bookmarks, 100);
    });

    document.querySelector(`#${ELEMENT_ID}`).innerHTML = templateList(html).trim();
  }

  function toggleShow(e) {
    e.preventDefault();
    e.stopPropagation();
    e.target.parentElement.parentElement.classList.toggle('hide');
  }

  function options(e) {
    e.preventDefault();
    e.stopPropagation();
    openAll(e);
  }

  function openAll(e) {
    const nodes = e.target.parentNode.parentNode.parentNode.children;
    [...nodes].forEach(node => {
      const elements = node.querySelectorAll('a');
      if (elements) {
        [...elements].forEach(element => {
          window.open(element.getAttribute('href'), '_blank');
        });
      }
    });
  }

  function search(e) {
    e.preventDefault();
    e.stopPropagation();
    const filter = e.target.value;

    const bookmarks = JSON.parse(JSON.stringify(BOOKMARKS));
    const list = filtering(bookmarks, filter, []);

    function filtering(node, filter, list) {
      for (let i = 0; i < node.length; i++) {
        const el = node[i];
        if (el.children) {
          filtering(el.children, filter, list);
        } else if (el.url) {
          const screeningSearchQuery = filter.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(screeningSearchQuery, 'gi');
          if (new RegExp(regex, 'gi').test(el.title)) {
            list.push({
              title: el.title,
              url: el.url
            });
          }
        }
      }
      return list;
    }

    if (filter) {
      renderList(list);
    } else {
      start(BOOKMARKS);
    }
  }

  function addEventListeners() {
    Array.from(document.querySelectorAll('.folder')).forEach(link => {
      link.addEventListener('click', toggleShow);
    });

    Array.from(document.querySelectorAll('.options')).forEach(link => {
      link.addEventListener('click', options);
    });

    document.querySelector('#search').addEventListener('input', search);
  }

  async function start(bookmarks) {
    render(bookmarks);
    addEventListeners();
  }

  document.addEventListener('DOMContentLoaded', start(BOOKMARKS));
})();
