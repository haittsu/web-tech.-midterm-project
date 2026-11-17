(() => {
  const store = window.CrysPlayPlaylists;
  const list = document.querySelector('#playlist-list');
  const status = document.querySelector('#playlist-status');
  const create = document.querySelector('.new-playlist-button');
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function button(text, action) {
    const node = element('button', text, 'playlist-button');
    node.type = 'button';
    node.addEventListener('click', () => {
      status.textContent = '';
      try { action(); } catch (error) { status.textContent = error.message; }
    });
    return node;
  }
  function render() {
    const expanded = new Set(Array.from(list.querySelectorAll('details[open]'), node => node.dataset.id));
    list.replaceChildren();
    status.textContent = '';
    const owner = store.currentUser();
    create.disabled = !owner;
    document.querySelector('.playlist-count').textContent = '0';
    document.querySelector('.library-total').textContent = '0 videos';
    if (!owner) {
      list.append(element('p', 'Sign in to create and view your personal playlists.', 'playlists-empty'));
      const login = element('a', 'Sign in', 'playlist-button playlist-primary');
      login.href = '../login/index.html';
      list.append(login);
      return;
    }
    let playlists;
    try { playlists = store.read(owner); }
    catch (error) {
      create.disabled = true;
      status.textContent = error.message;
      list.append(button('Retry', render));
      return;
    }
    document.querySelector('.playlist-count').textContent = String(playlists.length);
    const total = playlists.reduce((sum, item) => sum + item.videos.length, 0);
    document.querySelector('.library-total').textContent = total + (total === 1 ? ' video' : ' videos');
    if (!playlists.length) list.append(element('p', 'No playlists yet. Use New playlist to create your first one.', 'playlists-empty'));
    for (const playlist of playlists) {
      const details = element('details', '', 'playlist-card');
      details.dataset.id = playlist.id;
      details.open = expanded.has(playlist.id);
      const summary = element('summary', playlist.name + ' · ' + playlist.videos.length + (playlist.videos.length === 1 ? ' video' : ' videos'));
      const actions = element('div', '', 'playlist-card-actions');
      actions.append(button('Rename', () => store.editName(playlist)), button('Delete', () => store.confirmDelete(playlist)));
      const add = element('a', 'Add videos from Discover', 'playlist-button');
      add.href = '../index.html#discover';
      actions.append(add);
      details.append(summary, actions);
      const videos = element('ul', '', 'playlist-videos');
      if (!playlist.videos.length) details.append(element('p', 'This playlist is empty. Find a video and choose Save to playlist.'));
      for (const video of playlist.videos) {
        const row = element('li', '');
        const metadata = element('div', '');
        const link = element('a', video.title);
        link.href = video.watchUrl;
        metadata.append(link, element('p', video.channel));
        const remove = button('Remove', () => store.removeVideo(playlist.id, video.id, owner));
        remove.setAttribute('aria-label', 'Remove ' + video.title + ' from ' + playlist.name);
        row.append(metadata, remove);
        videos.append(row);
      }
      details.append(videos);
      list.append(details);
    }
  }
  create.addEventListener('click', () => store.editName());
  window.addEventListener('crysplay:playlists-changed', render);
  window.addEventListener('pageshow', render);
  render();
})();
