(() => {
    const storageKey = 'crysplay:user';

    function getUser() {
        try {
            const user = JSON.parse(localStorage.getItem(storageKey));
            return user && typeof user.name === 'string' && user.name.trim()
                ? { name: user.name } : null;
        } catch {
            return null;
        }
    }

    function renderUser() {
        const user = getUser();
        const name = user ? user.name : 'Guest';
        const initial = Array.from(name)[0].toLocaleUpperCase();
        document.querySelectorAll('.profile-avatar, [data-user-avatar]').forEach(avatar => {
            avatar.textContent = initial;
            avatar.setAttribute('aria-label', user ? `${name}'s profile` : 'Sign in');
            avatar.title = user ? name : 'Sign in';
        });
        document.querySelectorAll('[data-user-name]').forEach(element => {
            element.textContent = name;
        });
        document.querySelectorAll('[data-user-handle]').forEach(element => {
            element.textContent = user ? `@${name}` : 'Sign in to personalize your studio';
        });
    }

    function signIn(email) {
        const address = email.trim();
        const name = address.split('@')[0];
        const accountId = address.toLowerCase();
        if (!name) return false;
        try {
            let previousUser = null;
            try {
                previousUser = JSON.parse(localStorage.getItem(storageKey));
            } catch {
                // An unreadable profile cannot own the existing video activity.
            }
            if (!previousUser || previousUser.accountId !== accountId) {
                localStorage.removeItem('crysplay:video-1');
            }
            // Keep the full address as the account identifier, never the password.
            localStorage.setItem(storageKey, JSON.stringify({ name, accountId }));
            renderUser();
            return true;
        } catch {
            return false;
        }
    }

    window.CrysPlayUser = { getUser, signIn };
    window.addEventListener('storage', event => {
        if (event.key === storageKey || event.key === null) renderUser();
    });
    window.addEventListener('pageshow', renderUser);
    renderUser();
})();
