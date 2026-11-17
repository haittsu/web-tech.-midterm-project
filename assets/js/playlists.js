"use strict";

(() => {
  const prefix = 'crysplay:playlists:v1:';
  const currentUser = () => window.CrysPlayUser?.getUser()?.name || null;
  function requireUser(owner) {
    if (!owner) throw new Error('Sign in to use your playlists.');
    if (owner !== currentUser()) throw new Error('Your account changed. Please reopen this action.');
  }
  function name(value) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Enter a playlist name.');
    if (value.trim().length > 100) throw new Error('Use 100 characters or fewer for the playlist name.');
    return value.trim();
  }
  function video(value) {
    // Rebuild internal links from validated IDs, never from arbitrary saved URLs.
    const model = new window.CrysPlayDiscover.Video({
      ...value, id: typeof value?.id === 'string' ? value.id.toLowerCase() : value?.id
    });
    return { id: model.id, title: model.title, channel: model.channel, watchUrl: model.watchUrl };
  }
  function read(owner = currentUser()) {
    requireUser(owner);
    let raw;
    try { raw = localStorage.getItem(prefix + encodeURIComponent(owner)); }
    catch { throw new Error('Playlist storage is unavailable. Allow browser storage and try again.'); }
    if (raw === null) return [];
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error();
      const ids = new Set();
      return data.map(item => {
        if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || !Array.isArray(item.videos)) throw new Error();
        ids.add(item.id);
        const videos = item.videos.map(video);
        return { id: item.id, name: name(item.name), videos: videos.filter((v, i) => videos.findIndex(other => other.id === v.id) === i) };
      });
    } catch {
      throw new Error('Saved playlists contain invalid data or JSON. They have not been overwritten. Restore the saved data and try again.');
    }
  }
  function change(owner, operation) {
    requireUser(owner);
    const lists = read(owner);
    const result = operation(lists);
    try { localStorage.setItem(prefix + encodeURIComponent(owner), JSON.stringify(lists)); }
    catch { throw new Error('Could not save playlists. Browser storage may be full or unavailable.'); }
    window.dispatchEvent(new Event('crysplay:playlists-changed'));
    return result;
  }
  function find(lists, id) {
    const list = lists.find(item => item.id === id);
    if (!list) throw new Error('This playlist no longer exists. Refresh and try again.');
    return list;
  }
  const store = {
    currentUser, read,
    create(value, initialVideo, owner = currentUser()) {
      const title = name(value);
      const videos = initialVideo ? [video(initialVideo)] : [];
      return change(owner, lists => {
        const list = { id: crypto.randomUUID(), name: title, videos };
        lists.push(list);
        return list.id;
      });
    },
    rename(id, value, owner = currentUser()) {
      const title = name(value);
      return change(owner, lists => { find(lists, id).name = title; });
    },
    remove(id, owner = currentUser()) {
      return change(owner, lists => { find(lists, id); lists.splice(lists.findIndex(item => item.id === id), 1); });
    },
    addVideo(id, value, owner = currentUser()) {
      const record = video(value);
      return change(owner, lists => {
        const list = find(lists, id);
        if (list.videos.some(item => item.id === record.id)) return false;
        list.videos.push(record);
        return true;
      });
    },
    removeVideo(id, videoId, owner = currentUser()) {
      return change(owner, lists => {
        const list = find(lists, id);
        list.videos = list.videos.filter(item => item.id !== videoId);
      });
    }
  };
  window.CrysPlayPlaylists = store;

  // Shared accessible dialog for the watch page, Discover, and playlist management.
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  let activeDialog;
  function dialog(title, build) {
    activeDialog?.close();
    return new Promise(resolve => {
      const previousFocus = document.activeElement;
      const panel = element('dialog', undefined, 'playlist-dialog');
      activeDialog = panel;
      const heading = element('h2', title);
      heading.id = 'playlist-dialog-title';
      panel.setAttribute('aria-labelledby', heading.id);
      const error = element('p', '', 'playlist-error');
      error.setAttribute('role', 'alert');
      const content = element('div');
      const cancel = element('button', 'Cancel', 'playlist-button');
      cancel.type = 'button';
      let result = { cancelled: true };
      const finish = value => { result = value; panel.close(); };
      const attempt = action => {
        error.textContent = '';
        try { action(); } catch (failure) { error.textContent = failure.message; }
      };
      cancel.addEventListener('click', () => panel.close());
      panel.append(heading, content, error, cancel);
      panel.addEventListener('close', () => {
        panel.remove();
        if (activeDialog === panel) activeDialog = null;
        if (previousFocus?.isConnected) previousFocus.focus();
        resolve(result);
      }, { once: true });
      document.body.append(panel);
      attempt(() => build(content, finish, attempt));
      panel.showModal();
    });
  }
  function nameForm(container, labelText, initial, buttonText, submit, attempt) {
    const form = element('form', undefined, 'playlist-name-form');
    const label = element('label', labelText);
    const input = element('input');
    input.type = 'text';
    input.required = true;
    input.maxLength = 100;
    input.value = initial;
    label.append(input);
    const button = element('button', buttonText, 'playlist-button playlist-primary');
    button.type = 'submit';
    form.append(label, button);
    form.addEventListener('submit', event => {
      event.preventDefault();
      attempt(() => submit(input.value));
    });
    container.append(form);
  }
  store.editName = (playlist = null) => {
    const owner = currentUser();
    return dialog(playlist ? 'Rename playlist' : 'Create playlist', (content, finish, attempt) => {
      requireUser(owner);
      nameForm(content, 'Playlist name', playlist?.name || '', playlist ? 'Save name' : 'Create playlist', value => {
        const id = playlist ? (store.rename(playlist.id, value, owner), playlist.id) : store.create(value, null, owner);
        finish({ saved: true, id });
      }, attempt);
    });
  };
  store.confirmDelete = playlist => {
    const owner = currentUser();
    return dialog('Delete playlist?', (content, finish, attempt) => {
      content.append(element('p', 'Delete “' + playlist.name + '” and its saved video list? This cannot be undone.'));
      const button = element('button', 'Delete playlist', 'playlist-button playlist-danger');
      button.type = 'button';
      button.addEventListener('click', () => attempt(() => { store.remove(playlist.id, owner); finish({ saved: true }); }));
      content.append(button);
    });
  };
  window.saveToPlaylist = value => {
    const owner = currentUser();
    return dialog('Save to playlist', (content, finish, attempt) => {
      if (!owner) {
        content.append(element('p', 'Sign in to save videos to your personal playlists.'));
        const link = element('a', 'Sign in', 'playlist-button playlist-primary');
        link.href = new URL('login/index.html', window.CrysPlayDiscover.projectRoot).href;
        content.append(link);
        return;
      }
      const record = video(value);
      const lists = read(owner);
      content.append(element('p', record.title));
      const choices = element('div', undefined, 'playlist-choices');
      for (const list of lists) {
        const present = list.videos.some(item => item.id === record.id);
        const button = element('button', list.name + ' (' + list.videos.length + ' videos)' + (present ? ' — Already saved' : ''), 'playlist-button');
        button.type = 'button';
        button.disabled = present;
        button.addEventListener('click', () => attempt(() => {
          const added = store.addVideo(list.id, record, owner);
          finish({ saved: added });
        }));
        choices.append(button);
      }
      if (!lists.length) choices.append(element('p', 'No playlists yet. Create your first playlist below.'));
      content.append(choices);
      nameForm(content, 'New playlist name', '', 'Create and save video', value => {
        store.create(value, record, owner);
        finish({ saved: true });
      }, attempt);
    });
  };
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === 'crysplay:user' || event.key.startsWith(prefix)) {
      activeDialog?.close();
      window.dispatchEvent(new Event('crysplay:playlists-changed'));
    }
  });
})();
