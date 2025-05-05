(function($){
  'use strict';

  // ————————————————————————————————————————————————————————————————
  // Data Module (loads & queries JSON data)
  // ————————————————————————————————————————————————————————————————
  const DataModule = (function(){
    let _items = [];

    return {
      load: function(url) {
        return $.getJSON(url)
          .done(data => { _items = data; })
          .fail((jq, status, err) => {
            console.error('Failed to load JSON:', status, err);
          });
      },
      all: function() {
        return _items.slice();
      },
      byRegion: function(region) {
        if (region === 'all') return this.all();
        return _items.filter(item => item.region.toLowerCase() === region);
      },
      search: function(items, query) {
        if (!query) return items;
        const q = query.toLowerCase();
        return items.filter(item => item.name.toLowerCase().includes(q));
      },
      sortByName: function(items, asc = true) {
        return items.slice().sort((a, b) => 
          asc 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name)
        );
      }
    };
  })();


  // ————————————————————————————————————————————————————————————————
  // UI Module (hooks events, renders containers)
  // ————————————————————————————————————————————————————————————————
  const UIModule = (function(){
    // Cache selectors
    const $radios     = $('input[name="region"]');
    const $search     = $('#search');
    const $sortSelect = $('#sort-order');
    const $containers = $('.container');

    // Bind UI events
    function bindEvents() {
      $radios.on('change', updateView);
      $search.on('input', updateView);
      $sortSelect.on('change', updateView);
    }

    // Main render function
    function updateView() {
      const region     = $radios.filter(':checked').attr('id') || 'all';
      const query      = $search.val().trim();
      const asc        = $sortSelect.val() === 'asc';

      let items = DataModule.byRegion(region);
      items     = DataModule.search(items, query);
      items     = DataModule.sortByName(items, asc);

      $containers.each(function(){
        const $c    = $(this);
        const reg   = ($c.data('region') || 'all').toLowerCase();

        if (region !== 'all' && reg !== region) {
          $c.hide();
          return;
        }
        $c.show();

        // render HTML
        const html = items
          .map(item => createImageHTML(item))
          .join('');
        $c.html(html);
        // optional: show count next to container
        $c.prev('.count').text(`Items: ${items.length}`);
      });
    }

    // Helper: build image card HTML
    function createImageHTML(item) {
      return `
        <div class="img-div">
          <h4>${item.name}</h4>
          <img src="${item.src}" alt="${item.alt}" loading="lazy">
        </div>`;
    }

    return { init: function(){ bindEvents(); } };
  })();


  // ————————————————————————————————————————————————————————————————
  // Initialization
  // ————————————————————————————————————————————————————————————————
  $(function(){
    // 1) Load JSON  
    DataModule.load('json/codes.json')
      .always(() => {
        // 2) Setup UI  
        UIModule.init();
        // 3) Initial render  
        $('input[name="region"]#all').prop('checked', true);
        $('#search').val('');
        $('#sort-order').val('asc');
        UIModule.init();  // events bound
        $('input[name="region"]').trigger('change');
      });
  });

})(jQuery);
