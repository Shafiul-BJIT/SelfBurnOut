(function () {
    var KEY = 'theme';
    var THEMES = ['light', 'black', 'green', 'red', 'yellow', 'orange', 'purple'];
    var DARK = ['black'];

    function apply(theme) {
        var html = document.documentElement;
        html.dataset.theme = theme;
        html.dataset.bsTheme = DARK.indexOf(theme) >= 0 ? 'dark' : 'light';
    }

    var saved = 'light';
    try { saved = localStorage.getItem(KEY) || 'light'; } catch (e) { /* storage unavailable */ }
    if (THEMES.indexOf(saved) < 0) saved = 'light';
    apply(saved);

    document.addEventListener('DOMContentLoaded', function () {
        var items = document.querySelectorAll('[data-theme-value]');

        function mark(theme) {
            items.forEach(function (i) { i.classList.toggle('active', i.dataset.themeValue === theme); });
        }

        mark(saved);
        items.forEach(function (item) {
            item.addEventListener('click', function () {
                var theme = item.dataset.themeValue;
                apply(theme);
                mark(theme);
                try { localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
            });
        });
    });
})();
